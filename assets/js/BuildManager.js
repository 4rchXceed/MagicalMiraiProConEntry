import { Build } from "./Build.js";
import { MAGIC_NUMBERS } from "./MagicNumbers.js";

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

    placeBuildOnGrid(gridX, gridZ, scene) {
        const buildId = Build.getRandomBuildId();
        if (!buildId) return false; // Skip if no buildId is available

        const gridHash = this.gridToHash(gridX, gridZ);
        if (this.usedGrids.includes(gridHash)) return false; // Skip if grid is already used

        const build = new Build(buildId, { x: gridX, y: 0, z: gridZ });
        build.place(scene);
        this.usedGrids.push(gridHash);
        this.builds.push(build);
        return true;
    }

    getBuildsAtRange(position, rangeMin, rangeMax) {
        const buildsInRange = [];
        for (const build of this.builds) {
            const distance = Math.sqrt(
                Math.pow(build.position.x - position.x, 2) +
                Math.pow(build.position.y - position.y, 2) +
                Math.pow(build.position.z - position.z, 2)
            );

            if (distance >= rangeMin && distance <= rangeMax) {
                buildsInRange.push(build);
            }
        }
        return buildsInRange;
    }

    getClosestBuild(position) {
        let closestBuild = null;
        let closestDistance = Infinity;


        for (const build of this.builds) {
            const distance = Math.sqrt(
                Math.pow(build.position.x - position.x, 2) +
                Math.pow(build.position.y - position.y, 2) +
                Math.pow(build.position.z - position.z, 2)
            );



            if (distance < closestDistance) {
                closestDistance = distance;
                closestBuild = build;
            }
        }


        return closestBuild;
    }

    getBuildFromGrid(gridX, gridZ) {
        gridX += MAGIC_NUMBERS.BUILDS_X_OFFSET; // Apply X offset to match placed builds
        gridZ += MAGIC_NUMBERS.BUILDS_Z_OFFSET; // Apply Z offset to match placed builds

        gridX *= this.gridSize.X;
        gridZ *= this.gridSize.Z;
        const gridHash = this.gridToHash(gridX, gridZ);
        if (!this.usedGrids.includes(gridHash)) return null; // No build on this grid

        return this.builds.find(build => build.position.x === gridX && build.position.z === gridZ) || null;
    }

    getBuildsFromZ(gridZ) {
        gridZ *= this.gridSize.Z;
        gridZ += MAGIC_NUMBERS.BUILDS_Z_OFFSET; // Apply Z offset to match placed builds
        gridZ += this.zOffset; // Apply zOffset

        return this.builds.filter(build => build.position.z === gridZ).sort((a, b) => a.position.x - b.position.x);
    }

    gridToCoord(gridX, gridZ, gridSize) {
        const x = gridX * gridSize.X;
        const z = gridZ * gridSize.Z;
        return { x, z };
    }

    fillBuilds(areaSize, scene, zOffset = 0) {
        this.zOffset = zOffset;

        for (let i = 0; i < Math.ceil(areaSize.x / this.gridSize.X); i++) {
            for (let j = 0; j < Math.ceil(areaSize.z / this.gridSize.Z); j++) {
                const { x: gridX, z: gridZ } = this.gridToCoord(i, j, this.gridSize);

                if (Math.random() > MAGIC_NUMBERS.CHANCE_TO_REMOVE_BUILD) { // Chance to remove build
                    this.placeBuildOnGrid(gridX + MAGIC_NUMBERS.BUILDS_X_OFFSET, gridZ + MAGIC_NUMBERS.BUILDS_Z_OFFSET + this.zOffset, scene);
                }
            }
        }
    }

    fillVirtualBuilds(areaSize) {
        // Fill builds without placing them in the scene, for pathfinding purposes
        this.refillPoints = [];
        for (let j = 0; j < Math.ceil(areaSize.z / this.gridSize.Z); j++) {
            for (let i = 0; i < Math.ceil(areaSize.x / this.gridSize.X); i++) {
                const { x: gridX, z: gridZ } = this.gridToCoord(i, j, this.gridSize);
                if (Math.random() > MAGIC_NUMBERS.CHANCE_TO_REMOVE_BUILD) { // Chance to remove build
                    const build = new Build(Build.getRandomBuildId(), { x: gridX + MAGIC_NUMBERS.BUILDS_X_OFFSET, y: 0, z: gridZ + MAGIC_NUMBERS.BUILDS_Z_OFFSET });
                    this.usedGrids.push(this.gridToHash(build.position.x, build.position.z));
                    this.builds.push(build);
                }
            }
            let gridZ = j * this.gridSize.Z + MAGIC_NUMBERS.BUILDS_Z_OFFSET + this.zOffset;
            if (j % MAGIC_NUMBERS.BUILD_BATCH_NUMBER === 0) { // Add point to refill builds
                this.refillPoints.push(gridZ);
            }
        }
        return this.refillPoints;
    }

    showVirtualBuilds(scene, toZ) {
        const virtualBuilds = this.builds.filter(build => build.position.z <= toZ * this.gridSize.Z);
        for (const build of virtualBuilds) {
            build.place(scene);

            build.id = Build.getRandomBuildId(); // Assign a random id to make it a "real" build
        }
    }

    removeBuild(build) {
        const gridX = build.position.x;
        const gridZ = build.position.z;
        const gridHash = this.gridToHash(gridX, gridZ);
        this.usedGrids = this.usedGrids.filter(hash => hash !== gridHash);
        this.builds = this.builds.filter(b => b !== build);
        build.remove();
    }

    clearBuilds(scene) {
        for (const build of this.builds) {
            build.remove(scene);
        }
        this.builds = [];
        this.usedGrids = [];
    }

    removeBuildsBeforeZ(scene, z) {
        const buildsToRemove = this.builds.filter(build => build.position.z < z * this.gridSize.Z);
        for (const build of buildsToRemove) {
            console.log("Removing build at z:", build.position.z);
            this.removeBuild(build, scene);
        }
    }
}