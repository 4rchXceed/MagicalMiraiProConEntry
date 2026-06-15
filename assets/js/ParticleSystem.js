import * as THREE from "three";
import { MAGIC_NUMBERS } from "./MagicNumbers.js";

export class ParticleSystem {
  constructor(scene, total, material, mesh, config) {
    this.scene = scene;
    this.count = 0;
    this.total = total;
    this.material = material;
    this.mesh = mesh;
    this.particlesLoops = [];
    this.particleTime = 0;
    this.config = config;
  }

  ensureCapacity(position, delta) {
    this.particleTime += delta;
    const particlesToAdd = Math.floor(
      this.particleTime * this.config.SPAWN_RATE,
    );
    this.particleTime -= particlesToAdd / this.config.SPAWN_RATE;

    for (let i = 0; i < particlesToAdd; i++) {
      this.addParticle(position);
    }
  }

  ensureRemove() {
    for (let i = 0; i < this.count; i++) {
      this.particlesLoops[i](Infinity);
    }
    this.count = 0;
  }

  addParticle(position) {
    if (this.count >= this.total) return;
    const particle = new THREE.Mesh(this.mesh, this.material);
    const randomPositionOffset = new THREE.Vector3(
      (Srand.random() - 0.5) * this.config.OFFSET_SIZE.X,
      (Srand.random() - 0.5) * this.config.OFFSET_SIZE.Y,
      (Srand.random() - 0.5) * this.config.OFFSET_SIZE.Z,
    );
    position.add(randomPositionOffset);
    particle.position.copy(position);
    particle.scale.set(this.config.SIZE, this.config.SIZE, this.config.SIZE);
    const randomTo = new THREE.Vector3(
      (Srand.random() - 0.5) * this.config.RANDOM_TURBULENCE,
      (Srand.random() - 0.5) * this.config.RANDOM_TURBULENCE,
      (Srand.random() - 0.5) * this.config.RANDOM_TURBULENCE,
    );

    this.scene.add(particle);
    this.count++;
    let t = 0;
    const duration = this.config.DURATION;
    this.particlesLoops.push((dt) => {
      t += dt;
      particle.position.add(randomTo.clone().multiplyScalar(dt));
      particle.material.opacity = 1 - t / duration;
      if (t >= duration) {
        this.scene.remove(particle);
        this.count--;
        return true;
      }
      return false;
    });
    return particle;
  }

  loop(dt) {
    for (let i = this.particlesLoops.length - 1; i >= 0; i--) {
      const loop = this.particlesLoops[i];
      const needDelete = loop(dt);
      if (needDelete) {
        this.particlesLoops.splice(i, 1);
      }
    }
  }
}
