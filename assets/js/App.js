import Stats from "https://cdn.jsdelivr.net/npm/stats.js@0.17.0/+esm";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { degToRad, lerp, randInt } from "./utils/Math.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MAGIC_NUMBERS } from "./MagicNumbers.js";
import { PathGen, Point } from "./PathGen.js";
import { ParticleSystem } from "./ParticleSystem.js";
import { BuildManager } from "./BuildManager.js";
import { Build } from "./Build.js";
import { ProgressBar } from "./Progress.js";
import { Controls } from "./Controls.js";
import { BuildInteraction } from "./BuildInteraction.js";
import { SongSelector } from "./SongSelector.js";
import { SettingsPanel } from "./SettingsPanel.js";

export class LyricsApp {
  AREA_SIZE = MAGIC_NUMBERS.AREA_SIZE;
  constructor(audio, debug = false, seed = 39) {
    if (isNaN(seed)) seed = 39;
    Srand.seed(seed);
    // Audio source
    this.audio = audio;
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
    this.currentTime = 0;

    // Classes
    this.buildManager = new BuildManager();
    this.cameraRotationEaseInOut = {
      start: 0,
      change: 0,
      duration: MAGIC_NUMBERS.ROTATION_TIME,
    };
    this.particleSystems = [];

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

    this.songLength = this.audio.duration;

    this.isIntro = true;

    this.stars = null;
    this.lastCamPos = null;
    this.progress = null;

    this.changeNeeded = null;

    this.stop = false;
    this.init();

    this.canPlay = false;
    this.initOk = false;
    this.start = false;
    this.end = false;

    // Init play/pause btns
    this.initControls();

    // Settings
    this.settings = new SettingsPanel();

    // Song selector
    this.songSelector = new SongSelector(() => this.resume());
  }

  init() {
    this.initOk = true;
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
    document.body.appendChild(this.renderer.domElement);
    this.scene.add(this.camera);

    // Handle composer
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(this.bloomPass);

    // BuildInteraction
    this.buildInteractionManager = new BuildInteraction(
      this.scene,
      this.buildManager,
      this.renderer.domElement,
      this.camera,
    );

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

    for (
      let i = 0;
      i <
      Math.ceil(
        (this.songLength * MAGIC_NUMBERS.POINTS_PER_SECOND) /
          MAGIC_NUMBERS.NUMBER_STEPS_PER_POINTS,
      );
      i++
    ) {
      const z =
        i * MAGIC_NUMBERS.DISTANCE_BETWEEN_POINTS * MAGIC_NUMBERS.GRID_SIZE.Z;
      const minX = Math.max(0, lastX - 1);
      const maxX = Math.min(MAGIC_NUMBERS.POINTS_GEN.MAX_X, lastX + 1);
      const x = randInt(minX, maxX);
      let pos;
      pos = new THREE.Vector3(
        x * MAGIC_NUMBERS.GRID_SIZE.X,
        MAGIC_NUMBERS.POINTS_GEN.FIXED_Y,
        z,
      );
      choosenBuilds.push({
        pos: pos,
      });
      for (
        let j = MAGIC_NUMBERS.POINTS_GEN.BUILDS.MIN_X;
        j <= MAGIC_NUMBERS.POINTS_GEN.BUILDS.MAX_X;
        j++
      ) {
        if (j !== x) {
          if (Math.abs(j - x) === 1) {
            this.buildManager.placeVirtualBuild(
              j * MAGIC_NUMBERS.GRID_SIZE.X,
              z,
              Math.abs(x - j) < MAGIC_NUMBERS.BUILD_LIGHT.MAX_DISTANCE, // If 1 offset from x, can be a light
              Math.abs(x - j),
            );
          } else {
            for (let i = 1; i <= MAGIC_NUMBERS.FAKE_BUILD_LAYER_NUMBER; i++) {
              const max =
                (MAGIC_NUMBERS.DISTANCE_BETWEEN_POINTS *
                  MAGIC_NUMBERS.GRID_SIZE.Z) /
                MAGIC_NUMBERS.FAKE_BUILD_LAYER_NUMBER;
              const zOffset =
                i *
                ((MAGIC_NUMBERS.DISTANCE_BETWEEN_POINTS *
                  MAGIC_NUMBERS.GRID_SIZE.Z) /
                  MAGIC_NUMBERS.FAKE_BUILD_LAYER_NUMBER);
              this.buildManager.placeVirtualBuild(
                j * MAGIC_NUMBERS.GRID_SIZE.X,
                z + zOffset,
                Math.abs(x - j) < MAGIC_NUMBERS.BUILD_LIGHT.MAX_DISTANCE, // If 1 offset from x, can be a light
                Math.abs(x - j),
              );
            }
          }
        }
      }
    }
    const buildPositions = [
      // First point is ignored, so we just put dummy values
      {
        x: 0,
        y: 0,
        z: 0,
      },
    ];
    // Place the custom-defiened intro points
    for (const customPoint of MAGIC_NUMBERS.INTRO.INTRO_CUSTOM_PATH) {
      buildPositions.push({
        x: customPoint.X,
        y: customPoint.Y,
        z: customPoint.Z,
      });
    }

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
          Srand.random() *
            (MAGIC_NUMBERS.PATH_Y.MAX_Y - MAGIC_NUMBERS.PATH_Y.MIN_Y + 1) +
          MAGIC_NUMBERS.PATH_Y.MIN_Y,
        z: build.pos.z + MAGIC_NUMBERS.BUILD_PATH_OFFSET.Z,
        isMiddlePoint: false,
      });
    }
    const endPoint = buildPositions[buildPositions.length - 1];
    buildPositions.push({
      x: MAGIC_NUMBERS.INTRO.OUTRO_END.X,
      y: MAGIC_NUMBERS.INTRO.OUTRO_END.Y,
      z: MAGIC_NUMBERS.INTRO.OUTRO_END.Z + endPoint.z,
    });
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

  playIntro() {
    const material = new THREE.MeshStandardMaterial({
      color: MAGIC_NUMBERS.INTRO.PARTICLE_SYSTEM.COLOR,
      emissive: MAGIC_NUMBERS.INTRO.PARTICLE_SYSTEM.COLOR,
      emissiveIntensity: MAGIC_NUMBERS.INTRO.PARTICLE_SYSTEM.LIGHT_INTENSITY,
    });
    const particleSystem = new ParticleSystem(
      this.scene,
      MAGIC_NUMBERS.INTRO.PARTICLE_SYSTEM.NUMBER,
      material,
      new THREE.SphereGeometry(MAGIC_NUMBERS.INTRO.PARTICLE_SYSTEM.SIZE, 8, 8),
      MAGIC_NUMBERS.INTRO.PARTICLE_SYSTEM,
    );
    const pos = this.camera.position
      .clone()
      .sub(
        new THREE.Vector3(
          MAGIC_NUMBERS.INTRO.PARTICLE_SYSTEM.OFFSET_SIZE.X / 2,
          -MAGIC_NUMBERS.INTRO.PARTICLE_SYSTEM.OFFSET_SIZE.Y / 2,
          MAGIC_NUMBERS.INTRO.PARTICLE_SYSTEM.OFFSET_Z,
        ),
      );
    particleSystem.ensureCapacity(
      pos,
      MAGIC_NUMBERS.INTRO.PARTICLE_SYSTEM.DURATION,
    );
    this.particleSystems.push(particleSystem);
    setTimeout(() => {
      this.particleSystems.splice(
        this.particleSystems.indexOf(particleSystem),
        1,
      );
    }, MAGIC_NUMBERS.INTRO.PARTICLE_SYSTEM.DURATION * 1000);
  }

  async loadedCallback() {
    this.buildPositions = this.getPoints();

    this.floor.geometry.scale(
      MAGIC_NUMBERS.FLOOR_SIZE.X,
      1,
      this.buildPositions[this.buildPositions.length - 2].z +
        MAGIC_NUMBERS.FLOOR_SIZE.OFFSET_Z_END,
    );
    this.floor.position.z =
      this.buildPositions[this.buildPositions.length - 2].z / 2 -
      MAGIC_NUMBERS.FLOOR_SIZE.OFFSET_Z +
      MAGIC_NUMBERS.FLOOR_SIZE.OFFSET_Z_END / 2;

    // this.buildGrid(neededPoints * MAGIC_NUMBERS.GRID_SIZE.Z);

    this.pathGen = new PathGen(
      this.buildPositions,
      this.pathFinder,
      this.pathGrid,
      this,
    );
    const material = new THREE.MeshStandardMaterial({
      color: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR,
      emissive: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_COLOR,
      emissiveIntensity: MAGIC_NUMBERS.SHOOTING_STAR.MATERIAL_LIGHT_INTENSITY,
    });
    const particleSystem = new ParticleSystem(
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
    this.particleSystems.push(particleSystem);
    requestAnimationFrame((d) => this.loopWrapper(d, 0));
  }

  loopWrapper(delta, last) {
    this.currentTime += delta - last;
    this.loop(this.currentTime);
    requestAnimationFrame((d) => this.loopWrapper(d, delta));
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
    const lastRefillZ =
      nextRefillZ -
      MAGIC_NUMBERS.REFILL_INTERVAL -
      MAGIC_NUMBERS.REFILL_INTERVAL_OFFSET;
    this.buildManager.showVirtualBuilds(this.scene, nextRefillZ, lastRefillZ);
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
    if (this.progress) {
      this.progress.spawnLyric(lyrics);
    }
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

    // Make it always visible (so it doesn't get hidden by other objects)
    textMaterial.depthTest = false;
    textMaterial.depthWrite = false;

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
      gravity: Srand.random() * MAGIC_NUMBERS.LYRICS.GRAVITY,
      i: 0,
      scaleY: 0,
    };

    textMesh.scale.y = 0;

    // console.log(textMesh);

    this.scene.add(textMesh);
    return textElement;
  }

  generateElements() {
    // Floor
    const geometry = new THREE.BoxGeometry(1, 0.1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.5,
      metalness: 0.5,
    });
    this.floor = new THREE.Mesh(geometry, material);
    this.floor.position.y = -0.1;
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

  generatePos() {
    return (Srand.random() - 0.5) * MAGIC_NUMBERS.INTRO.XY_BOUNDS;
  }

  generateWarp() {
    this.allStarsDistance = MAGIC_NUMBERS.INTRO.WARP.START_DISTANCE;
    const stars = [];
    const warpMaterial = new THREE.MeshStandardMaterial({
      color: MAGIC_NUMBERS.INTRO.WARP.COLOR,
      transparent: true,
      opacity: MAGIC_NUMBERS.INTRO.WARP.OPACITY,
      emissive: MAGIC_NUMBERS.INTRO.WARP.COLOR,
      emissiveIntensity: MAGIC_NUMBERS.INTRO.WARP.EMISSIVE_INTENSITY,
    });
    for (let i = 0; i < MAGIC_NUMBERS.INTRO.WARP.NUMBER; i++) {
      const star = new THREE.CylinderGeometry(
        MAGIC_NUMBERS.INTRO.WARP.SIZE,
        MAGIC_NUMBERS.INTRO.WARP.SIZE,
        MAGIC_NUMBERS.INTRO.WARP.SIZE,
        20,
      );
      const warpStar = new THREE.Mesh(star, warpMaterial);
      warpStar.userData.z = randInt(0, MAGIC_NUMBERS.INTRO.WARP.MAX_DISTANCE);
      warpStar.userData.y =
        Srand.random() * MAGIC_NUMBERS.INTRO.WARP.DISTANCE.MAX * 2 -
        MAGIC_NUMBERS.INTRO.WARP.DISTANCE.MAX;
      warpStar.userData.x =
        Srand.random() * MAGIC_NUMBERS.INTRO.WARP.DISTANCE.MAX * 2 -
        MAGIC_NUMBERS.INTRO.WARP.DISTANCE.MAX;
      warpStar.scale.z = MAGIC_NUMBERS.INTRO.WARP.SCALE;
      if (
        Math.abs(warpStar.userData.y) > MAGIC_NUMBERS.INTRO.WARP.DISTANCE.MIN ||
        Math.abs(warpStar.userData.x) > MAGIC_NUMBERS.INTRO.WARP.DISTANCE.MIN
      ) {
        this.scene.add(warpStar);
        stars.push(warpStar);
      }
    }
    this.stars = stars;
  }

  moveStars(dt) {
    if (!this.stars) return;
    for (let i = 0; i < this.stars.length; i++) {
      const warpStar = this.stars[i];
      const pos = this.camera.position
        .clone()
        .add(
          new THREE.Vector3(
            warpStar.userData.x,
            warpStar.userData.y,
            warpStar.userData.z,
          ),
        );
      if (pos.z < MAGIC_NUMBERS.INTRO.WARP.STOP_AT) {
        warpStar.position.set(pos.x, pos.y, pos.z - this.allStarsDistance);
        if (this.allStarsDistance < 0) {
          this.allStarsDistance += dt;
        }
        warpStar.userData.z += -MAGIC_NUMBERS.INTRO.WARP.OFFSET_ADD * dt;
        if (pos.z < this.camera.position.z) {
          warpStar.userData.z = randInt(
            0,
            MAGIC_NUMBERS.INTRO.WARP.MAX_DISTANCE,
          );
        }
      } else {
        this.scene.remove(warpStar);
      }
    }
  }
  // for (let i = 0; i < MAGIC_NUMBERS.INTRO.WARP.NUMBER; i++) {
  //   const warpStarGeometry = new THREE.CylinderGeometry(
  //     MAGIC_NUMBERS.INTRO.WARP.SIZE,
  //     MAGIC_NUMBERS.INTRO.WARP.SIZE,
  //     MAGIC_NUMBERS.INTRO.WARP.SIZE,
  //     20,
  //   );

  //   const warpStar = new THREE.Mesh(warpStarGeometry, warpMaterial);
  //   const pos = this.camera.position.clone().add(new THREE.Vector3(0, 0, 0));
  //   warpStar.position.set(pos.x, pos.y, pos.z);
  //   warpStar.userData.init = true;
  //   warpStar.userData.distance =
  //     Srand.random() * MAGIC_NUMBERS.INTRO.WARP.DISTANCE.MAX +
  //     MAGIC_NUMBERS.INTRO.WARP.DISTANCE.MIN;
  //   this.scene.add(warpStar);
  //   this.warpStars.push(warpStar);
  // }

  async loop(time) {
    let bef = Date.now();
    if (this.debug) {
      this.stats.begin();
    }
    // IMPORTANT: The first frame delta is from the time the page started loading, so we need to ignore it to avoid huge jumps in the path
    // Metric in milliseconds
    let newTime = time - this.lastTime;
    // Trick to modify the playback time
    if (this.changeNeeded) {
      newTime += this.changeNeeded;
    }
    this.lastTime = time;
    if (this.isFirstFrame) {
      // for (const lyricAndTime of LYRICS_TEMP) {
      //   setTimeout(() => {
      //     console.log("FIX:", lyricAndTime[1]);
      //   }, lyricAndTime[0]);
      // }
      this.isFirstFrame = false;
      this.generateWarp();
      this.composer.render();
      return;
    }

    if (this.stop) return; // "kill" switch

    if (this.end) {
      if (newTime === 0) {
        newTime = 1;
      }

      const lookAtMatrix = new THREE.Matrix4();
      lookAtMatrix.lookAt(
        this.camera.position,
        new THREE.Vector3(
          MAGIC_NUMBERS.INTRO.INTRO_CUSTOM_PATH[0].X,
          MAGIC_NUMBERS.INTRO.INTRO_CUSTOM_PATH[0].Y,
          MAGIC_NUMBERS.INTRO.OUTRO_END.Z + this.startZ,
        ),
        this.camera.up,
      );

      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
        lookAtMatrix,
      );

      this.camera.quaternion.slerp(targetQuat, 0.05);
      this.camera.position.z +=
        (newTime / 1000) * MAGIC_NUMBERS.INTRO.OUTRO_END.Z;
      if (
        this.camera.position.z >
        MAGIC_NUMBERS.INTRO.OUTRO_END.Z + this.startZ
      ) {
        this.restart();
      }
      // Render
      this.stats.end();
      this.composer.render();
      return;
    }
    this.buildInteractionManager.update(newTime / 1000);
    const [newPos, objective, rail] = this.pathGen.update(
      newTime / 1000,
      this.changeNeeded !== null,
      !this.start,
    );

    if (this.start) {
      for (const build of this.buildManager.builds) {
        this.lightBuild(build, newPos, newTime);
      }
      if (this.isIntro) {
        if (newPos.z > MAGIC_NUMBERS.INTRO.WARP.STOP_AT) {
          this.initProgress();
          this.canPlay = true;
          this.audio.play();
          this.pathGen.currentTime = 0; // Reset the timing for the lyrics
          this.pathGen.unlockLyrics();
          this.isIntro = false;
        }
      } else {
        this.progress.locked = false;
        this.progress.setProgress(
          (this.audio.currentTime / this.audio.duration) * 100,
        );
      }
    }

    // Warp effect

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

    for (const particleSystem of this.particleSystems) {
      particleSystem.ensureCapacity(
        this.shootingStars[0].position.clone(),
        newTime / 1000,
      );

      particleSystem.loop(newTime / 1000);
    }

    // textElement.textMeshBg.position.add(newDirection);
    if (this.isIntro) {
      this.moveStars(newTime / 1000);
    }

    if (this.changeNeeded) {
      this.changeNeeded = null;
    }

    if (
      !this.start &&
      newPos.z > MAGIC_NUMBERS.INTRO.INTRO_CUSTOM_PATH[0].Z / 4
    ) {
      this.pathGen.currentTime = 0;
      this.pathGen.currentPoint = 0;
    }

    if (this.audio.currentTime >= this.audio.duration) {
      this.end = true;
      this.startZ = newPos.z;
    }

    // if (this.debug) {
    //   console.log(this.scene.children.filter((e) => e.name === "Build").length);
    // }
    // Test benchmark
    // if (Date.now() - bef >= 10) {
    //   console.log(Date.now() - bef);
    // }
    // Render
    this.composer.render();
    if (this.debug) {
      this.stats.end();
    }
  }

  lightBuild(build, newPos, newTime) {
    if (build.mesh) {
      // Avoid errors when skipping
      if (
        build.isLight &&
        build.position.z - newPos.z <
          MAGIC_NUMBERS.BUILD_LIGHT.START_AT /
            Math.pow(
              build.distance,
              1 / MAGIC_NUMBERS.BUILD_LIGHT.DISTANCE_DECAY,
            )
      ) {
        // console.log(build.mesh);
        for (const mesh of [
          build.mesh.children[0].children[1],
          // build.mesh.children[0].children[0],
        ]) {
          // const mesh = build.mesh.children[0].children[0];
          mesh.material = Build.LIGHT_MATERIAL.clone();
          mesh.material.emissiveIntensity = 0;
          build.isLight = false;
          build.isLighting = true;
        }
      }
      if (build.isLighting) {
        // const mesh = build.mesh.children[0].children[0];
        for (const mesh of [build.mesh.children[0].children[1]]) {
          mesh.material.emissiveIntensity +=
            (newTime / 1000) * (1 / MAGIC_NUMBERS.BUILD_LIGHT.TIME_TO_FULL);
          if (mesh.material.emissiveIntensity > 1) {
            build.isLighting = false;
            mesh.material.emissiveIntensity = 1;
          }
        }
      }
      if (
        !build.light ||
        build.position.z - this.camera.position.z >
          MAGIC_NUMBERS.BUILD_LIGHT.START_AT
      ) {
        const distance = build.position.z - this.camera.position.z;
        const colorNbr = Math.min(
          distance / MAGIC_NUMBERS.BUILD_SHADER.DISTANCE_TO_WHITE,
          1,
        );
        build.mesh.children[0].children[1].material.color =
          new THREE.Color().setRGB(colorNbr, colorNbr, colorNbr);
        build.mesh.children[0].children[1].material.emissiveIntensity =
          colorNbr / MAGIC_NUMBERS.BUILD_SHADER.EMISSIVE;
      }
    }
  }

  restart() {
    for (const lyric of this.pathGen.lyrics) {
      this.scene.remove(lyric.textMesh);
    }
    this.buildManager.clearBuilds(this.scene);
    document.getElementById("controls").style.display = "none";
    this.isIntro = true;
    this.end = false;
    this.isFirstFrame = true;
    this.start = false;
    this.audio.currentTime = 0;
    this.pathGen = new PathGen(
      this.buildPositions,
      this.pathFinder,
      this.pathGrid,
      this,
    );
    this.controls.playBtnPlayIcon.style.transform = "scale(1)";
    this.controls.playBtnPauseIcon.style.transform = "scale(0)";
    this.controls.isPlaying = false;
    this.canPlay = false;
    this.progress.setProgress(0);
    this.progress.locked = true;
    this.songSelector.isRemoved = true;
    this.songSelector = new SongSelector(() => this.resume());
  }

  initProgress() {
    this.progress = new ProgressBar(
      document.getElementById("progress-bar"),
      {
        speed: MAGIC_NUMBERS.PROGRESS.SPEED,
      },
      (progress) => {
        // Do NOT use the audio as ref, it can desync!
        // const difference =
        //   -this.audio.currentTime + this.audio.duration * progress;
        const difference =
          -this.pathGen.currentTime + progress * this.audio.duration;
        this.changeNeeded = difference * 1000;
        this.audio.currentTime = progress * this.audio.duration;
        if (this.stop) {
          this.controls.playBtnPlayIcon.style.transform = "scale(1)";
          this.controls.playBtnPauseIcon.style.transform = "scale(0)";
          this.resume();
        }
        this.buildManager.clearBuilds(this.scene);
      },
    );
  }
  initControls() {
    this.controls = new Controls(
      document.getElementById("controls"),
      () => this.resume(),
      () => {
        this.audio.pause();
        this.stop = true;
      },
      () => {
        if (this.canPlay) {
          this.resume();
          this.restart();
        }
      },
    );
  }
  resume() {
    if (!this.start) {
      document.getElementById("controls").style.display = "flex";
      this.start = true;
    }
    if (this.canPlay) {
      this.audio.play();
    }
    this.stop = false;
  }
}
