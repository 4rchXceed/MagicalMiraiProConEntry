import { MAGIC_NUMBERS } from "./MagicNumbers.js";
import { randInt } from "./utils/Math.js";
import * as THREE from "three";

/**
 * Location: Build.js
 * A single build.
 * Handles creation, deletion and model loading
 */
export class Build {
  // All the models
  static MODELS = {
    build1: "./assets/3d/build1.glb",
    build2: "./assets/3d/build2.glb",
    build3: "./assets/3d/build3.glb",
  };

  // All the ThreeJS object's for the models
  static modelsLoaded = {};

  // The material for a lightable building
  static LIGHT_MATERIAL = null;

  // The material for a normal building
  static DEFAULT_BUILD_MATERIAL = null;

  /**
   * A build
   * @param {string} model the model
   * @param {THREE.Vector3} position The build's position
   * @param {*} isLight lightable
   * @param {*} distance
   */
  constructor(model, position, isLight, distance) {
    // The model ID
    this.model = model;
    // The build's position
    this.position = position;
    // The Three.js mesh
    this.mesh = null;
    // The build's model ID
    this.id = null;
    // lightable ?
    this.isLight = isLight;
    // Currently lighted?
    this.isLighting = false;
    // Lightable (backup vra)
    this.light = isLight;
    this.distance = distance;
  }

  /**
   * Place a building in the scene
   * @param {THREE.Scene} scene
   * @returns the mesh
   */
  place(scene) {
    if (this.mesh) return;
    // Copy the model
    this.mesh = Build.modelsLoaded[this.model].clone();
    // Set the position
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);

    // Set a utils userData var for the raycaster
    for (const child of this.mesh.children[0].children) {
      child.userData.parent = this.mesh.children[0];
    }
    this.mesh.children[0].userData.parent = this.mesh;

    // Set the build's material to the default one
    this.mesh.children[0].children[1].material =
      Build.DEFAULT_BUILD_MATERIAL.clone();

    // Add to the scene
    scene.add(this.mesh);

    // Set the name
    this.mesh.name = "Build";

    return this.mesh;
  }

  /**
   * Get a random model
   * @returns A random model
   */
  static getRandomBuildId() {
    const buildIds = Object.keys(this.modelsLoaded);
    return buildIds[randInt(0, buildIds.length - 1)];
  }

  /**
   * Loads the models and then run a callback
   * @param {*} callback the callback (when the models)
   * @param {*} loaders the loader object that contains the gltf loader
   */
  static loadModels(callback = () => {}, loaders) {
    // Only callback when all of the other one are loaded
    const callbackWrapper = () => {
      if (
        Object.keys(this.modelsLoaded).length ===
        Object.keys(this.MODELS).length
      ) {
        callback();
      }
    };

    for (const model in this.MODELS) {
      // Load the model with the callback
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

    // Init the lighted building's texture
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

    // Create the lighted building material
    this.LIGHT_MATERIAL = new THREE.MeshStandardMaterial({
      color: MAGIC_NUMBERS.BUILD_LIGHT.COLOR,
      emissive: MAGIC_NUMBERS.BUILD_LIGHT.COLOR,
      emissiveIntensity: MAGIC_NUMBERS.BUILD_LIGHT.INTENSITY,
      emissiveMap: texture,
    });

    // Create the default building's material
    this.DEFAULT_BUILD_MATERIAL = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveIntensity: 0,
    });
  }

  // DELETED: toGrid

  /**
   * Handle the build's removal
   */
  remove() {
    // Remove the mesh
    Build.removeRecursive(this.mesh);
    this.mesh = null;

    // Reset the lights variables
    this.isLight = this.light;
    this.isLighting = false;
  }

  /**
   * Removes the build with all it's datas
   * @param {THREE.Mesh} mesh the mesh to remove/unload
   */
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
