import { MAGIC_NUMBERS } from "./MagicNumbers.js";
import { randInt } from "./utils/Math.js";
import * as THREE from "three";

export class Build {
  static MODELS = {
    build1: "./assets/3d/build1.glb",
    build2: "./assets/3d/build2.glb",
    build3: "./assets/3d/build3.glb",
  };
  static modelsLoaded = {};

  static LIGHT_MATERIAL = null;

  static DEFAULT_BUILD_MATERIAL = null;

  constructor(model, position, isLight, distance) {
    this.model = model;
    this.position = position;
    this.mesh = null;
    this.id = null;
    this.isLight = isLight;
    this.isLighting = false;
    this.light = isLight;
    this.distance = distance;
  }

  place(scene) {
    if (this.mesh) return;
    const modelClone = Build.modelsLoaded[this.model].clone();
    modelClone.position.set(this.position.x, this.position.y, this.position.z);
    for (const child of modelClone.children[0].children) {
      child.userData.parent = modelClone.children[0];
    }
    for (const mesh of [
      modelClone.children[0].children[1],
      // build.mesh.children[0].children[0],
    ]) {
      // const mesh = build.mesh.children[0].children[0];
      mesh.material = Build.DEFAULT_BUILD_MATERIAL.clone();
    }
    modelClone.children[0].userData.parent = modelClone;
    scene.add(modelClone);

    this.mesh = modelClone;
    this.mesh.name = "Build";

    return modelClone;
  }

  static getRandomBuildId() {
    const buildIds = Object.keys(this.modelsLoaded);
    return buildIds[randInt(0, buildIds.length - 1)];
  }

  static loadModels(callback = () => {}, loaders) {
    const callbackWrapper = () => {
      if (
        Object.keys(this.modelsLoaded).length ===
        Object.keys(this.MODELS).length
      ) {
        callback();
      }
    };
    for (const model in this.MODELS) {
      loaders.gltf.load(
        this.MODELS[model],
        (gltf) => {
          this.modelsLoaded[model] = gltf.scene;
          callbackWrapper();
        },
        undefined,
        (error) => {
          console.error(`Error loading model ${model}:`, error);
        },
      );
    }
    const texture = loaders.texture.load(
      "./assets/textures/building/windows.png",
    );
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    texture.repeat.set(
      MAGIC_NUMBERS.BUILD_LIGHT.TEXTURE_SIZE,
      MAGIC_NUMBERS.BUILD_LIGHT.TEXTURE_SIZE,
    );
    this.LIGHT_MATERIAL = new THREE.MeshStandardMaterial({
      color: MAGIC_NUMBERS.BUILD_LIGHT.COLOR,
      emissive: MAGIC_NUMBERS.BUILD_LIGHT.COLOR,
      emissiveIntensity: MAGIC_NUMBERS.BUILD_LIGHT.INTENSITY,
      emissiveMap: texture,
    });

    this.DEFAULT_BUILD_MATERIAL = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveIntensity: 0,
    });
  }

  toGrid(gridSize) {
    const gridX = Math.round(this.position.x / gridSize.X);
    const gridZ = Math.round(this.position.z / gridSize.Z);
    return { gridX, gridZ };
  }

  remove() {
    Build.removeRecursive(this.mesh);
    this.mesh = null;
    this.isLight = this.light;
    this.isLighting = false;
  }

  static removeRecursive(mesh) {
    if (mesh) {
      mesh.removeFromParent();
      mesh.traverse((child) => {
        // disposing materials
        if (child.material && !child.material._isDisposed) {
          // disposing textures
          for (const [key, value] of Object.entries(child.material)) {
            if (!value) continue;
            if (typeof value.dispose === "function" && !value._isDisposed) {
              value.dispose();
              value._isDisposed = true;
              child[key] = null;
            }
          }
          child.material.dispose();
          child.material._isDisposed = true;
          child.material = null;
        }
        // disposing geometries
        if (child.geometry?.dispose && !child.geometry._isDisposed) {
          child.geometry.dispose();
          child.geometry._isDisposed = true;
          child.geometry = null;
        }

        // disposing skinned mesh
        if (
          child.skeleton?.boneTexture &&
          !child.skeleton?.boneTexture._isDisposed
        ) {
          child.skeleton.boneTexture.dispose();
          child.skeleton.boneTexture._isDisposed = true;
          child.skeleton.boneTexture = null;
        }

        requestAnimationFrame(() => (child.children = null));
      });
      mesh = null;
    }
  }
}
