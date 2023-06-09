import https from "https";
import fs from "fs";
import fsPromises from "fs/promises";
import { Logger } from "./logger.js";
import { ServiceProvider } from "./service-provider.js";

export namespace HttpClient {
    export const iHttpClientServiceKey = "HttpClient.IHttpClient";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iHttpClientServiceKey,
            () =>
                new HttpClient(
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(iHttpClientServiceKey)
                )
        );
    }

    export class HttpResponseError {
        public constructor(public code: number, public body: string) {}
    }

    export interface IHttpClient {
        get<ResponseType>(url: string): Promise<ResponseType>;
        downloadFile(url: string, filePath: string): Promise<void>;
    }

    export class HttpClient implements IHttpClient {
        public constructor(private logger: Logger.ILogger) {}

        async downloadFile(url: string, filePath: string): Promise<void> {
            if (fs.existsSync(filePath)) {
                await fsPromises.unlink(filePath);
            }

            await new Promise(async (resolve, reject) => {
                https.get(url, async (response) => {
                    if (response.statusCode === 200) {
                        this.logger.debug(`Downloading: ${url}`);

                        const file = fs.createWriteStream(filePath, { flags: "wx" });

                        const handleError = async (error: any) => {
                            file.close(async (fileClosingError) => {
                                if (fileClosingError) {
                                    this.logger.error("Error occurred while closing file");

                                    reject(fileClosingError);
                                } else {
                                    if (fs.existsSync(filePath)) {
                                        await fsPromises.unlink(filePath);
                                    }

                                    reject(error);
                                }
                            });
                        };

                        file.on("error", (error) => {
                            this.logger.error("Error occurred while saving file");

                            handleError(error);
                        });

                        response.on("error", (error) => {
                            this.logger.error("Error occurred while fetching file");

                            handleError(error);
                        });

                        response
                            .on("end", () => {
                                this.logger.debug(`Downloaded: ${url} downloaded`);

                                file.end();

                                resolve({});
                            })
                            .pipe(file);
                    } else if (response.statusCode === 302 || response.statusCode === 301) {
                        // Recursively follow redirects, only a 200 will resolve.
                        await this.downloadFile(response.headers.location!, filePath).then(() => resolve({}));
                    } else {
                        reject(
                            new Error(
                                `Download request failed, response status: ${response.statusCode} ${response.statusMessage}`
                            )
                        );
                    }
                });
            });
        }
        async get<ResponseType>(url: string): Promise<ResponseType> {
            const response = await fetch(url);

            if (!response.ok) {
                throw new HttpResponseError(response.status, await response.text());
            }

            return <ResponseType>await response.json();
        }
    }
}
