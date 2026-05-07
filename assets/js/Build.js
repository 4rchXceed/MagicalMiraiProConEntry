import { MAGIC_NUMBERS } from "./MagicNumbers.js";
import { randInt } from "./utils/Math.js";

export class Build {
    static MODELS = {
        build1: "./assets/3d/build1.glb",
        build2: "./assets/3d/build2.glb",
        build3: "./assets/3d/build3.glb",
    };
    static modelsLoaded = {};

    constructor(model, position) {
        this.model = model;
        this.position = position;
        this.mesh = null;
        this.id = null;
    }

    place(scene) {
        const modelClone = Build.modelsLoaded[this.model].clone();
        modelClone.position.set(this.position.x, this.position.y, this.position.z);
        scene.add(modelClone);
        this.mesh = modelClone;

        return modelClone;
    }

    static getRandomBuildId() {
        const buildIds = Object.keys(this.modelsLoaded);
        return buildIds[randInt(0, buildIds.length - 1)];
    }

    static loadModels(callback = () => { }, loaders) {
        const callbackWrapper = () => {
            if (Object.keys(this.modelsLoaded).length === Object.keys(this.MODELS).length) {
                callback();
            }
        };
        for (const model in this.MODELS) {
            loaders.gltf.load(this.MODELS[model], (gltf) => {
                this.modelsLoaded[model] = gltf.scene;
                callbackWrapper();
            }, undefined, (error) => {
                console.error(`Error loading model ${model}:`, error);
            });
        }
    }

    toGrid(gridSize) {
        const gridX = Math.round(this.position.x / gridSize.X);
        const gridZ = Math.round(this.position.z / gridSize.Z);
        return { gridX, gridZ };
    }

    remove() {
        if (this.mesh) {
            this.mesh.parent.remove(this.mesh);
            this.mesh = null;
        }
    }
}
