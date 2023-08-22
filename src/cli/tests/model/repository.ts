import assert from "assert";
import { Model } from "../../src/model/model.js";

function create(manifestFile: Model.IManifestFile | {}, metaModel: Model.IMetaModel | {}, model: Model.IModel | {}) {
    return new Model.Repository(<Model.IManifestFile>manifestFile, <Model.IMetaModel>metaModel, <Model.IModel>model);
}

describe("Repository should", () => {
    it("stat all services on start", async () => {
        let manifestFileStarted = false;
        let metaModelStarted = false;
        let modelStarted = false;

        const repository = create(
            {
                start() {
                    manifestFileStarted = true;
                },
            },
            {
                start() {
                    metaModelStarted = true;
                },
            },
            {
                start() {
                    modelStarted = true;
                },
            }
        );

        await repository.start();

        assert.equal(manifestFileStarted, true, "manifest was not started");
        assert.equal(metaModelStarted, true, "meta model was not started");
        assert.equal(modelStarted, true, "model was not started");
    });
    it("stop all services on stop", async () => {
        let metaModelStopped = false;

        const repository = create(
            {},
            {
                stop() {
                    metaModelStopped = true;
                },
            },
            {}
        );

        await repository.stop();

        assert.equal(metaModelStopped, true, "meta model was not stopped");
    });
    it("synchronize all services on synchronize", async () => {
        let manifestFileSynchronized = false;
        let metaModelSynchronized = false;
        let modelSynchronized = false;

        const repository = create(
            {
                synchronize() {
                    manifestFileSynchronized = true;
                },
            },
            {
                synchronize() {
                    metaModelSynchronized = true;
                },
            },
            {
                synchronize() {
                    modelSynchronized = true;
                },
            }
        );

        await repository.synchronize();

        assert.equal(manifestFileSynchronized, true, "manifest was not synchronized");
        assert.equal(metaModelSynchronized, true, "meta model was not synchronized");
        assert.equal(modelSynchronized, true, "model was not synchronizedP");
    });
});
