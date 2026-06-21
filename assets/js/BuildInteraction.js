import { Raycaster, Vector3 } from "three";
import { lerp, randInt } from "./utils/Math.js";
import { MAGIC_NUMBERS } from "./MagicNumbers.js";
import { FireworkManager } from "./Firework.js";

export class BuildInteraction {
  constructor(scene, buildManager, htmlCanvas, camera) {
    this.scene = scene;
    this.buildManager = buildManager;
    this.element = htmlCanvas;
    this.mousePos = null;
    this.sizes = {
      width: this.element.offsetWidth,
      height: this.element.offsetHeight,
    };
    this.raycaster = new Raycaster();
    this.camera = camera;
    this.hoverObjects = [];
    this.click = false;
    this.hoverStopObjects = [];
    this.fireworks = [];
    this.element.addEventListener("mousemove", (e) => this.mouseMove(e));
    this.element.addEventListener("click", (e) => (this.click = true));
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

    // Firework system
    this.fireworkManager = new FireworkManager(scene);

    this.lastAutoFirework = Date.now() / 1000;
  }

  mouseMove(event) {
    this.mousePos = {
      x: (event.clientX / this.sizes.width) * 2 - 1,
      y: (event.clientY / this.sizes.height) * 2 - 1,
    };
  }

  update(delta) {
    if (this.mousePos) {
      this.raycaster.setFromCamera(this.mousePos, this.camera);
      const objects = this.buildManager.builds
        .filter((b) => b.mesh !== null)
        .map((b) => b.mesh);
      let intersects = this.raycaster
        .intersectObjects(objects)
        .map((i) => i.object)
        .filter(
          (e) =>
            e.userData &&
            e.userData.parent &&
            e.userData.parent.children[1] === e, // Check if it's the first child
        )
        .map((o) => o.userData.parent);
      if (intersects.length >= 1) {
        intersects = [intersects[0]]; // Limit to the closest
      }
      for (const hoverObject of this.hoverObjects) {
        if (!intersects.includes(hoverObject)) {
          this.hoverStopObjects.push(hoverObject);
          hoverObject.userData.startScale = hoverObject.scale.x;
          hoverObject.userData.t = 0;
        }
      }
      for (const intersect of intersects) {
        if (!this.hoverObjects.includes(intersect)) {
          intersect.userData.startScale = intersect.scale.x;
          intersect.userData.t = 0;
        }
      }
      this.hoverObjects = [...intersects];
      for (const element of this.hoverObjects) {
        element.userData.t +=
          delta / MAGIC_NUMBERS.BUILD_INTERACTION.HOVER_ANIM_TIME;
        let scale = lerp(
          element.userData.startScale,
          MAGIC_NUMBERS.BUILD_INTERACTION.SCALE_HOVER,
          element.userData.t,
        );
        if (scale > MAGIC_NUMBERS.BUILD_INTERACTION.SCALE_HOVER) {
          scale = MAGIC_NUMBERS.BUILD_INTERACTION.SCALE_HOVER;
        }
        element.scale.set(scale, scale, scale);
      }
      for (const element of this.hoverStopObjects) {
        element.userData.t +=
          delta / MAGIC_NUMBERS.BUILD_INTERACTION.HOVER_ANIM_TIME;
        const scale = lerp(element.userData.startScale, 1, element.userData.t);
        element.scale.set(scale, scale, scale);
      }
      this.hoverStopObjects = this.hoverStopObjects.filter(
        (hoverStopObject) => hoverStopObject.scale.x > 1,
      );
    }
    if (this.click) {
      this.click = false;
      for (const element of this.hoverObjects) {
        const pos = new Vector3();
        element.getWorldPosition(pos);
        this.fireworkManager.launchFirework(
          new Vector3(
            pos.x,
            pos.y + MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK_Y_OFFSET,
            pos.z,
          ),
        );
      }
    }
    if (
      Date.now() / 1000 - this.lastAutoFirework >
      MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.AUTO_INTERVAL
    ) {
      this.lastAutoFirework = Date.now() / 1000;
      const builds = this.buildManager.builds.filter(
        (b) =>
          b.mesh &&
          b.light &&
          b.position.z >
            this.camera.position.z +
              MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.AUTO_Z_OFFSET,
      );
      const build = builds[randInt(0, builds.length)];
      if (build) {
        this.fireworkManager.launchFirework(
          new Vector3(
            build.position.x,
            build.position.y +
              MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK_Y_OFFSET,
            build.position.z,
          ),
        );
      }
    }
    this.fireworkManager.update(delta);
  }
}
