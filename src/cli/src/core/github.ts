import chalk from 'chalk';

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

export async function getLatestRelease(resource: string, owner: string, repository: string, asset: RegExp): Promise<VersionDescriptor> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repository}/releases/latest`);

    if (!response.ok) {
        console.log(chalk.redBright(`Error occurred while fetching latest ${resource} release.`));
        console.log(chalk.redBright(`Response: ${await response.text()}`));

        throw new FetchingError();
    }

    const release = (await response.json()) as Release;
    const assetObject = release.assets.find(x => asset.test(x.name));
    const url = assetObject?.browser_download_url;

    if (!url) {
        console.log(chalk.redBright(`Error occurred while parsing response of latest ${resource} release.`));

        throw new ResponseParsingError();
    }

    return { name: release.tag_name, asset: assetObject.name, url: url };
}