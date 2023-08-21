import assert from "assert";
import { Model } from "../../src/model/model.js";

describe("Repository should", () => {
    describe("on start", () => {
        it("starts all services", async () => {
            let manifestFileStarted = false;
            let metaModelStarted = false;
            let modelStarted = false;

            const manifestFile = <Model.IManifestFile>{
                start() {
                    manifestFileStarted = true;
                },
            };
            const metaModel = <Model.IMetaModel>{
                start() {
                    metaModelStarted = true;
                },
            };
            const model = <Model.IModel>{
                start() {
                    modelStarted = true;
                },
            };

            const repository = new Model.Repository(manifestFile, metaModel, model);

            await repository.start();

            assert.equal(manifestFileStarted, true, "manifest was not started");
            assert.equal(metaModelStarted, true, "meta model was not started");
            assert.equal(modelStarted, true, "model was not started");
        });
    });
    describe("on stop", () => {
        it("stops all services", async () => {
            let metaModelStopped = false;

            const manifestFile = <Model.IManifestFile>{
                start() {},
            };
            const metaModel = <Model.IMetaModel>{
                start() {},
                stop() {
                    metaModelStopped = true;
                },
            };
            const model = <Model.IModel>{
                start() {},
            };

            const repository = new Model.Repository(manifestFile, metaModel, model);

            await repository.start();
            await repository.stop();

            assert.equal(metaModelStopped, true, "meta model was not stopped");
        });
    });
    describe("on synchronize", () => {
        it("synchronizes all services", async () => {});
    });
});
