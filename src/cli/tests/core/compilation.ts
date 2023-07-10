import assert from "assert";
import { Build } from "../../src/core/build.js";

describe("Compilation context", function () {
    describe("by getAllFiles method", function () {
        it("should iterate through all files in the directory", async function () {
            const instance = <Build.ICompilationContext>{
                analyzeAllFiles() {
                    console.log("aas");

                    return new Promise(() => {});
                },
            };

            await instance.analyzeAllFiles();
        });
    });
});
