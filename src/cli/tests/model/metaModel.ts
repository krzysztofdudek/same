import { FileSystem } from "../../src/infrastructure/file-system.js";
import { Logger } from "../../src/infrastructure/logger.js";
import { Model } from "../../src/model/model.js";

function create(
    options: Model.IOptions | {},
    fileSystem: FileSystem.IFileSystem | {},
    logger: Logger.ILogger | {},
    delayedInvocationManager: Model.IDelayedInvocationManager | {}
) {
    return new Model.MetaModel(
        <Model.IOptions>options,
        <FileSystem.IFileSystem>fileSystem,
        <Logger.ILogger>logger,
        <Model.IDelayedInvocationManager>delayedInvocationManager
    );
}

describe("Meta model should", () => {
    it("", async () => {});
    it("", async () => {});
    it("", async () => {});
    it("", async () => {});
    it("", async () => {});
    it("", async () => {});
    it("", async () => {});
    it("", async () => {});
    it("", async () => {});
    it("", async () => {});
    it("", async () => {});
    it("", async () => {});
});
