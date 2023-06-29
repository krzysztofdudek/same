import { HttpClient } from "../infrastructure/http-client.js";
import { Logger } from "../infrastructure/logger.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";

export namespace GitHub {
    export const iGitHubServiceKey = "GitHub.IGitHub";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iGitHubServiceKey,
            () =>
                new GitHub(
                    serviceProvider.resolve(HttpClient.iHttpClientServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(iGitHubServiceKey)
                )
        );
    }

    class FetchingError {}

    class ResponseParsingError {}

    interface Release {
        tag_name: string;
        assets: Asset[];
    }

    interface Asset {
        name: string;
        browser_download_url: string;
    }

    interface VersionDescriptor {
        name: string;
        asset: string;
        url: string;
    }

    export interface IGitHub {
        getLatestRelease(owner: string, repository: string, asset: RegExp): Promise<VersionDescriptor>;
    }

    export class GitHub implements IGitHub {
        public constructor(private httpClient: HttpClient.IHttpClient, private logger: Logger.ILogger) {}

        async getLatestRelease(owner: string, repository: string, asset: RegExp): Promise<VersionDescriptor> {
            let release: Release;

            try {
                release = await this.httpClient.get<Release>(
                    `https://api.github.com/repos/${owner}/${repository}/releases/latest`
                );
            } catch (error) {
                this.logger.error(`Error occurred while fetching GitHub latest release.`, error);

                throw new FetchingError();
            }

            const assetObject = release.assets.find((x) => asset.test(x.name));
            const url = assetObject?.browser_download_url;

            if (!url) {
                this.logger.error(`Error occurred while parsing GitHub latest release.`);

                throw new ResponseParsingError();
            }

            return { name: release.tag_name, asset: assetObject.name, url: url };
        }
    }
}
