import Stats from "https://cdn.jsdelivr.net/npm/stats.js@0.17.0/+esm";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { degToRad, randInt } from "./utils/Math.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MAGIC_NUMBERS } from "./MagicNumbers.js";
import { PathGen, Point } from "./PathGen.js";
import { ParticleSystem } from "./ParticleSystem.js";
import { LYRICS_TEMP } from "./LyricsTemp.js";
import { BuildManager } from "./BuildManager.js";
import { Build } from "./Build.js";

export class LyricsApp {
  AREA_SIZE = MAGIC_NUMBERS.AREA_SIZE;
  constructor(debug = false) {
    // Data
    this.debug = debug;
    this.modelsLoaded = {};
    this.usedGrids = [];
    this.shootingStars = [];
    this.cameraReferencePoint = 0;
    this.lastTime = 0;
    this.isFirstFrame = true;
    this.font = null;
    this.texts = {};
    this.zOffset = 0;

    // Classes
    this.buildManager = new BuildManager();
    this.cameraRotationEaseInOut = {
      start: 0,
      change: 0,
      duration: MAGIC_NUMBERS.ROTATION_TIME,
    };
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

    if (this.debug) {
      this.stats = new Stats();
      this.stats.showPanel(0);
      document.body.appendChild(this.stats.dom);
    }
  }
  init() {
    this.loaders = {
      gltf: new GLTFLoader(),
      cubeTexture: new THREE.CubeTextureLoader(),
      svg: new SVGLoader(),
      texture: new THREE.TextureLoader(),
    };
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer = new EffectComposer(this.renderer);

    // Bloom
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloomPass = new UnrealBloomPass(resolution, 0.5, 0.1, 0.1);

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
    let lastX = 0;
    for (let i = 0; i < LYRICS_TEMP.length; i++) {
      const lyrics = LYRICS_TEMP[i];

      let lyricsText = [
        {
          time: LYRICS_TEMP[i][0] / 1000 - lyrics[0] / 1000,
          text: LYRICS_TEMP[i][1],
        },
      ];

      let timeToNext = LYRICS_TEMP[i + 1]
        ? LYRICS_TEMP[i + 1][0] / 1000 - lyrics[0] / 1000
        : Infinity;

      let lyricTime = lyrics[0] / 1000;

      while (timeToNext < MAGIC_NUMBERS.LYRICS_MIN_TIME) {
        // "Skip" to the next lyrics if we're too close to it, to avoid rapid changes in the path
        i++;
        if (i >= LYRICS_TEMP.length - 1) break;

        timeToNext = LYRICS_TEMP[i + 1][0] / 1000 - lyrics[0] / 1000;
        lyricTime = LYRICS_TEMP[i][0] / 1000;
        lyricsText.push({
          time: LYRICS_TEMP[i][0] / 1000 - lyrics[0] / 1000,
          text: LYRICS_TEMP[i][1],
        });
      }

      const z =
        i * MAGIC_NUMBERS.DISTANCE_BETWEEN_POINTS * MAGIC_NUMBERS.GRID_SIZE.Z;
      const minX = Math.max(0, lastX - 1);
      const maxX = Math.min(MAGIC_NUMBERS.POINTS_GEN.MAX_X, lastX + 1);
      const x = randInt(minX, maxX);
      const pos = new THREE.Vector3(
        x * MAGIC_NUMBERS.GRID_SIZE.X,
        MAGIC_NUMBERS.POINTS_GEN.FIXED_Y,
        z,
      );
      choosenBuilds.push({
        pos: pos,
        time: lyricTime,
        texts: lyricsText,
      });
      for (let j = 0; j <= MAGIC_NUMBERS.POINTS_GEN.MAX_X; j++) {
        if (j !== x && i >= MAGIC_NUMBERS.BUILD_START) {
          this.buildManager.placeVirtualBuilds(
            j * MAGIC_NUMBERS.GRID_SIZE.X,
            z,
          );
        }
      }
    }
    const buildPositions = [];
    // let lastBuild = null;
    for (const build of choosenBuilds) {
      // if (lastBuild) {
      //   buildPositions.push({
      //     x: (lastBuild.pos.x + build.pos.x) / 2,
      //     y: (lastBuild.pos.y + build.pos.y) / 2,
      //     z: (lastBuild.pos.z + build.pos.z) / 2,
      //     isMiddlePoint: true,
      //   });
      // }
      // lastBuild = build;
      buildPositions.push({
        x: build.pos.x,
        y:
          Math.random() *
            (MAGIC_NUMBERS.PATH_Y.MAX_Y - MAGIC_NUMBERS.PATH_Y.MIN_Y + 1) +
          MAGIC_NUMBERS.PATH_Y.MIN_Y,
        z: build.pos.z + MAGIC_NUMBERS.BUILD_PATH_OFFSET.Z,
        time: build.time,
        texts: build.texts,
        randomXOffset:
          build.pos.x > MAGIC_NUMBERS.POINTS_GEN.MAX_X / 2 ? 1 : -1,
        isMiddlePoint: false,
      });
    }

    return buildPositions;
  }

  // buildGrid(sizeZ) {
  //   let preview = "";
  //   this.pathGrid = new PF.Grid(this.AREA_SIZE.x + 1, sizeZ + 1);

  //   for (let i = this.zOffset; i < sizeZ; i++) {
  //     for (let j = 0; j < this.AREA_SIZE.x; j++) {
  //       const point = new Point(j, 0, i);

  //       // const closestBuild = this.buildManager.getClosestBuild(point);
  //       // if (!closestBuild) {
  //       //   this.pathGrid.setWalkableAt(j, i, true);
  //       //   preview += "0";
  //       //   continue;
  //       // }

  //       const closestBuildPoint = new Point(
  //         Math.floor(point.x / MAGIC_NUMBERS.GRID_SIZE.X) *
  //           MAGIC_NUMBERS.GRID_SIZE.X,
  //         MAGIC_NUMBERS.POINTS_GEN.FIXED_Y,
  //         Math.floor(point.z / MAGIC_NUMBERS.GRID_SIZE.Z) *
  //           MAGIC_NUMBERS.GRID_SIZE.Z,
  //       );
  //       const distanceX = Math.abs(closestBuildPoint.x - point.x);
  //       const distanceZ = Math.abs(closestBuildPoint.z - point.z);

  //       if (
  //         distanceX <= MAGIC_NUMBERS.BUILD_PATH_DISTANCE.X &&
  //         distanceZ <= MAGIC_NUMBERS.BUILD_PATH_DISTANCE.Y
  //       ) {
  //         this.pathGrid.setWalkableAt(j, i, false);
  //         preview += "1";
  //       } else {
  //         this.pathGrid.setWalkableAt(j, i, true);
  //         preview += "0";
  //       }
  //     }
  //     preview += "\n";
  //   }

  //   console.log(preview);

  //   this.previewGrid = preview;

  //   // window.drawPreview = (x, y, x2, y2) => {
  //   //   const lines = this.previewGrid.split("\n");
  //   //   let preview = "";
  //   //   for (let i = 0; i < lines.length; i++) {
  //   //     let line = "";
  //   //     for (let j = 0; j < lines[i].length; j++) {
  //   //       if (j === x && i === y) {
  //   //         line += " ";
  //   //       } else {
  //   //         line += lines[i][j];
  //   //       }
  //   //     }
  //   //     preview += line + "\n";
  //   //   }
  //   //   console.log(preview);
  //   // };

  //   this.pathFinder = new PF.AStarFinder({
  //     allowsDiagonal: true,
  //   });
  // }

  async loadedCallback() {
    const neededPoints = PathGen.getNumberOfPointsNeeded();
    console.log("Needed Points for the song:", neededPoints);

    const buildPositions = this.getPoints();

    this.floor.geometry.scale(1, 1, neededPoints * MAGIC_NUMBERS.GRID_SIZE.Z);

    // this.buildGrid(neededPoints * MAGIC_NUMBERS.GRID_SIZE.Z);

    this.pathGen = new PathGen(
      buildPositions,
      this.pathFinder,
      this.pathGrid,
      this,
    );
    const material = new THREE.MeshStandardMaterial({
      color: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR,
      emissive: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR,
      emissiveIntensity: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_LIGHT_INTENSITY,
    });
    this.particleSystem = new ParticleSystem(
      this.scene,
      MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.NUMBER,
      material,
      new THREE.SphereGeometry(
        MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.SIZE,
        8,
        8,
      ),
      MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES,
    );
    this.renderer.setAnimationLoop((time) => this.loop(time));
  }

  raycastForward(point, distance) {
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(point.x, point.y, point.z),
      new THREE.Vector3(0, 0, 1),
      0,
      distance,
    );
    // const objects = this.buildManager.builds
    //   .filter((build) => build.mesh)
    //   .map((build) => build.mesh);
    const name = "Build";
    const objects = this.scene.children
      .filter((child) => name === child.name && child.children[0])
      .map((group) => group.children[0]); // Folder with the model -> model itself
    const intersects = raycaster.intersectObjects(objects, true);
    return intersects.map((intersect) => intersect.object);
  }

  getClosest(point, objects) {
    let closestObject = null;
    let closestDistance = Infinity;

    for (const object of objects) {
      const distance = Math.sqrt(
        (object.x - point.x) ** 2 +
          (object.y - point.y) ** 2 +
          (object.z - point.z) ** 2,
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestObject = object;
      }
    }

    return closestObject;
  }

  generateImageFrontCharacter(character) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const fontSize = 100;
    canvas.width = fontSize * character.length;
    canvas.height = fontSize;
    context.font = `${fontSize}px Arial`;
    context.fillStyle = "white";
    context.textBaseline = "top";
    context.fillText(character, 0, 0);
    return canvas.toDataURL();
  }

  refill(nextRefillZ) {
    this.buildManager.showVirtualBuilds(this.scene, nextRefillZ);
    const lastRefillZ = nextRefillZ - MAGIC_NUMBERS.REFILL_INTERVAL;
    this.buildManager.removeBuildsBeforeZ(this.scene, lastRefillZ);
  }

  // refill() {
  //   this.zBuilds += MAGIC_NUMBERS.BUILD_BATCH_NUMBER;
  //   // console.log(this.zBuilds);

  //   // Refill builds and regenerate path
  //   // this.zOffset += MAGIC_NUMBERS.AREA_SIZE.z + MAGIC_NUMBERS.PATH_CONNECT.Z_LENGTH; // Little place for the transition
  //   // this.buildManager.clearBuilds(this.scene);
  //   // this.buildManager.fillBuilds(this.AREA_SIZE, this.scene, this.zOffset);
  //   // this.buildGrid();
  //   // const buildPositions = this.getPoints();

  //   // this.pathGen.updatePath(buildPositions, this.pathFinder, this.pathGrid);
  // }

  // , point, targetY
  async showLyrics(lyrics) {
    // Text geometry

    const point = new THREE.Vector3(0, 0, -1).unproject(this.camera);

    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    point.add(
      cameraDirection.clone().multiplyScalar(MAGIC_NUMBERS.LYRICS.DISTANCE),
    );

    // const cameraPosition = this.camera.position;

    // point.multiplyScalar(MAGIC_NUMBERS.LYRICS.DISTANCE).add(cameraPosition);

    const lyricImage = this.generateImageFrontCharacter(lyrics);

    const textMaterial = new THREE.MeshStandardMaterial({
      color: MAGIC_NUMBERS.LYRICS_COLOR,
      side: THREE.DoubleSide,
      emissive: MAGIC_NUMBERS.LYRICS_COLOR,
      emissiveIntensity: MAGIC_NUMBERS.LYRICS_EMISSIVE_INTENSITY,
    });

    // const bgMaterial = new THREE.MeshStandardMaterial({
    //   color: MAGIC_NUMBERS.LYRICS_FRAME.COLOR,
    //   side: THREE.DoubleSide,
    //   emissive: MAGIC_NUMBERS.LYRICS_FRAME.COLOR,
    //   emissiveIntensity: MAGIC_NUMBERS.LYRICS_FRAME.EMISSIVE_INTENSITY,
    // });
    // bgMaterial.transparent = true;

    const textTexture = await new Promise((resolve) => {
      this.loaders.texture.load(lyricImage, (texture) => {
        resolve(texture);
      });
    });

    textMaterial.map = textTexture;
    textMaterial.transparent = true;

    const scale = [
      MAGIC_NUMBERS.LYRICS_SIZE * lyrics.length,
      MAGIC_NUMBERS.LYRICS_SIZE,
    ];

    const textGeometry = new THREE.PlaneGeometry(...scale);
    // const textGeometryBg = new THREE.PlaneGeometry(...scale);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    // const textMeshBg = new THREE.Mesh(textGeometryBg, bgMaterial);
    textMesh.quaternion.copy(this.camera.quaternion);
    textMesh.rotateY(Math.PI);
    // textMeshBg.position.sub(
    //   cameraDirection
    //     .clone()
    //     .multiplyScalar(MAGIC_NUMBERS.LYRICS_FRAME.FRAME_OFFSET),
    // );
    // textMesh.add(textMeshBg);

    // let testCube = new THREE.Mesh(
    //   new THREE.BoxGeometry(1, 1, 1),
    //   new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    // );
    // console.log(lyrics);

    textMesh.position.copy(new THREE.Vector3(point.x, point.y, point.z));

    textMesh.scale.setX(-1);

    // testCube.position.copy(textMesh.position);
    // this.scene.add(testCube);

    // Little animation for the lyrics :)
    // const material = new THREE.MeshStandardMaterial({
    //   color: MAGIC_NUMBERS.LYRICS_PARTICLE_SYSTEM.COLOR,
    //   emissive: MAGIC_NUMBERS.LYRICS_PARTICLE_SYSTEM.COLOR,
    //   emissiveIntensity: MAGIC_NUMBERS.LYRICS_PARTICLE_SYSTEM.LIGHT_INTENSITY,
    // });
    // const particleSystem = new ParticleSystem(
    //   this.scene,
    //   MAGIC_NUMBERS.LYRICS_PARTICLE_SYSTEM.COUNT,
    //   material,
    //   new THREE.SphereGeometry(MAGIC_NUMBERS.LYRICS_PARTICLE_SYSTEM.SIZE, 8, 8),
    //   MAGIC_NUMBERS.LYRICS_PARTICLE_SYSTEM,
    // );
    // particleSystem.ensureCapacity(
    //   textMesh.position,
    //   MAGIC_NUMBERS.LYRICS_PARTICLE_SYSTEM.DURATION, // Spawn all particles at once, then loop (by doing this, it's more optimized)
    // );

    const textElement = {
      textMesh,
      // direction: cameraDirection,
      gravity: Math.random() * MAGIC_NUMBERS.LYRICS.GRAVITY,
      i: 0,
    };

    // console.log(textMesh);

    this.scene.add(textMesh);

    setTimeout(() => {
      this.scene.remove(textMesh);
      // particleSystem.ensureRemove();
    }, MAGIC_NUMBERS.LYRICS_DISPLAY_TIME * 1000);
    return textElement;
  }

  generateElements() {
    // Floor
    const geometry = new THREE.BoxGeometry(
      MAGIC_NUMBERS.FLOOR_SIZE.X,
      0.1,
      MAGIC_NUMBERS.FLOOR_SIZE.Z,
    );
    const material = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.5,
      metalness: 0.5,
    });
    this.floor = new THREE.Mesh(geometry, material);
    this.floor.position.y = -0.1;
    this.floor.position.z = this.AREA_SIZE.z / 2;
    this.floor.position.x = this.AREA_SIZE.x / 2;

    // Camera spotlight
    this.cameraLight = new THREE.SpotLight(
      0xffffff,
      MAGIC_NUMBERS.CAMERA_LIGHT.INTENSITY,
      100,
      degToRad(MAGIC_NUMBERS.CAMERA_LIGHT.ANGLE),
      0.5,
      MAGIC_NUMBERS.CAMERA_LIGHT.DECAY,
    );
    this.cameraLight.castShadow = true;
    this.cameraLight.shadow.mapSize.width = 1024;
    this.cameraLight.shadow.mapSize.height = 1024;

    // Skybox
    const textures = this.loaders.cubeTexture.load([
      "./assets/textures/skybox/jettelly_space_common_black_LEFT.png",
      "./assets/textures/skybox/jettelly_space_common_black_RIGHT.png",
      "./assets/textures/skybox/jettelly_space_common_black_UP.png",
      "./assets/textures/skybox/jettelly_space_common_black_DOWN.png",
      "./assets/textures/skybox/jettelly_space_common_black_FRONT.png",
      "./assets/textures/skybox/jettelly_space_common_black_BACK.png",
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

    const starGeometry = new THREE.SphereGeometry(
      MAGIC_NUMBERS.SHOOTING_STAR.SIZE *
        ((i + MAGIC_NUMBERS.SHOOTING_STAR.MIN_SIZE) /
          MAGIC_NUMBERS.SHOOTING_STAR.NUMBER),
      16,
      16,
    );
    const starMaterial = new THREE.MeshStandardMaterial({
      color: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR,
      emissive: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR,
      emissiveIntensity: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_LIGHT_INTENSITY,
    });
    const shootingStar = new THREE.Mesh(starGeometry, starMaterial);
    if (last) {
      const light = new THREE.PointLight(
        MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR,
        MAGIC_NUMBERS.SHOOTING_STAR.LIGHT_INTENSITY,
        10,
      );
      light.position.set(0, 0, -0.2);
      shootingStar.add(light);
    }

    this.scene.add(shootingStar);

    this.shootingStars.push(shootingStar);
  }

  async loop(time) {
    this.stats.begin();
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
          star.position.set(
            point.x,
            point.y - MAGIC_NUMBERS.SHOOTING_STAR.OFFSET_Y,
            point.z,
          );
        }
      }
    }

    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    this.cameraLight.target.position
      .copy(this.camera.position)
      .add(cameraDirection);
    this.cameraLight.target.updateMatrixWorld();

    this.particleSystem.ensureCapacity(
      this.shootingStars[0].position.clone(),
      newTime / 1000,
    );

    this.particleSystem.loop(newTime / 1000);

    // textElement.textMeshBg.position.add(newDirection);

    // Render
    this.composer.render();
    this.stats.end();
  }
}
