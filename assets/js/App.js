import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { degToRad, randInt, getGridMaxElements, gridToCoord, easeInOut } from './utils/Math.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BuildManager } from './BuildManager.js';
import { Build } from './Build.js';
import { MAGIC_NUMBERS } from './MagicNumbers.js';
import { PathGen, Point } from './PathGen.js';
import { ParticleSystem } from './ParticleSystem.js';
import { LYRICS_TEMP } from './LyricsTemp.js';


export class LyricsApp {
    AREA_SIZE = MAGIC_NUMBERS.AREA_SIZE;
    constructor() {
        // Data
        this.modelsLoaded = {};
        this.usedGrids = [];
        this.builds = [];
        this.shootingStars = [];
        this.cameraReferencePoint = 0;
        this.lastTime = 0;
        this.isFirstFrame = true;
        this.font = null;
        this.texts = {};
        this.zOffset = 0;
        this.zBuilds = 0;

        // Classes
        this.buildManager = new BuildManager();
        this.cameraRotationEaseInOut = {
            start: 0,
            change: 0,
            duration: MAGIC_NUMBERS.ROTATION_TIME,
        }
        this.particleSystem = null;


        // Not yet initialized attributes
        this.loaders = null;
        this.pathGrid = null;
        this.pathFinder = null;
        this.pathGen = null;

        // Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.floor = null;
        this.cameraLight = null;

    }
    init() {
        this.loaders = {
            gltf: new GLTFLoader(),
            cubeTexture: new THREE.CubeTextureLoader(),
            svg: new SVGLoader(),
            texture: new THREE.TextureLoader()
        };
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer = new EffectComposer(this.renderer);


        // Bloom
        const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
        this.bloomPass = new UnrealBloomPass(resolution, .5, 0.1, 0.1);


        // "Tweaks"
        this.camera.position.z = 3;
        this.camera.position.y = 3;
        this.camera.rotation.y = degToRad(180);
        this.camera.position.x = this.AREA_SIZE.x / 2;
        this.camera.rotation.x = degToRad(0);

        // Add to scene
        document.body.appendChild(this.renderer.domElement); // TODO: move this to another element
        this.scene.add(this.camera);

        // Handle composer
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.composer.addPass(this.bloomPass);

        // Load models and generate elements
        this.generateElements();
        Build.loadModels(() => this.loadedCallback(), this.loaders);
    }

    enableDebug() {
        new OrbitControls(this.camera, this.renderer.domElement);
    }

    getPoints() {
        const choosenBuilds = [];
        let lastBuildGridX = null;
        for (let i = 0; i < LYRICS_TEMP.length; i++) {
            const lyrics = LYRICS_TEMP[i];

            let lyricsText = [{
                time: LYRICS_TEMP[i][0] / 1000 - lyrics[0] / 1000,
                text: LYRICS_TEMP[i][1]
            }];

            let timeToNext = LYRICS_TEMP[i + 1] ? (LYRICS_TEMP[i + 1][0] / 1000) - (lyrics[0] / 1000) : Infinity;

            let lyricTime = lyrics[0] / 1000;

            while (timeToNext < MAGIC_NUMBERS.LYRICS_MIN_TIME) { // "Skip" to the next lyrics if we're too close to it, to avoid rapid changes in the path
                i++;
                if (i >= LYRICS_TEMP.length - 1) break;

                timeToNext = (LYRICS_TEMP[i + 1][0] / 1000) - (lyrics[0] / 1000);
                lyricTime = LYRICS_TEMP[i][0] / 1000;
                lyricsText.push({
                    time: LYRICS_TEMP[i][0] / 1000 - lyrics[0] / 1000,
                    text: LYRICS_TEMP[i][1]
                });
            }

            const builds = this.buildManager.getBuildsFromZ(i);

            if (builds.length > 0) {
                let build = null;

                if (lastBuildGridX !== null) {
                    // Filter builds to those within 1 grid of the last build's grid X
                    const validBuilds = builds.filter(build => {
                        const gridX = build.toGrid(this.buildManager.gridSize).gridX;
                        return Math.abs(gridX - lastBuildGridX) === 1;
                    });

                    if (validBuilds.length > 0) {
                        const x = randInt(0, validBuilds.length - 1);
                        build = validBuilds[x];
                    }
                } else {
                    build = builds[randInt(0, builds.length - 1)];
                }

                if (build) {
                    lastBuildGridX = build.toGrid(this.buildManager.gridSize).gridX;
                    choosenBuilds.push({
                        build,
                        time: lyricTime,
                        texts: lyricsText,
                    });
                    const lastBuilds = this.buildManager.getBuildsFromZ(i - 1);
                    const lastBuild = lastBuilds.find(build => build.toGrid(this.buildManager.gridSize).gridX === lastBuildGridX);
                    if (lastBuild) {
                        this.buildManager.removeBuild(lastBuild);
                    }
                }
            }
        }
        const buildPositions = [];
        for (const build of choosenBuilds) {
            buildPositions.push({
                x: build.build.position.x,
                y: build.build.position.y + randInt(MAGIC_NUMBERS.BUILD_PATH_Y.MIN_Y, MAGIC_NUMBERS.BUILD_PATH_Y.MAX_Y),
                z: build.build.position.z - MAGIC_NUMBERS.BUILD_PATH_OFFSET.Z,
                time: build.time,
                texts: build.texts,
            });
        }

        return buildPositions;
    }

    buildGrid(sizeZ) {
        let preview = "";
        this.pathGrid = new PF.Grid(this.AREA_SIZE.x + 1, sizeZ + 1);

        for (let i = this.zOffset; i < sizeZ; i++) {
            for (let j = 0; j < this.AREA_SIZE.x; j++) {
                const point = new Point(j, 0, i);


                const closestBuild = this.buildManager.getClosestBuild(point);
                if (!closestBuild) {
                    this.pathGrid.setWalkableAt(j, i, true);
                    preview += "0";
                    continue;
                }
                const closestBuildPoint = new Point(closestBuild.position.x, closestBuild.position.y, closestBuild.position.z);
                const distanceX = Math.abs(closestBuildPoint.x - point.x);
                const distanceZ = Math.abs(closestBuildPoint.z - point.z);


                if (distanceX <= MAGIC_NUMBERS.BUILD_PATH_DISTANCE.X && distanceZ <= MAGIC_NUMBERS.BUILD_PATH_DISTANCE.Y) {
                    this.pathGrid.setWalkableAt(j, i, false);
                    preview += "1";
                } else {
                    this.pathGrid.setWalkableAt(j, i, true);
                    preview += "0";
                }
            }
            preview += "\n";
        }

        // console.log(preview);

        this.previewGrid = preview;

        // window.drawPreview = (x, y, x2, y2) => {
        //     const lines = this.previewGrid.split("\n");

        //     let preview = "";
        //     for (let i = 0; i < lines.length; i++) {
        //         let line = "";

        //         for (let j = 0; j < lines[i].length; j++) {

        //             if ((j === x && i === y) || (j === x2 && i === y2)) {
        //                 line += " ";
        //             } else {
        //                 line += lines[i][j];
        //             }
        //         }
        //         preview += line + "\n";
        //     }
        //     console.log(preview);
        // }

        this.pathFinder = new PF.AStarFinder({
            allowsDiagonal: true,
        });
    }

    async loadedCallback() {
        const neededPoints = PathGen.getNumberOfPointsNeeded();
        console.log("Needed Points for the song:", neededPoints);

        const refillPoints = this.buildManager.fillVirtualBuilds({ z: neededPoints * MAGIC_NUMBERS.GRID_SIZE.Z, x: this.AREA_SIZE.x });
        this.buildManager.showVirtualBuilds(this.scene, MAGIC_NUMBERS.BUILD_BATCH_NUMBER);
        const buildPositions = this.getPoints();

        this.floor.geometry.scale(1, 1, neededPoints * MAGIC_NUMBERS.GRID_SIZE.Z);

        this.buildGrid(neededPoints * MAGIC_NUMBERS.GRID_SIZE.Z);

        this.pathGen = new PathGen(buildPositions, this.pathFinder, this.pathGrid, this, refillPoints);
        const material = new THREE.MeshStandardMaterial({ color: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR, emissive: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR, emissiveIntensity: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_LIGHT_INTENSITY });
        this.particleSystem = new ParticleSystem(this.scene, MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.NUMBER, material, new THREE.SphereGeometry(MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.SIZE, 8, 8));
        this.renderer.setAnimationLoop((time) => this.loop(time));
    }

    getClosest(point, objects) {
        let closestObject = null;
        let closestDistance = Infinity;

        for (const object of objects) {
            const distance = Math.sqrt((object.x - point.x) ** 2 + (object.y - point.y) ** 2 + (object.z - point.z) ** 2);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestObject = object;
            }
        }

        return closestObject;
    }

    generateImageFrontCharacter(character) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontSize = 100;
        canvas.width = fontSize * character.length;
        canvas.height = fontSize;
        context.font = `${fontSize}px Arial`;
        context.fillStyle = 'white';
        context.textBaseline = 'top';
        context.fillText(character, 0, 0);
        return canvas.toDataURL();
    }

    refill() {
        this.zBuilds += MAGIC_NUMBERS.BUILD_BATCH_NUMBER;
        // console.log(this.zBuilds);

        this.buildManager.showVirtualBuilds(this.scene, MAGIC_NUMBERS.BUILD_BATCH_NUMBER + this.zBuilds);
        this.buildManager.removeBuildsBeforeZ(this.scene, this.zBuilds - MAGIC_NUMBERS.BUILD_BATCH_NUMBER);

        // Refill builds and regenerate path
        // this.zOffset += MAGIC_NUMBERS.AREA_SIZE.z + MAGIC_NUMBERS.PATH_CONNECT.Z_LENGTH; // Little place for the transition
        // this.buildManager.clearBuilds(this.scene);
        // this.buildManager.fillBuilds(this.AREA_SIZE, this.scene, this.zOffset);
        // this.buildGrid();
        // const buildPositions = this.getPoints();

        // this.pathGen.updatePath(buildPositions, this.pathFinder, this.pathGrid);
    }

    async showLyrics(lyrics, point, targetY) {
        const build = this.buildManager.builds.filter(build => build.position.z == point.z + MAGIC_NUMBERS.BUILD_PATH_OFFSET.Z && build.position.x == point.x && build.id !== null)[0];
        if (!build) return;

        const raycaster = new THREE.Raycaster();
        const target = new THREE.Vector3();
        build.mesh.getWorldPosition(target);

        const direction = target.sub(this.camera.position).normalize();
        raycaster.set(this.camera.position, direction);
        const intersects = raycaster.intersectObject(build.mesh, true);
        if (intersects.length === 0) return;
        const intersect = intersects[0];
        let plane = null;
        let borderPlane = null;

        const worldNormal = intersect.face.normal
            .clone()
            .transformDirection(intersect.object.matrixWorld)
            .normalize();

        const right = new THREE.Vector3(1, 0, 0);
        let writePoint = intersect.point.clone();
        if (this.texts[point.z]) {
            targetY -= Math.floor(this.texts[point.z][0] / 2) * MAGIC_NUMBERS.LYRICS_SPACING.Y;
            writePoint = this.texts[point.z][1].clone();
            this.texts[point.z][0]++;
        } else {
            // Create a plane for the text to be displayed on
            const planeGeometry = new THREE.PlaneGeometry(MAGIC_NUMBERS.LYRICS_FRAME.SIZE.X, MAGIC_NUMBERS.LYRICS_FRAME.SIZE.Y);
            const planeMaterial = new THREE.MeshStandardMaterial({ color: MAGIC_NUMBERS.LYRICS_FRAME.COLOR, side: THREE.DoubleSide, emissive: MAGIC_NUMBERS.LYRICS_FRAME.COLOR, emissiveIntensity: MAGIC_NUMBERS.LYRICS_FRAME.EMISSIVE_INTENSITY });
            plane = new THREE.Mesh(planeGeometry, planeMaterial);

            const hitPoint = intersect.point.clone();

            // Get the face's vertices in world coordinates
            hitPoint.x = intersect.object.localToWorld(new THREE.Vector3(0, 0, 0)).x - MAGIC_NUMBERS.LYRICS_FRAME.FRAME_OFFSET;


            plane.position.copy(hitPoint.add(intersect.face.normal.clone().multiplyScalar(0.002))); // Offset the plane slightly from the surface to prevent z-fighting Removed: .add(right.clone().multiplyScalar(MAGIC_NUMBERS.LYRICS_FRAME.SIZE.X / 2))
            plane.position.y = targetY;

            this.scene.add(plane);

            // Border plane
            const borderGeometry = new THREE.PlaneGeometry(MAGIC_NUMBERS.LYRICS_FRAME.SIZE.X + MAGIC_NUMBERS.LYRICS_FRAME.BORDER_SIZE, MAGIC_NUMBERS.LYRICS_FRAME.SIZE.Y + MAGIC_NUMBERS.LYRICS_FRAME.BORDER_SIZE);
            const borderMaterial = new THREE.MeshStandardMaterial({ color: MAGIC_NUMBERS.LYRICS_FRAME.BORDER_COLOR, side: THREE.DoubleSide, emissive: MAGIC_NUMBERS.LYRICS_FRAME.BORDER_COLOR, emissiveIntensity: MAGIC_NUMBERS.LYRICS_FRAME.BORDER_EMISSIVE_INTENSITY });
            borderPlane = new THREE.Mesh(borderGeometry, borderMaterial);
            borderPlane.position.copy(plane.position);
            borderPlane.position.z += 0.001; // Ensure the border is behind the main plane

            this.texts[point.z] = [1, writePoint.clone()];
        }



        // Text geometry
        const lyricImage = this.generateImageFrontCharacter(lyrics);

        const textMaterial = new THREE.MeshStandardMaterial({
            color: MAGIC_NUMBERS.LYRICS_COLOR,
            side: THREE.DoubleSide,
            emissive: MAGIC_NUMBERS.LYRICS_COLOR,
            emissiveIntensity: MAGIC_NUMBERS.LYRICS_EMISSIVE_INTENSITY,
        });

        const textTexture = await new Promise((resolve) => {
            this.loaders.texture.load(lyricImage, (texture) => {
                resolve(texture);
            });
        });

        textMaterial.map = textTexture;
        textMaterial.transparent = true;

        const textGeometry = new THREE.PlaneGeometry(MAGIC_NUMBERS.LYRICS_SIZE, MAGIC_NUMBERS.LYRICS_SIZE / lyrics.length);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);


        // Rotate the plane to match the collider's surface

        textMesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            worldNormal
        );
        if (plane) {
            plane.quaternion.copy(textMesh.quaternion);
        }
        let cloned = writePoint.clone();
        cloned.y = targetY;
        let position = cloned.clone().sub(new THREE.Vector3(0, 0, 1).multiplyScalar(0.003)); // Offset the text slightly from the plane to prevent z-fighting

        position.x = intersect.object.localToWorld(new THREE.Vector3(0, 0, 0)).x - MAGIC_NUMBERS.LYRICS_FRAME.FRAME_OFFSET;

        if (this.texts[point.z][0] % 2 === 0) {
            position.x -= MAGIC_NUMBERS.LYRICS_SPACING.X;
        }

        position.sub(right.clone().multiplyScalar(MAGIC_NUMBERS.LYRICS_FRAME.LYRICS_OFFSET.X / 2));
        position.sub(new THREE.Vector3(0, 1, 0).multiplyScalar(-MAGIC_NUMBERS.LYRICS_FRAME.LYRICS_OFFSET.Y / 2));

        textMesh.position.copy(position);


        this.scene.add(textMesh);
        if (borderPlane) {
            this.scene.add(borderPlane);
        }

        setTimeout(() => {
            this.scene.remove(textMesh);
        }, MAGIC_NUMBERS.LYRICS_DISPLAY_TIME * 5000);
    }

    generateElements() {
        // Floor
        const geometry = new THREE.BoxGeometry(MAGIC_NUMBERS.FLOOR_SIZE.X, .1, MAGIC_NUMBERS.FLOOR_SIZE.Z);
        const material = new THREE.MeshStandardMaterial({ color: 0x3A3A3A, roughness: 0.5, metalness: 0.5 });
        this.floor = new THREE.Mesh(geometry, material);
        this.floor.position.y = -.1;
        this.floor.position.z = this.AREA_SIZE.z / 2;
        this.floor.position.x = this.AREA_SIZE.x / 2;

        // Camera spotlight
        this.cameraLight = new THREE.SpotLight(0xffffff, MAGIC_NUMBERS.LIGHT_INTENSITY, 100, degToRad(45), 0.5, 2);
        this.cameraLight.castShadow = true;
        this.cameraLight.shadow.mapSize.width = 1024;
        this.cameraLight.shadow.mapSize.height = 1024;

        // Skybox
        const textures = this.loaders.cubeTexture.load([
            './assets/textures/skybox/jettelly_space_common_black_LEFT.png',
            './assets/textures/skybox/jettelly_space_common_black_RIGHT.png',
            './assets/textures/skybox/jettelly_space_common_black_UP.png',
            './assets/textures/skybox/jettelly_space_common_black_DOWN.png',
            './assets/textures/skybox/jettelly_space_common_black_FRONT.png',
            './assets/textures/skybox/jettelly_space_common_black_BACK.png',
        ]);

        // Shooting stars
        for (let i = 0; i < MAGIC_NUMBERS.SHOOTING_STAR.NUMBER; i++) {
            this.generateShootingStar(i === 0, i);
        }

        // Place them in the scene
        this.camera.add(this.cameraLight);
        this.scene.add(this.floor);
        this.scene.background = textures;
    }

    generateShootingStar(last = false, i) {
        // Shooting Star

        const starGeometry = new THREE.SphereGeometry(MAGIC_NUMBERS.SHOOTING_STAR.SIZE * ((i + MAGIC_NUMBERS.SHOOTING_STAR.MIN_SIZE) / MAGIC_NUMBERS.SHOOTING_STAR.NUMBER), 16, 16);
        const starMaterial = new THREE.MeshStandardMaterial({ color: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR, emissive: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR, emissiveIntensity: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_LIGHT_INTENSITY });
        const shootingStar = new THREE.Mesh(starGeometry, starMaterial);
        if (last) {
            const light = new THREE.PointLight(MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR, MAGIC_NUMBERS.SHOOTING_STAR.LIGHT_INTENSITY, 10);
            light.position.set(0, 0, -0.2);
            shootingStar.add(light);
        }

        this.scene.add(shootingStar);

        this.shootingStars.push(shootingStar);
    }

    async loop(time) {
        // IMPORTANT: The first frame delta is from the time the page started loading, so we need to ignore it to avoid huge jumps in the path
        let newTime = time - this.lastTime;
        this.lastTime = time;
        if (this.isFirstFrame) {
            window.audio.play(); // TODO: Finish this in a better way
            for (const lyricAndTime of LYRICS_TEMP) {
                setTimeout(() => {
                    console.log("FIX:", lyricAndTime[1]);
                }, lyricAndTime[0]);
            }
            this.isFirstFrame = false;
            return;
        }

        const [newPos, objective, rail] = this.pathGen.update(newTime / 1000);
        this.camera.position.set(newPos.x, newPos.y, newPos.z);

        if (objective) {
            this.camera.lookAt(objective.x, objective.y, objective.z);
            for (let i = 0; i < rail.length; i++) {
                const point = rail[i];
                const star = this.shootingStars[i];
                if (star) {
                    star.position.set(point.x, point.y - MAGIC_NUMBERS.SHOOTING_STAR.OFFSET_Y, point.z);
                }
            }
        }

        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        this.cameraLight.target.position.copy(this.camera.position).add(cameraDirection);
        this.cameraLight.target.updateMatrixWorld();

        this.particleSystem.ensureCapacity(this.shootingStars[0].position.clone(), newTime / 1000);

        this.particleSystem.loop(newTime / 1000);

        // Render
        this.composer.render();
    }

}
