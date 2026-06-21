import * as THREE from "three";
import { GLOBAL_VARIABLES } from "./Globals.js";

/**
 * Represent a firework, can create particles and be updated
 */
class Firework {
  /**
   * Creates the Firework
   * @param {THREE.Vector3} pos the start position
   * @param {THREE.Scene} scene the main scene
   */
  constructor(pos, scene) {
    /** Sets the pos, and add an offset to it */
    this.position = pos;
    this.position.y += GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK_Y_OFFSET;
    /** Stores the scene var */
    this.scene = scene;
    /** is the firework dead? */
    this.isDead = false;
    /** For how long has the firework been alive */
    this.lifetime = 0;
    /** The single first particle that simulates the rocket */
    this.trailParticle = this.createParticle(this.position);

    /** The particles used in the explosion */
    this.explosionParticles = [];
    /** If it already exploded */
    this.exploded = false;
    /** x velocity multiplicator, so to goes right or left (randomly) */
    this.xMult = Math.random() > 0.5 ? 1 : -1;
  }

  /**
   * Creates a particle (color: random)
   * @param {THREE.Vector3} pos position of the particle
   * @returns {THREE.Mesh} the particle (as three.js object)
   */
  createParticle(pos) {
    // Creates a random color
    const color = new THREE.Color().setRGB(
      Math.random(),
      Math.random(),
      Math.random(),
    ); // Do not use sRand, since it's a user-def. action
    // material
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.INTENSITY,
    });
    // Sphere
    const geometry = new THREE.SphereGeometry(
      GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.PARTICLE_RADIUS,
      8,
      8,
    );

    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);

    // Add it to the scene
    this.scene.add(mesh);

    // And set the position
    mesh.position.set(pos.x, pos.y, pos.z);

    return mesh;
  }

  /**
   * Update loop
   * @param {number} dt DeltaTime (time since last frame)
   */
  update(dt) {
    // Add to the lifetime
    this.lifetime += dt;
    // If it hasn't exploded
    if (!this.exploded) {
      // Updates the position
      this.position.y +=
        GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.UNIT_PER_SECOND * dt;
      // /2 so the rocket goes at a 45° angles
      this.position.x +=
        ((GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.UNIT_PER_SECOND * dt) /
          2) *
        this.xMult;
      // Sets the new pos
      this.trailParticle.position.set(
        this.position.x,
        this.position.y,
        this.position.z,
      );

      // If it's time to explode
      if (
        this.lifetime > GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.LIFETIME
      ) {
        // Explode
        this.explode();
      }
    }
    // If it's time to remove the firework (die)
    if (
      this.lifetime >
      GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.LIFETIME +
        GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.EXPLOSION_LIFETIME
    ) {
      this.die();
    }

    // Update the explosion particles' position (by adding their velocity, should be "direction")
    for (const explosionParticle of this.explosionParticles) {
      explosionParticle.position.add(explosionParticle.userData.velocity);
    }
  }

  /**
   * Removes (gently) the particles
   */
  die() {
    // Doesn't remove everything instantly
    let i = 0;
    // Instantly remove the trail particle (since it's the first one)
    this.scene.remove(this.trailParticle);
    for (const explosionParticle of this.explosionParticles) {
      // setTimeout since the sync is not important here, it's just decoration
      setTimeout(() => {
        this.scene.remove(explosionParticle);
      }, i * 10);
      i++;
    }
    // And then set the particle as dead (so the manager can remove it from the loop)
    setTimeout(() => {
      this.isDead = true;
    }, i * 10);
  }

  /**
   * Generates the explosion particles
   */
  explode() {
    // Set the exploded flag
    this.exploded = true;
    // Generates NBR_PARTICLES particles
    for (
      let i = 0;
      i <= GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.NBR_PARTICLES;
      i++
    ) {
      // Gets a random velocity
      const velocity = new THREE.Vector3(
        THREE.MathUtils.randFloat(
          -GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.VELOCITY,
          GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.VELOCITY,
        ),
        THREE.MathUtils.randFloat(
          -GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.VELOCITY,
          GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.VELOCITY,
        ),
        THREE.MathUtils.randFloat(
          -GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.VELOCITY,
          GLOBAL_VARIABLES.BUILD_INTERACTION.FIREWORK.VELOCITY,
        ),
      );
      // Creates the particle
      const mesh = this.createParticle(this.position);

      // Assign the velocity, and add it to the explosion particle collection
      mesh.userData.velocity = velocity;
      this.explosionParticles.push(mesh);
    }
  }
}

// Exported class
/**
 * The class that manages all the fireworks (handles updates and launch)
 */
export class FireworkManager {
  /**
   * Creates FireworkManager
   * @param {THREE.Scene} scene the main scene
   */
  constructor(scene) {
    /**The list of fireworks (to update) */
    this.fireworks = [];
    /**"Saves" the main scene var */
    this.scene = scene;
  }

  /**
   * Launch/create a firework at pos
   * @param {THREE.Vector3} pos the position where the firework is launched
   */
  launchFirework(pos) {
    // Instantiate the firework
    const firework = new Firework(pos, this.scene);
    // Add it to the collection
    this.fireworks.push(firework);
  }

  /**
   * Updates all fireworks, and removes the dead ones
   * @param {number} dt DeltaTime
   */
  update(dt) {
    // Updates all fireworks
    this.fireworks.forEach((f) => f.update(dt));
    // Removes the dead ones
    this.fireworks = this.fireworks.filter((e) => !e.isDead);
  }
}
