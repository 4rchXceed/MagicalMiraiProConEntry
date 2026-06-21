import * as THREE from "three";

/**
 * A particle system utils
 * Can:
 * - ensure the number of particles
 * - remove all particles
 * - add a particle
 * - updates particles
 */
export class ParticleSystem {
  /**
   * Creates ParticleSystem
   * @param {THREE.Scene} scene the main scene
   * @param {number} total max nbr of particles
   * @param {THREE.Material} material Three.js material for the particles
   * @param {THREE.GeometryGroup} geometry Three.js geometry for a particle
   * @param {*} config the config (see Globals.js -> SHOOTING_STAR.PARTICLES)
   */
  constructor(scene, total, material, geometry, config) {
    /** Sets the scene var */
    this.scene = scene;
    /** Stores the current number of particles */
    this.count = 0;
    /** Stores the max number of particles */
    this.total = total;
    /** Stores the material */
    this.material = material;
    /** Stores the geometry of the particle (sphere, box, ...) */
    this.geometry = geometry;
    /** Stores the particle update functions (see addParticle & loop) */
    this.particlesLoops = [];
    /** Time since the particle system's creation */
    this.particleTime = 0;
    /** Config */
    this.config = config;
  }

  /**
   * Checks if there can be more particles, if yes, creates them
   * @param {THREE.Vector3} position the position to add new particles to
   * @param {number} delta delaTime
   */
  ensureCapacity(position, delta) {
    // Updates the particleSystem's lifetime
    this.particleTime += delta;
    // Calculates the number of particles to add
    const particlesToAdd = Math.floor(
      this.particleTime * this.config.SPAWN_RATE,
    );
    this.particleTime -= particlesToAdd / this.config.SPAWN_RATE;

    // Add the missing particles
    for (let i = 0; i < particlesToAdd; i++) {
      this.addParticle(position);
    }
  }

  /**
   * Removes all particles
   */
  ensureRemove() {
    for (let i = 0; i < this.count; i++) {
      // Simulates a time bump of Infinity to all particles, making them deleting themselves
      this.particlesLoops[i](Infinity);
    }
    // Ensure the counter is at 0
    this.count = 0;
  }

  /**
   * Adds a new particle at position
   * @param {THREE.Vector3} position The current particle position
   * @returns {THREE.Mesh} the particle element
   */
  addParticle(position) {
    // Cannot add more than total particles
    if (this.count >= this.total) return;
    // Creates the mesh
    const particle = new THREE.Mesh(this.geometry, this.material.clone());

    particle.position.copy(position);

    // Set the correct size
    particle.scale.set(this.config.SIZE, this.config.SIZE, this.config.SIZE);

    // The final offset of the particle
    const randomTo = new THREE.Vector3(
      (Srand.random() - 0.5) * this.config.RANDOM_TURBULENCE,
      (Srand.random() - 0.5) * this.config.RANDOM_TURBULENCE,
      (Srand.random() - 0.5) * this.config.RANDOM_TURBULENCE,
    );

    // Add the particle to the scene
    this.scene.add(particle);
    // Sync the counter
    this.count++;

    // Particle lifetime
    let t = 0;
    // Particle max lifetime
    const duration = this.config.DURATION;
    // This will be called every frame (dt => DeltaTime)
    this.particlesLoops.push((dt) => {
      // Update the lifetime
      t += dt;

      // Updates the position
      particle.position.add(randomTo.clone().multiplyScalar(dt));
      // Also updates the opacity, so it fades away
      particle.material.opacity = 1 - t / duration;
      // If it reached it's end lifetime
      if (t >= duration) {
        // Remove it
        this.scene.remove(particle);
        this.count--;
        // Return true, so the loop removes it from the particles
        return true;
      }
      // Return false, so the loop removes it from the particles
      return false;
    });
    return particle;
  }

  /**
   * Updates the particles
   * @param {number} dt
   */
  loop(dt) {
    // For each particle
    for (let i = this.particlesLoops.length - 1; i >= 0; i--) {
      // Gets the loop function
      const loop = this.particlesLoops[i];
      // Run it
      const needDelete = loop(dt);
      // If it needs to be deleted, delete it
      if (needDelete) {
        this.particlesLoops.splice(i, 1);
        i--;
      }
    }
  }
}
