import assert from "assert";
import { FileSystem } from "../../src/infrastructure/file-system.js";
import { Logger } from "../../src/infrastructure/logger.js";
import { Model } from "../../src/model/model.js";

function create(
    options: Model.IOptions | {},
    fileSystem: FileSystem.IFileSystem | {},
    logger: Logger.ILogger | {}
): Model.ManifestFile {
    return new Model.ManifestFile(<Model.IOptions>options, <FileSystem.IFileSystem>fileSystem, <Logger.ILogger>logger);
}

describe("Manifest file should", () => {
    it("throw an error if manifest is not synchronized", async () => {
        const manifestFile = create({}, {}, {});

        assert.throws(
            () => manifestFile.getManifest(),
            "accessing manifest should throw an error if was not synchronized"
        );
    });
    it("load manifest if file exists", async () => {
        let logged = false;

        const manifestFile = create(
            {
                getRepositoryPath() {
                    ("/tmp");
                },
            },
            {
                async checkIfExists() {
                    return true;
                },
                async readFile() {
                    return "projectName: Name";
                },
                clearPath(...pathComponents) {
                    return pathComponents.join("/");
                },
            },
            {
                trace() {
                    logged = true;
                },
            }
        );

        await manifestFile.synchronize();

        assert.equal(manifestFile.getManifest().projectName, "Name");
        assert.equal(logged, true);
    });
    it("create default manifest if file does not exist", async () => {
        let logged = false;
        let savedContent = "";

        const manifestFile = create(
            {
                getRepositoryPath() {
                    ("/tmp");
                },
            },
            {
                async checkIfExists() {
                    return false;
                },
                async createOrOverwriteFile(_path: string, content: string) {
                    savedContent = content;
                },
                clearPath(...pathComponents) {
                    return pathComponents.join("/");
                },
            },
            {
                trace() {
                    logged = true;
                },
            }
        );

        await manifestFile.synchronize();

        assert.equal(manifestFile.getManifest().projectName, "Hello World");
        assert.equal(logged, true);
        assert.equal(savedContent.trim(), "projectName: Hello World");
    });
    it("update manifest file is was synchronized already", async () => {
        let logged = false;
        let savedContent = "";

        const manifestFile = create(
            {
                getRepositoryPath() {
                    ("/tmp");
                },
            },
            {
                async checkIfExists() {
                    return true;
                },
                async readFile() {
                    return "projectName: Name";
                },
                async createOrOverwriteFile(_path: string, content: string) {
                    savedContent = content;
                },
                clearPath(...pathComponents) {
                    return pathComponents.join("/");
                },
            },
            {
                trace() {
                    logged = true;
                },
            }
        );

        await manifestFile.synchronize();
        await manifestFile.synchronize();

        assert.equal(manifestFile.getManifest().projectName, "Name");
        assert.equal(logged, true);
        assert.equal(savedContent.trim(), "projectName: Name");
    });
    it("synchronizes on start", async () => {
        const manifestFile = create(
            {
                getRepositoryPath() {
                    ("/tmp");
                },
            },
            {
                async checkIfExists() {
                    return true;
                },
                async readFile() {
                    return "projectName: Name";
                },
                clearPath(...pathComponents) {
                    return pathComponents.join("/");
                },
            },
            {
                trace() {},
            }
        );

        await manifestFile.start();

        assert.equal(manifestFile.getManifest().projectName, "Name");
    });
});
