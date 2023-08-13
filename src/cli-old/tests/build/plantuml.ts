import assert from "assert";
import { PlantUmlBuild } from "../../src/build/plantuml.js";
import { PlantUml } from "../../src/tools/plantuml.js";
import { Build } from "../../src/core/build.js";
import { mockLogger } from "../mocks/core/logger.js";
import { mockFileSystem } from "../mocks/core/fileSystem.js";

function mockPlantUmlServer(): PlantUml.IServer {
    return {
        async getSvg(code) {
            return code;
        },
        async start() {},
        stop() {},
    };
}

function mockBuildOptions(): Build.IOptions {
    return {
        outputDirectoryPath: "_build",
        sourceDirectoryPath: "_src",
        outputType: "html",
    };
}

describe("PlantUML file builder should", () => {
    it("recreate current directory with artifacts", async () => {
        let deletedDirectory: string | null = null;
        let createdDirectory: string | null = null;

        const fileBuilder = new PlantUmlBuild.FileBuilder(
            mockPlantUmlServer(),
            mockBuildOptions(),
            mockFileSystem((mock) => {
                mock.clearPathImplementation = (...pathComponents: string[]) => "/" + pathComponents.join("/");
                mock.deleteImplementation = (path: string) => (deletedDirectory = path);
                mock.createDirectoryImplementation = (path: string) => (createdDirectory = path);
            }),
            mockLogger()
        );

        await fileBuilder.build(new Build.FileBuildContext("/_src/diagram.puml", "diagram.puml", "puml", "Test."));

        const directoryPath = "/_build/diagram.puml";

        assert.equal(deletedDirectory, directoryPath);
        assert.equal(createdDirectory, directoryPath);
    });

    it("process all diagrams within the file", () => {});
});
