import { Camera, Raycaster, Scene, Vector3 } from "three";
import { lerp, randInt } from "./utils/Math.js";
import { GLOBAL_VARIABLES } from "./Globals.js";
import { FireworkManager } from "./Firework.js";
import { BuildManager } from "./BuildManager.js";

/**
 * Location: BuildInteractions.js
 * Handles all build interactions + wraps the fireworkManager
 * Handles:
 * - Hover
 * - Click
 * - Auto-launched fireworks
 */
export class BuildInteraction {
  /**
   * Creates BuildInteraction
   * @param {Scene} scene the scene
   * @param {BuildManager} buildManager the build manager
   * @param {HTMLCanvasElement} htmlCanvas the three.js canvas
   * @param {Camera} camera the camera
   */
  constructor(scene, buildManager, htmlCanvas, camera) {
    /** The scene */
    this.scene = scene;
    /** The BuildManager class */
    this.buildManager = buildManager;
    /** The three.js canvas */
    this.element = htmlCanvas;
    /** The last recorded mouse position */
    this.mousePos = null;
    /** W and H of the canvas */
    this.sizes = {
      width: this.element.offsetWidth,
      height: this.element.offsetHeight,
    };
    /** A Three.js raycaster */
    this.raycaster = new Raycaster();
    /** The scene's camera */
    this.camera = camera;
    /** The objects currently hovered */
    this.hoverObjects = [];
    /** If a click happened since last frame */
    this.click = false;
    /** The objects that are currently playing the hover stop animation */
    this.hoverStopObjects = [];
    /** DELETED: fireworks */
    /** Mousemove event */
    this.element.addEventListener("mousemove", (e) => this.mouseMove(e));
    /** Click event */
    this.element.addEventListener("click", (e) => (this.click = true));
    /** Resize event */
    window.addEventListener(
      "resize",
      () => {
        this.sizes = {
          width: this.element.offsetWidth,
          height: this.element.offsetHeight,
        };
      },
      false,
    );

    /** Firework system */
    this.fireworkManager = new FireworkManager(scene);

    /** Last time an auto firework was launched */
    this.lastAutoFirework = Date.now() / 1000;
  }

  /**
   * Sets the mouse position to the current position
   * @param {MouseEvent} event the html event
   */
  mouseMove(event) {
    this.mousePos = {
      x: (event.clientX / this.sizes.width) * 2 - 1,
      y: (event.clientY / this.sizes.height) * 2 - 1,
    };
  }

  /**
   * Handles the updates (for hover and fireworks)
   * @param {number} delta the delta time
   */
  update(delta) {
    if (this.mousePos) {
      // Set the raycaster pos
      this.raycaster.setFromCamera(this.mousePos, this.camera);
      // Select all the elements we want to check
      const objects = this.buildManager.builds
        .filter((b) => b.mesh !== null)
        .map((b) => b.mesh);
      // Raycast
      let intersects = this.raycaster
        .intersectObjects(objects)
        .map((i) => i.object)
        .filter(
          (e) =>
            e.userData && // Check if it has userData
            e.userData.parent && // Check if it's valid
            e.userData.parent.children[1] === e, // Check if it's the first child
        )
        // Select the parent
        .map((o) => o.userData.parent);
      // Limit to the closest
      if (intersects.length >= 1) {
        intersects = [intersects[0]];
      }
      // Handle when an object is no longer hovered
      for (const hoverObject of this.hoverObjects) {
        if (!intersects.includes(hoverObject)) {
          this.hoverStopObjects.push(hoverObject);
          hoverObject.userData.startScale = hoverObject.scale.x;
          hoverObject.userData.t = 0;
        }
      }
      // Handle when a new object is hovered
      for (const intersect of intersects) {
        if (!this.hoverObjects.includes(intersect)) {
          intersect.userData.startScale = intersect.scale.x;
          intersect.userData.t = 0;
        }
      }
      this.hoverObjects = [...intersects];
      // Handle hovered objects
      for (const element of this.hoverObjects) {
        // Update the current time (for lerp)
        element.userData.t +=
          delta / GLOBAL_VARIABLES.BUILD_INTERACTION.HOVER_ANIM_TIME;
        // Lerp the scale
        let scale = lerp(
          element.userData.startScale,
          GLOBAL_VARIABLES.BUILD_INTERACTION.SCALE_HOVER,
          element.userData.t,
        );
        // Clamp at SCALE_HOVER
        if (scale > GLOBAL_VARIABLES.BUILD_INTERACTION.SCALE_HOVER) {
          scale = GLOBAL_VARIABLES.BUILD_INTERACTION.SCALE_HOVER;
        }
        // Set the scale to the new one
        element.scale.set(scale, scale, scale);
      }
      for (const element of this.hoverStopObjects) {
        // Update the current time (for lerp)
        element.userData.t +=
          delta / GLOBAL_VARIABLES.BUILD_INTERACTION.HOVER_ANIM_TIME;
        const scale = lerp(element.userData.startScale, 1, element.userData.t);
        // Lerp the scale
        element.scale.set(scale, scale, scale);
        // Set the scale to the new one
      }
      // Delete hover stop animation elements where their animation is finished
      this.hoverStopObjects = this.hoverStopObjects.filter(
        (hoverStopObject) => hoverStopObject.scale.x > 1,
      );
    }
    // If the user clicked
    if (this.click) {
      this.click = false;
      for (const element of this.hoverObjects) {
        // Get the click pos
        const pos = new Vector3();
        element.getWorldPosition(pos);
        // Launch a firework at this pos
        this.fireworkManager.launchFirework(
          new Vector3(
            pos.x,
            pos.y + GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK_Y_OFFSET,
            pos.z,
          ),
        );
      }
    }
    // If an auto firework can be launched
    if (
      Date.now() / 1000 - this.lastAutoFirework >
      GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.AUTO_INTERVAL
    ) {
      // Reset the counter
      this.lastAutoFirework = Date.now() / 1000;
      // Filter the builds, so that only builds at a certain distance can be used
      const builds = this.buildManager.builds.filter(
        (b) =>
          b.mesh &&
          b.light &&
          b.position.z >
            this.camera.position.z +
              GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.AUTO_Z_OFFSET,
      );
      // Select a random build
      const build = builds[randInt(0, builds.length)];
      if (build) {
        // Launch a firework
        this.fireworkManager.launchFirework(
          new Vector3(
            build.position.x,
            build.position.y +
              GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK_Y_OFFSET,
            build.position.z,
          ),
        );
      }
    }
    // Update the firework manager
    this.fireworkManager.update(delta);
  }
}
