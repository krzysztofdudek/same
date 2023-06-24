import { HttpResponseError, IHttpClient } from '../infrastructure/abstraction/http-client';
import { ILogger } from '../infrastructure/abstraction/logger';

class FetchingError { }

class ResponseParsingError { }

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
    public constructor(
        private httpClient: IHttpClient,
        private logger: ILogger
    ) {}

    async getLatestRelease(owner: string, repository: string, asset: RegExp): Promise<VersionDescriptor> {
        const response = await this.httpClient.get<Release>(`https://api.github.com/repos/${owner}/${repository}/releases/latest`);

        const error = response as HttpResponseError;
        if (error) {
            this.logger.error(`Error occurred while fetching GitHub latest release.`);

            throw new FetchingError();
        }

        const release = <Release> response;

        const assetObject = release.assets.find(x => asset.test(x.name));
        const url = assetObject?.browser_download_url;

        if (!url) {
            this.logger.error(`Error occurred while parsing GitHub latest release.`);

            throw new ResponseParsingError();
        }

        return { name: release.tag_name, asset: assetObject.name, url: url };
    }
}