import { Scene } from "three";
import { Build } from "./Build.js";

/**
 * Manages the Builds classes
 * Handles: creating "virtual" builds, placing them, deleting all of them, etc.
 */
export class BuildManager {
  /**
   * Creates a BuildManager
   */
  constructor() {
    // Stores the builds that are already placed
    this.usedGrids = [];
    // Stores the Build objects
    this.builds = [];
  }

  /**
   * "Hashes" the grid position (used for this.usedGrids)
   * @param {number} gridX
   * @param {number} gridZ
   * @returns the "hash"
   */
  gridToHash(gridX, gridZ) {
    return `${gridX}-${gridZ}`;
  }

  /**
   * Places a build in the collection (without creating it in three.js)
   * @param {number} gridX pos x on the grid
   * @param {number} gridZ pos z on the grid
   * @param {boolean} isLight is this build lightable?
   * @param {number} distance distance (in grid) to the path point (use only if isLight === true)
   * @returns {boolean} is the build created?
   */
  placeVirtualBuild(gridX, gridZ, isLight, distance) {
    // Gets a random model
    const buildId = Build.getRandomBuildId();

    // Skip if no buildId is available
    if (!buildId) return false;

    // Hashes the build + checks if the grid place is unused
    const gridHash = this.gridToHash(Math.round(gridX), Math.round(gridZ));
    if (this.usedGrids.includes(gridHash)) return false; // Skip if grid is already used

    // Creates the build
    const build = new Build(
      buildId,
      { x: gridX, y: 0, z: gridZ },
      isLight,
      distance,
    );

    // Add it to the usedGrid + builds collection
    this.usedGrids.push(gridHash);
    this.builds.push(build);

    return true;
  }

  /**
   * Instantiates all the builds that are between minZ (excl.) and toZ (incl.) build in Three.js (aka. make them viewable / creating them)
   * @param {Scene} scene the Three.js scene
   * @param {number} toZ max z position (included)
   * @param {number} minZ min z position (excluded)
   */
  showVirtualBuilds(scene, toZ, minZ) {
    // Filters the builds by toZ and minZ
    const virtualBuilds = this.builds.filter(
      (build) => build.position.z <= toZ && build.position.z > minZ,
    );
    for (const build of virtualBuilds) {
      // Place it
      build.place(scene);
    }
  }

  /**
   * Removes all builds (FROM THE SCENE)
   * @param {Scene} scene the Thrree.js scene
   */
  clearBuilds(scene) {
    // First: remove all build objects in three.js, so if a build class got "lost" (there was a problem like this)
    const builds = scene.children.filter((e) => e.name === "Build");
    for (const build of builds) {
      Build.removeRecursive(build);
    }
    // Handle the build's removal
    this.builds.map((b) => b.remove());
  }

  /**
   * Removes from Three.js all the builds that are behind z
   * @param {number} z the min z for builds not to be removed
   */
  removeBuildsBeforeZ(z) {
    // Creates the list
    const buildsToRemove = this.builds.filter((build) => {
      return build.position.z < z;
    });

    // Removes the builds
    for (const build of buildsToRemove) {
      build.remove();
    }
  }
}
