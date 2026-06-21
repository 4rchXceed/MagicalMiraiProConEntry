const { Player } = TextAliveApp;
import Stats from "https://cdn.jsdelivr.net/npm/stats.js@0.17.0/+esm";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { degToRad, lerp, randInt } from "./utils/Math.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLOBAL_VARIABLES } from "./Globals.js";
import { LyricsPathGen, Point } from "./PathGen.js";
import { ParticleSystem } from "./ParticleSystem.js";
import { BuildManager } from "./BuildManager.js";
import { Build } from "./Build.js";
import { ProgressBar } from "./Progress.js";
import { Controls } from "./Controls.js";
import { BuildInteraction } from "./BuildInteraction.js";
import { SongSelector } from "./SongSelector.js";
import { SettingsPanel } from "./SettingsPanel.js";

/**
 * The main app
 */
export class LyricsApp {
  /**
   * Something that isn't relevant, but still needed (for ex. to specify the width of the city's floor)
   */
  AREA_SIZE = GLOBAL_VARIABLES.AREA_SIZE;
  /**
   *The main app, manages (most) ThreeJS stuff.
   * Manages the overall state of the app, the changes between parts (song selector, intro, play, outro)
   * Is the "body" of the app
   * @param {boolean} debug debug mode?
   * @param {number} seed the random seed
   */
  constructor(debug = false, seed = 39) {
    if (isNaN(seed)) seed = 39;
    Srand.seed(seed);
    // /**Audio source*/
    // this.audio = audio;
    /**Data*/
    /**Debug mode*/
    this.debug = debug;

    /**DELETED: usedGrids, modelsLoaded*/
    /**Contains all the part to create the shooting star*/
    this.shootingStars = [];
    /**DELETED: cameraReferencePoint*/
    /**Used to create a delta instead of a time-since start*/
    this.lastTime = 0;
    /**The first frame has an "oversized" delta, this is a small fix*/
    this.isFirstFrame = true;
    /**DELETED: font, texts, zOffset*/
    /**Same as lastTime, but for a different usage*/
    this.currentTime = 0;

    /**Classes*/
    //
    /**Settings*/
    this.settings = new SettingsPanel();

    /**The build manager*/
    this.buildManager = new BuildManager();
    /**DELETED: cameraRotationEaseInOut*/
    /**Pool for all particle systems*/
    this.particleSystems = [];

    /**Not yet initialized attributes*/
    /**All the loaders (textures, 3d models)*/
    this.loaders = null;
    /**DELETED: pathGrid*/
    /**DELETED: pathFinder*/
    this.pathGen = null;

    /**Three.js objects*/
    /**The Three.js scene*/
    this.scene = null;
    /**The camera*/
    this.camera = null;
    /**The WebGL renderer*/
    this.renderer = null;
    /**The city's floor*/
    this.floor = null;
    /**DELETED: cameraLight*/

    /**Instantiates Stat.js if in debug mode*/
    if (this.debug) {
      this.stats = new Stats();
      this.stats.showPanel(0);
      document.body.appendChild(this.stats.dom);
    }

    // Ok a little bit complex here: since (with textalive), we can't get the song that have the max length
    // of the 6 proposed, I checked manually.
    // I need to do this since when the buildings are placed, I don't know which song the user want
    /**The max song length (in seconds) !! HARDCODED */
    this.maxSongLength = 262; // This song's length: https://www.youtube.com/watch?v=RYv4-QCJk4s + 2 seconds

    /**Toggle if it's into (into = warp animation)*/
    this.isIntro = true;

    /**Warp stars*/
    this.stars = null;

    /**The progress bar*/
    this.progress = null;

    /**Used for the progress bar*/
    this.changeNeeded = null;

    /**Pause the app toggle*/
    this.stop = false;

    /**Starts the app initiation*/
    this.init();

    /**Toggle if the resume can play the audio or if it's during isIntro = true*/
    this.canPlay = false;
    /**Is the app init finished?*/
    this.initOk = false;
    /**Did we start the song play*/
    this.start = false;
    /**Did end the song play (finishes the preview)*/
    this.end = false;

    /**Init play/pause btns*/
    this.initControls();

    /**Song selector*/
    this.songSelector = new SongSelector((v) => this.resume(v));

    /** the Textalive app element */
    this.textAliveApp = null;

    /** Playback time (ms) */
    this.textAlivePlaybackTime = 0;

    // Init textalive
    this.initTextalive();
  }

  initTextalive() {
    /** If we are waiting for onVideoReady to be called */
    this.waitingVideoLoad = false;

    // Creates the textalive API
    /** the textalive api class */
    this.textAlivePlayer = new Player({
      app: { token: window.TEXTALIVE_API_TOKEN },
      // We don't want the media to be shown
      mediaElement: document.querySelector("#hidden"),
    });
    this.textAlivePlayer.addListener({
      // By using this, instead of onVideoReady, we are 100% sure that everything is loaded
      onTimerReady: (timer) => {
        if (this.waitingVideoLoad) {
          // Stop instantly, we don't want to play during the intro
          if (this.textAlivePlayer.video) {
            // this.textAlivePlayer.requestPause();
          }
          this.resume();
          this.waitingVideoLoad = false;
        }
      },
      // Set the app property
      onAppReady: (app) => {
        this.textAliveApp = app;
      },
      // On timing update, call pathGen.timeUpdate
      onTimeUpdate: (position) => {
        this.textAlivePlaybackTime = position / 1000;
        if (this.pathGen) {
          this.pathGen.textAliveTimeUpdate(position, this.textAlivePlayer);
        }
      },
    });
  }

  /**
   * Initialize all the "heavy" stuff for the app
   */
  init() {
    this.initOk = true;

    // Loaders
    this.loaders = {
      gltf: new GLTFLoader(),
      cubeTexture: new THREE.CubeTextureLoader(),
      svg: new SVGLoader(),
      texture: new THREE.TextureLoader(),
    };

    // Init Three.js
    this.scene = new THREE.Scene();

    // Creates camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.scene.add(this.camera);

    // Creates renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Creates the composer
    this.composer = new EffectComposer(this.renderer);

    // Bloom effect
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloomPass = new UnrealBloomPass(resolution, 0.5, 0.1, 0.1);
    // Handle composer
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(this.bloomPass);

    // DELETED: "Tweaks"

    // Add the canvas to the HTML
    document.body.appendChild(this.renderer.domElement);

    // Build interaction manager
    this.buildInteractionManager = new BuildInteraction(
      this.scene,
      this.buildManager,
      this.renderer.domElement,
      this.camera,
    );

    // Load models and generate elements
    this.generateElements();

    // Resize event => resize canvas
    window.addEventListener(
      "resize",
      () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
      },
      false,
    );

    // Loads the building models and after that, finishes the initialization
    Build.loadModels(() => this.loadedCallback(), this.loaders);
  }

  // DELETED: enableDebug

  /**
   * Gets the number of points (building rows) needed to cover the entire song
   * @returns {number} (int) the number of points
   */
  getNumberOfPointsNeeded() {
    return Math.ceil(
      (this.maxSongLength * GLOBAL_VARIABLES.POINTS_PER_SECOND) /
        GLOBAL_VARIABLES.NUMBER_STEPS_PER_POINTS,
    );
  }

  /**
   * Generates the points (aka. where the camera will go)
   * @returns
   */
  getPoints() {
    const pointsRaw = [];
    let lastX = 0;

    for (let i = 0; i < this.getNumberOfPointsNeeded(); i++) {
      // Get the z pos
      const z =
        i *
        GLOBAL_VARIABLES.DISTANCE_BETWEEN_POINTS *
        GLOBAL_VARIABLES.GRID_SIZE.Z;

      // Randomize a where the camera will go (bounds of current-1 and current+1)
      const minX = Math.max(0, lastX - 1);
      const maxX = Math.min(GLOBAL_VARIABLES.POINTS_GEN.MAX_X, lastX + 1);
      const x = randInt(minX, maxX);
      let pos;
      // Generates the position
      pos = new THREE.Vector3(
        x * GLOBAL_VARIABLES.GRID_SIZE.X,
        GLOBAL_VARIABLES.POINTS_GEN.FIXED_Y,
        z,
      );
      pointsRaw.push({
        pos: pos,
      });

      // Add the buildings everywhere except where the camera will go
      for (
        let j = GLOBAL_VARIABLES.POINTS_GEN.BUILDS.MIN_X;
        j <= GLOBAL_VARIABLES.POINTS_GEN.BUILDS.MAX_X;
        j++
      ) {
        if (j !== x) {
          // If there's a difference of 1 DO NOT add more buildings than 1 per point, else the camera will go through some buildings
          if (Math.abs(j - x) === 1) {
            this.buildManager.placeVirtualBuild(
              j * GLOBAL_VARIABLES.GRID_SIZE.X,
              z,
              Math.abs(x - j) < GLOBAL_VARIABLES.BUILD_LIGHT.MAX_DISTANCE, // If 1 offset from x, can be a light
              Math.abs(x - j),
            );
          } else {
            // If there's more than 1 grid between the camera path and the building, create some more buildings to give a "full city" feeling
            for (
              let i = 1;
              i <= GLOBAL_VARIABLES.FAKE_BUILD_LAYER_NUMBER;
              i++
            ) {
              const zOffset =
                i *
                ((GLOBAL_VARIABLES.DISTANCE_BETWEEN_POINTS *
                  GLOBAL_VARIABLES.GRID_SIZE.Z) /
                  GLOBAL_VARIABLES.FAKE_BUILD_LAYER_NUMBER);
              this.buildManager.placeVirtualBuild(
                j * GLOBAL_VARIABLES.GRID_SIZE.X,
                z + zOffset,
                Math.abs(x - j) < GLOBAL_VARIABLES.BUILD_LIGHT.MAX_DISTANCE, // If 1 offset from x, can be a light
                Math.abs(x - j),
              );
            }
          }
        }
      }
    }
    const points = [
      // First point is ignored, so we just put dummy values
      {
        x: 0,
        y: 0,
        z: 0,
      },
    ];
    // Place the custom-defiened intro points
    for (const customPoint of GLOBAL_VARIABLES.INTRO.INTRO_CUSTOM_PATH) {
      points.push({
        x: customPoint.X,
        y: customPoint.Y,
        z: customPoint.Z,
      });
    }

    // Generates the points WITH a "y" pos (random)
    for (const build of pointsRaw) {
      points.push({
        x: build.pos.x,
        y:
          Srand.random() *
            (GLOBAL_VARIABLES.PATH_Y.MAX_Y -
              GLOBAL_VARIABLES.PATH_Y.MIN_Y +
              1) +
          GLOBAL_VARIABLES.PATH_Y.MIN_Y,
        z: build.pos.z + GLOBAL_VARIABLES.BUILD_PATH_OFFSET.Z,
      });
    }

    // Add the end points
    const endPoint = points[points.length - 1];
    points.push({
      x: GLOBAL_VARIABLES.INTRO.OUTRO_END.X,
      y: GLOBAL_VARIABLES.INTRO.OUTRO_END.Y,
      z: GLOBAL_VARIABLES.INTRO.OUTRO_END.Z + endPoint.z,
    });
    return points;
  }

  // DELETED: playIntro

  /**
   * Finish the initialization after the buildings 3d model are loaded
   */
  async loadedCallback() {
    // Generates the path points
    this.cameraPathPoints = this.getPoints();

    // Set the *real* floor size
    this.floor.geometry.scale(
      GLOBAL_VARIABLES.FLOOR_SIZE.X,
      1,
      this.cameraPathPoints[this.cameraPathPoints.length - 2].z +
        GLOBAL_VARIABLES.FLOOR_SIZE.OFFSET_Z_END,
    );
    this.floor.position.z =
      this.cameraPathPoints[this.cameraPathPoints.length - 2].z / 2 -
      GLOBAL_VARIABLES.FLOOR_SIZE.OFFSET_Z +
      GLOBAL_VARIABLES.FLOOR_SIZE.OFFSET_Z_END / 2;

    // Initialize the path handler class
    this.pathGen = new LyricsPathGen(this.cameraPathPoints, this);

    // Initialize the shooting star's particle system
    const material = new THREE.MeshStandardMaterial({
      color: GLOBAL_VARIABLES.SHOOTING_STAR.MATERIAL_COLOR,
      emissive: GLOBAL_VARIABLES.SHOOTING_STAR.MATERIAL_COLOR,
      emissiveIntensity:
        GLOBAL_VARIABLES.SHOOTING_STAR.MATERIAL_LIGHT_INTENSITY,
      transparent: true,
    });
    const particleSystem = new ParticleSystem(
      this.scene,
      GLOBAL_VARIABLES.SHOOTING_STAR.PARTICLES.NUMBER,
      material,
      new THREE.SphereGeometry(
        GLOBAL_VARIABLES.SHOOTING_STAR.PARTICLES.SIZE,
        8,
        8,
      ),
      GLOBAL_VARIABLES.SHOOTING_STAR.PARTICLES,
    );
    this.particleSystems.push(particleSystem);

    // Start the main loop
    requestAnimationFrame((d) => this.loopWrapper(d, 0));
  }

  /**
   * Handles the loop and adds some security (ex. exception catching)
   * @param {number} time time since start
   * @param {number} last time since start (last time)
   * @returns Nothing
   */
  loopWrapper(time, last) {
    this.currentTime += time - last;
    try {
      this.loop(this.currentTime);
    } catch {
      location.reload(); // Reload the page in case of unexpected error, so it's cleaner and doesn't crash with infinite loop or something (since it's probably already a fatal error)
      return;
    }
    requestAnimationFrame((d) => this.loopWrapper(d, time));
  }

  /**
   * Basic raycast, used to remove the builds that the camera otherwise go through
   * @param {Point} point the point
   * @param {number} distance until which distance
   * @returns all intersected objects
   */
  raycastForward(point, distance) {
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(point.x, point.y, point.z),
      new THREE.Vector3(0, 0, 1),
      0,
      distance,
    );

    // Select only the builds
    const name = "Build";
    const objects = this.scene.children
      .filter((child) => name === child.name && child.children[0])
      .map((group) => group.children[0]); // Folder with the model -> model itself
    const intersects = raycaster.intersectObjects(objects, true);
    return intersects.map((intersect) => intersect.object);
  }

  // DELETED: getClosest

  /**
   * Converts text to image
   * Works by creating a fake canvas, putting the text inside and returning the image as DataURL
   * I used this since three.js doesn't have a japanese characters
   * @param {string} character one character
   * @returns DataURL of the image
   */
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

  /**
   * Remove old buildings and creates new one
   * Used this so not all buildings are created everytime, but only the ones that we can see.
   * Else we would have 2 FPS
   * @param {number} nextRefillZ
   */
  refill(nextRefillZ) {
    const lastRefillZ =
      nextRefillZ -
      GLOBAL_VARIABLES.REFILL_INTERVAL -
      GLOBAL_VARIABLES.REFILL_INTERVAL_OFFSET;
    // Add new ones
    this.buildManager.showVirtualBuilds(this.scene, nextRefillZ, lastRefillZ);
    // Removes old ones
    this.buildManager.removeBuildsBeforeZ(lastRefillZ);
  }

  /**
   * Generates a lyric's object
   * @param {string} lyrics the character(s)
   * @returns {
     textMesh, // The mesh itself
     scaleY: 0, // The Y scale
   };
   */
  async showLyrics(lyrics) {
    // Creates the lyric on the progress bar
    if (this.progress) {
      this.progress.spawnLyric(lyrics);
    }

    // Calculate the lyric's init position
    const point = new THREE.Vector3(0, 0, -1).unproject(this.camera);

    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    point.add(
      cameraDirection.clone().multiplyScalar(GLOBAL_VARIABLES.LYRICS.DISTANCE),
    );

    // Generates the text image
    const lyricImage = this.generateImageFrontCharacter(lyrics);

    // Creates the text's material
    const textMaterial = new THREE.MeshStandardMaterial({
      color: GLOBAL_VARIABLES.LYRICS_COLOR,
      side: THREE.DoubleSide,
      emissive: GLOBAL_VARIABLES.LYRICS_COLOR,
      emissiveIntensity: GLOBAL_VARIABLES.LYRICS_EMISSIVE_INTENSITY,
    });

    const textTexture = await new Promise((resolve) => {
      this.loaders.texture.load(lyricImage, (texture) => {
        resolve(texture);
      });
    });

    // Make transparent
    textMaterial.map = textTexture;
    textMaterial.transparent = true;

    // Make it always visible (so it doesn't get hidden by other objects)
    textMaterial.depthTest = false;
    textMaterial.depthWrite = false;

    // Calculate the scale
    const scale = [
      GLOBAL_VARIABLES.LYRICS_SIZE * lyrics.length,
      GLOBAL_VARIABLES.LYRICS_SIZE,
    ];

    // Create the actual object
    const textGeometry = new THREE.PlaneGeometry(...scale);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);

    // Sets the correct position + rotation
    textMesh.quaternion.copy(this.camera.quaternion);
    textMesh.rotateY(Math.PI);

    textMesh.position.copy(new THREE.Vector3(point.x, point.y, point.z));

    // By default it's mirrored
    textMesh.scale.setX(-1);

    // Sets the scaleY at 0 so the animation can smoothly move it to 1
    textMesh.scale.y = 0;

    // Create an object with the mesh and some additional datas
    const textElement = {
      textMesh,
      scaleY: 0,
    };

    // Adds to the scene + end
    this.scene.add(textMesh);
    return textElement;
  }

  /**
   * Creates most of ThreeJS's elements
   */
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
    for (let i = 0; i < GLOBAL_VARIABLES.SHOOTING_STAR.NUMBER; i++) {
      this.generateShootingStar(i === 0, i);
    }

    // Place them in the scene
    this.scene.add(this.floor);
    this.scene.background = textures;
  }

  /**
   * Generates 1 shooting star point
   * @param {boolean} last if it's the last point
   * @param {*} i the point nbr
   */
  generateShootingStar(last = false, i) {
    // Shooting Star mesh
    const starGeometry = new THREE.SphereGeometry(
      GLOBAL_VARIABLES.SHOOTING_STAR.SIZE *
        ((i + GLOBAL_VARIABLES.SHOOTING_STAR.MIN_SIZE) /
          GLOBAL_VARIABLES.SHOOTING_STAR.NUMBER),
      16,
      16,
    );
    const starMaterial = new THREE.MeshStandardMaterial({
      color: GLOBAL_VARIABLES.SHOOTING_STAR.MATERIAL_COLOR,
      emissive: GLOBAL_VARIABLES.SHOOTING_STAR.MATERIAL_COLOR,
      emissiveIntensity:
        GLOBAL_VARIABLES.SHOOTING_STAR.MATERIAL_LIGHT_INTENSITY,
    });
    const shootingStar = new THREE.Mesh(starGeometry, starMaterial);

    // Creates a light if it's the last (front) point
    if (last) {
      const light = new THREE.PointLight(
        GLOBAL_VARIABLES.SHOOTING_STAR.MATERIAL_COLOR,
        GLOBAL_VARIABLES.SHOOTING_STAR.LIGHT_INTENSITY,
        10,
      );
      light.position.set(0, 0, -0.2);
      shootingStar.add(light);
    }

    // Add to scene + pool/collection
    this.scene.add(shootingStar);
    this.shootingStars.push(shootingStar);
  }

  // DELETED: generatePos

  /**
   * Generates the elements requires for the warp effect
   */
  generateWarp() {
    // Distance between the camera and the warp's stars, used for to fake the fast that the warp's stars are moving fast
    this.allStarsDistance = GLOBAL_VARIABLES.INTRO.WARP.START_DISTANCE;

    // All warp's stars
    const stars = [];

    // Creates a single material for all of them
    const warpMaterial = new THREE.MeshStandardMaterial({
      color: GLOBAL_VARIABLES.INTRO.WARP.COLOR,
      transparent: true,
      opacity: GLOBAL_VARIABLES.INTRO.WARP.OPACITY,
      emissive: GLOBAL_VARIABLES.INTRO.WARP.COLOR,
      emissiveIntensity: GLOBAL_VARIABLES.INTRO.WARP.EMISSIVE_INTENSITY,
    });
    for (let i = 0; i < GLOBAL_VARIABLES.INTRO.WARP.NUMBER; i++) {
      // Creates the mesh
      const star = new THREE.CylinderGeometry(
        GLOBAL_VARIABLES.INTRO.WARP.SIZE,
        GLOBAL_VARIABLES.INTRO.WARP.SIZE,
        GLOBAL_VARIABLES.INTRO.WARP.SIZE,
        20,
      );
      const warpStar = new THREE.Mesh(star, warpMaterial);

      // Set the star's metadata (base x y and z)
      warpStar.userData.z = randInt(
        0,
        GLOBAL_VARIABLES.INTRO.WARP.MAX_DISTANCE,
      );
      warpStar.userData.y =
        Srand.random() * GLOBAL_VARIABLES.INTRO.WARP.DISTANCE.MAX * 2 -
        GLOBAL_VARIABLES.INTRO.WARP.DISTANCE.MAX;
      warpStar.userData.x =
        Srand.random() * GLOBAL_VARIABLES.INTRO.WARP.DISTANCE.MAX * 2 -
        GLOBAL_VARIABLES.INTRO.WARP.DISTANCE.MAX;
      // Set a "long" scale (appears like a line instead of a sphere)
      warpStar.scale.z = GLOBAL_VARIABLES.INTRO.WARP.SCALE;

      // Do not create a warp star too close to the camera
      if (
        Math.abs(warpStar.userData.y) >
          GLOBAL_VARIABLES.INTRO.WARP.DISTANCE.MIN ||
        Math.abs(warpStar.userData.x) > GLOBAL_VARIABLES.INTRO.WARP.DISTANCE.MIN
      ) {
        this.scene.add(warpStar);
        stars.push(warpStar);
      }
    }
    this.stars = stars;
  }

  /**
   * moves the stars to make the warp effects (called in loop)
   * @param {number} dt DeltaTime
   * @returns Nothing
   */
  moveStars(dt) {
    if (!this.stars) return;

    for (let i = 0; i < this.stars.length; i++) {
      const warpStar = this.stars[i];
      // Create + compute the new pos
      const pos = this.camera.position
        .clone()
        .add(
          new THREE.Vector3(
            warpStar.userData.x,
            warpStar.userData.y,
            warpStar.userData.z,
          ),
        );

      // If it's not too close to the city
      if (pos.z < GLOBAL_VARIABLES.INTRO.WARP.STOP_AT) {
        // Set the new pos
        warpStar.position.set(pos.x, pos.y, pos.z - this.allStarsDistance);
        if (this.allStarsDistance < 0) {
          this.allStarsDistance += dt;
        }
        warpStar.userData.z += -GLOBAL_VARIABLES.INTRO.WARP.OFFSET_ADD * dt;
        // If it's behind the camera, reset the position, to make an infinite loop
        if (pos.z < this.camera.position.z) {
          warpStar.userData.z = randInt(
            0,
            GLOBAL_VARIABLES.INTRO.WARP.MAX_DISTANCE,
          );
        }
      } else {
        // Remove ONLY if the deltaTime is not "too much", else there's a bug where the warp stars disappear when you change your browser's tab
        if (dt < GLOBAL_VARIABLES.INTRO.WARP.TIME_REMOVE_BG) {
          this.scene.remove(warpStar);
        }
      }
    }
  }

  /**
   * The main loop
   * @param {number} time the current time
   * @returns Nothing
   */
  async loop(time) {
    // Used for profiling
    // let bef = Date.now();
    // Calculate the FPS
    if (this.debug) {
      this.stats.begin();
    }
    // Metric in milliseconds
    // Calculate the deltaTime from the total time
    let newTime = time - this.lastTime;
    // Trick to modify the playback time
    if (this.changeNeeded) {
      newTime += this.changeNeeded;
    }
    this.lastTime = time;

    // IMPORTANT: The first frame delta is from the time the page started loading, so we need to ignore it to avoid huge jumps in the path
    if (this.isFirstFrame) {
      this.isFirstFrame = false;
      this.generateWarp();
      this.composer.render();
      return;
    }

    if (this.stop) return; // "kill" switch

    // If it's the end animation
    if (this.end) {
      if (newTime === 0) {
        newTime = 1;
      }

      // Lerp the camera rotation too look to +Z
      const lookAtMatrix = new THREE.Matrix4();
      lookAtMatrix.lookAt(
        this.camera.position,
        new THREE.Vector3(
          GLOBAL_VARIABLES.INTRO.INTRO_CUSTOM_PATH[0].X,
          GLOBAL_VARIABLES.INTRO.INTRO_CUSTOM_PATH[0].Y,
          GLOBAL_VARIABLES.INTRO.OUTRO_END.Z + this.startZ,
        ),
        this.camera.up,
      );

      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
        lookAtMatrix,
      );

      this.camera.quaternion.slerp(targetQuat, 0.05);
      this.camera.position.z +=
        (newTime / 1000) * GLOBAL_VARIABLES.INTRO.OUTRO_END.Z;

      // When the end's animation is over, restart
      if (
        this.camera.position.z >
        GLOBAL_VARIABLES.INTRO.OUTRO_END.Z + this.startZ
      ) {
        this.restart();
      }

      // Debug
      if (this.debug && this.stats) {
        this.stats.end();
      }
      // Render
      this.composer.render();
      return;
    }

    // Update the build's interactions
    this.buildInteractionManager.update(newTime / 1000);

    // Gets and update the new path's Vector3
    const [newPos, objective, rail] = this.pathGen.update(
      newTime / 1000,
      this.changeNeeded !== null,
    );

    // If it's not in the song selector
    if (this.start) {
      // Light-up builds
      for (const build of this.buildManager.builds) {
        this.lightBuild(build, newPos, newTime);
      }

      // If it's in the intro
      if (this.isIntro) {
        // If the intro should end
        if (newPos.z > GLOBAL_VARIABLES.INTRO.WARP.STOP_AT) {
          // Initialize the progress
          this.initProgress();
          // Now the resume can play the audio
          this.canPlay = true;
          // Play the audio
          this.textAlivePlayer.requestMediaSeek(0); // Ensure it's at 0
          this.textAlivePlayer.requestPlay();
          this.pathGen.currentTime = 0; // Reset the timing for the lyrics
          // "Unlock" the lyrics (used so lyrics don't spawn during the intro)
          this.pathGen.unlockLyrics();
          // It's no longer the intro
          this.isIntro = false;
        }
      } else {
        // Re-enable all interactions
        this.progress.locked = false;
        // Set the current song's progress
        this.progress.setProgress(
          (this.textAlivePlaybackTime / this.textAlivePlayer.data.song.length) *
            100,
        );
      }
    }

    // Set the camera's pos to the new calculated Vector3 pos
    this.camera.position.set(newPos.x, newPos.y, newPos.z);

    if (objective) {
      // The camera will look to a point in from of it
      this.camera.lookAt(objective.x, objective.y, objective.z);
      // Update the shooting star's pos
      for (let i = 0; i < rail.length; i++) {
        const point = rail[i];
        const star = this.shootingStars[i];
        if (star) {
          star.position.set(
            point.x,
            point.y - GLOBAL_VARIABLES.SHOOTING_STAR.OFFSET_Y,
            point.z,
          );
        }
      }
    }

    // Update particle systems
    for (const particleSystem of this.particleSystems) {
      particleSystem.ensureCapacity(
        this.shootingStars[0].position.clone(),
        newTime / 1000,
      );

      particleSystem.loop(newTime / 1000);
    }

    // Update warp's effect
    if (this.isIntro) {
      this.moveStars(newTime / 1000);
    }

    // Reset the progress change (see initProgress)
    if (this.changeNeeded) {
      this.changeNeeded = null;
    }

    // Reset the pos to make the animation infinite
    if (
      !this.start &&
      newPos.z > GLOBAL_VARIABLES.INTRO.INTRO_CUSTOM_PATH[0].Z / 4
    ) {
      this.pathGen.currentTime = 0;
      this.pathGen.currentSmoothPoint = 0;
    }

    // If it's the end of the audio, start the end animation
    if (
      this.textAlivePlayer &&
      this.textAlivePlayer.data.song &&
      this.textAlivePlaybackTime >= this.textAlivePlayer.data.song.length
    ) {
      this.end = true;
      this.startZ = newPos.z;
    }

    // Some debug leftover
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

  /**
   * Handle the build lightning
   * @param {Build} build the current build
   * @param {THREE.Vector3} camPos current camera's pos
   * @param {THREE.Vector3} deltaTime deltaTime
   */
  lightBuild(build, camPos, deltaTime) {
    if (build.mesh) {
      // Avoid errors when skipping
      if (
        // If it's lightable
        build.isLight &&
        // ...and if it close enough
        build.position.z - camPos.z <
          GLOBAL_VARIABLES.BUILD_LIGHT.START_AT /
            Math.pow(
              build.distance,
              1 / GLOBAL_VARIABLES.BUILD_LIGHT.DISTANCE_DECAY,
            )
      ) {
        // Start the light animation
        const mesh = build.mesh.children[0].children[1];
        mesh.material = Build.LIGHT_MATERIAL.clone();
        mesh.material.emissiveIntensity = 0;
        build.isLight = false;
        build.isLighting = true;
      }
      // If it's in the light animation
      if (build.isLighting) {
        const mesh = build.mesh.children[0].children[1];

        // Smoothly light up the building
        mesh.material.emissiveIntensity +=
          (deltaTime / 1000) * (1 / GLOBAL_VARIABLES.BUILD_LIGHT.TIME_TO_FULL);

        // If the it's lighted
        if (mesh.material.emissiveIntensity > 1) {
          // Stop the animation
          build.isLighting = false;
          mesh.material.emissiveIntensity = 1;
        }
      }

      // If it's far away, light it a little bit (for the overall ambiance)
      if (
        !build.light ||
        build.position.z - this.camera.position.z >
          GLOBAL_VARIABLES.BUILD_LIGHT.START_AT
      ) {
        const distance = build.position.z - this.camera.position.z;
        const colorNbr = Math.min(
          distance / GLOBAL_VARIABLES.BUILD_SHADER.DISTANCE_TO_WHITE,
          1,
        );

        // Make it just a little bit light
        build.mesh.children[0].children[1].material.color =
          new THREE.Color().setRGB(colorNbr, colorNbr, colorNbr);
        build.mesh.children[0].children[1].material.emissiveIntensity =
          colorNbr / GLOBAL_VARIABLES.BUILD_SHADER.EMISSIVE;
      }
    }
  }

  /**
   * Restart the app, aka reset everything to default
   */
  restart() {
    // Remove all lyrics
    for (const lyric of this.pathGen.lyrics) {
      this.scene.remove(lyric.textMesh);
    }
    // Remove all buildings
    this.buildManager.clearBuilds(this.scene);

    // Hides the controls
    document.getElementById("controls").style.display = "none";

    // Reset variables
    this.isIntro = true;
    this.end = false;
    this.isFirstFrame = true;
    this.start = false;

    // Reset audio playback time
    this.textAlivePlayer.requestPause();
    this.textAlivePlayer.requestMediaSeek(0);

    // Recreate a new path manager, so we don't need to reset it manually
    this.pathGen = new LyricsPathGen(this.cameraPathPoints, this);

    // Reset the controls vars
    this.controls.playBtnPlayIcon.style.transform = "scale(1)";
    this.controls.playBtnPauseIcon.style.transform = "scale(0)";
    this.controls.isPlaying = false;
    this.canPlay = false;

    // Reset the progress's vars
    this.progress.setProgress(0);
    this.progress.locked = true;

    // And also recreate the textalive API class
    this.initTextalive();

    // Reset the song selector, by creating a new one
    this.songSelector.isRemoved = true;
    this.songSelector = new SongSelector((v) => this.resume(v));
  }

  /**
   * Initialize the progress bar
   */
  initProgress() {
    this.progress = new ProgressBar(
      document.getElementById("progress-bar"),
      {
        // Speed of the lyrics
        speed: GLOBAL_VARIABLES.PROGRESS.SPEED,
      },
      (progress) => {
        // Do NOT use the audio as ref, it can desync!
        // Here we use a little "hacky" thing, we set the deltaTime to a the difference needed to go to the progress we want, so we don't have to modify everything manually
        // It's not very good to do that, but it saves so much time
        const difference =
          -this.pathGen.currentTime +
          progress * this.textAlivePlayer.data.song.length;
        this.changeNeeded = difference * 1000;
        // Ignore all the lyrics until currentChar is set correctly (see PathGen.js -> update)
        this.pathGen.ignoreNextLyrics = true;
        // Change the playback time in textalive too
        this.textAlivePlayer.requestMediaSeek(
          progress * this.textAlivePlayer.data.song.length * 1000,
        );

        if (this.stop) {
          this.controls.playBtnPlayIcon.style.transform = "scale(1)";
          this.controls.playBtnPauseIcon.style.transform = "scale(0)";
          this.resume();
        }

        // Also remove all builds, to avoid performance + states issues
        this.buildManager.clearBuilds(this.scene);
      },
    );
  }

  /**
   * Init the controls
   */
  initControls() {
    this.controls = new Controls(
      document.getElementById("controls"),
      // Resume function
      () => this.resume(),
      // Pause function
      () => {
        this.textAlivePlayer.requestPause();
        this.stop = true;
      },
      // Reset/restart function
      () => {
        if (this.canPlay) {
          this.resume();
          this.restart();
        }
      },
    );
  }

  /**
   * Resume the playback
   */
  resume(textaliveDatas = null) {
    if (textaliveDatas) {
      this.waitingVideoLoad = true;
      this.textAlivePlayer.createFromSongUrl(
        textaliveDatas.URL,
        textaliveDatas.DATAS,
      );
      return;
    }
    // If it's not yet started, show the controls and start it
    if (!this.start) {
      document.getElementById("controls").style.display = "flex";
      this.start = true;
    }
    // Play the audio ONLY when it's started + init is finished
    if (this.canPlay) {
      this.textAlivePlayer.requestPlay();
    }
    this.stop = false;
  }
}
