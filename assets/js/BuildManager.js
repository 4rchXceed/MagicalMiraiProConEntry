import { Build } from "./Build.js";
import { MAGIC_NUMBERS } from "./MagicNumbers.js";
import { randInt } from "./utils/Math.js";

export class BuildManager {
  constructor() {
    this.usedGrids = [];
    this.gridSize = MAGIC_NUMBERS.GRID_SIZE;
    this.builds = [];
    this.zOffset = 0;
  }

  gridToHash(gridX, gridZ) {
    return `${gridX}-${gridZ}`;
  }

  placeVirtualBuilds(gridX, gridZ, isLight, distance) {
    const buildId = Build.getRandomBuildId();

    if (!buildId) return false; // Skip if no buildId is available

    const gridHash = this.gridToHash(gridX, gridZ);
    if (this.usedGrids.includes(gridHash)) return false; // Skip if grid is already used

    const build = new Build(
      buildId,
      { x: gridX, y: 0, z: gridZ },
      isLight,
      distance,
    );
    // build.place(scene);
    this.usedGrids.push(gridHash);
    this.builds.push(build);
    return true;
  }

  // fillBuilds(areaSize, scene, zOffset = 0) {
  //   this.zOffset = zOffset;

  //   for (let i = 0; i < Math.ceil(areaSize.x / this.gridSize.X); i++) {
  //     for (let j = 0; j < Math.ceil(areaSize.z / this.gridSize.Z); j++) {
  //       const { x: gridX, z: gridZ } = this.gridToCoord(i, j, this.gridSize);

  //       if (Math.random() > MAGIC_NUMBERS.CHANCE_TO_REMOVE_BUILD) {
  //         // Chance to remove build
  //         this.placeBuildOnGrid(
  //           gridX + MAGIC_NUMBERS.BUILDS_X_OFFSET,
  //           gridZ + MAGIC_NUMBERS.BUILDS_Z_OFFSET + this.zOffset,
  //           scene,
  //         );
  //       }
  //     }
  //   }
  // }

  // fillVirtualBuilds(areaSize) {
  //   // Fill builds without placing them in the scene, for pathfinding purposes
  //   this.refillPoints = [];
  //   for (let j = 0; j < Math.ceil(areaSize.z / this.gridSize.Z); j++) {
  //     for (let i = 0; i < Math.ceil(areaSize.x / this.gridSize.X); i++) {
  //       const { x: gridX, z: gridZ } = this.gridToCoord(i, j, this.gridSize);
  //       if (Math.random() > MAGIC_NUMBERS.CHANCE_TO_REMOVE_BUILD) {
  //         // Chance to remove build
  //         const build = new Build(Build.getRandomBuildId(), {
  //           x: gridX + MAGIC_NUMBERS.BUILDS_X_OFFSET,
  //           y: 0,
  //           z: gridZ + MAGIC_NUMBERS.BUILDS_Z_OFFSET,
  //         });
  //         this.usedGrids.push(
  //           this.gridToHash(build.position.x, build.position.z),
  //         );
  //         this.builds.push(build);
  //       }
  //     }
  //     let gridZ =
  //       j * this.gridSize.Z + MAGIC_NUMBERS.BUILDS_Z_OFFSET + this.zOffset;
  //     if (j % MAGIC_NUMBERS.BUILD_BATCH_NUMBER === 0) {
  //       // Add point to refill builds
  //       this.refillPoints.push(gridZ);
  //     }
  //   }
  //   return this.refillPoints;
  // }

  showVirtualBuilds(scene, toZ, minZ) {
    const virtualBuilds = this.builds.filter(
      (build) => build.position.z <= toZ && build.position.z > minZ,
    );
    // console.log(virtualBuilds);
    for (const build of virtualBuilds) {
      build.place(scene);

      build.id = Build.getRandomBuildId(); // Assign a random id to make it a "real" build
    }
  }

  // removeFromMesh(scene, mesh) {
  //   this.builds.find((build) => build.mesh === mesh)?.remove(scene);
  //   this.builds = this.builds.filter((build) => build.mesh !== mesh);
  // }

  removeBuild(build, scene) {
    // const gridX = build.position.x;
    // const gridZ = build.position.z;
    // const gridHash = this.gridToHash(gridX, gridZ);
    build.remove();
    // this.usedGrids = this.usedGrids.filter((hash) => hash !== gridHash);
    // this.builds = this.builds.filter((b) => b !== build);
  }

  clearBuilds(scene) {
    const builds = scene.children.filter((e) => e.name === "Build");
    for (const build of builds) {
      Build.removeRecursive(build);
    }
    this.builds.map((b) => (b.mesh = null));
  }

  removeBuildsBeforeZ(scene, z) {
    const buildsToRemove = this.builds.filter((build) => {
      return build.position.z < z;
    });
    for (const build of buildsToRemove) {
      this.removeBuild(build, scene);
    }
  }
}
