import * as THREE from "three";
import { MAGIC_NUMBERS } from "./MagicNumbers.js";

class Firework {
  constructor(pos, scene) {
    this.position = pos;
    this.position.y += MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK_Y_OFFSET;
    this.scene = scene;
    this.isDead = false;
    this.lifetime = 0;
    this.trailParticle = this.createParticle(this.position);

    this.explosionParticles = [];
    this.nextLifetime = 0;
    this.exploded = false;
    this.xMult = Math.random() > 0.5 ? 1 : -1;
  }

  createParticle(pos) {
    const color = new THREE.Color().setRGB(
      Math.random(),
      Math.random(),
      Math.random(),
    ); // Do not use sRand, since it's a user-def. action
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.INTENSITY,
    });
    const geometry = new THREE.SphereGeometry(
      MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.PARTICLE_RADIUS,
      8,
      8,
    );

    const mesh = new THREE.Mesh(geometry, material);

    this.scene.add(mesh);

    mesh.position.set(pos.x, pos.y, pos.z);

    return mesh;
  }

  update(dt) {
    this.lifetime += dt;
    if (!this.exploded) {
      // if (
      //   this.lifetime >
      //   this.nextLifetime *
      //     (MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.LIFETIME /
      //       MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.NBR_TRAIL)
      // ) {
      //   this.trailParticles.push(this.createParticle(this.position));
      //   this.nextLifetime++;
      // }
      this.position.y +=
        MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.UNIT_PER_SECOND * dt;
      this.position.x +=
        ((MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.UNIT_PER_SECOND * dt) / 2) *
        this.xMult;
      this.trailParticle.position.set(
        this.position.x,
        this.position.y,
        this.position.z,
      );

      if (this.lifetime > MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.LIFETIME) {
        this.explode();
      }
    }
    if (
      this.lifetime >
      MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.LIFETIME +
        MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.EXPLOSION_LIFETIME
    ) {
      this.die();
    }
    for (const explosionParticle of this.explosionParticles) {
      explosionParticle.position.add(explosionParticle.userData.velocity);
    }
  }

  die() {
    let i = 0;
    this.scene.remove(this.trailParticle);
    for (const explosionParticle of this.explosionParticles) {
      setTimeout(() => {
        this.scene.remove(explosionParticle);
      }, i * 10);
      i++;
    }
    setTimeout(() => {
      this.isDead = true;
    }, i * 10);
  }

  explode() {
    this.exploded = true;
    for (
      let i = 0;
      i <= MAGIC_NUMBERS.BUILD_INTERACTION.FIREWORK.NBR_PARTICLES;
      i++
    ) {
      const velocity = new THREE.Vector3(
        THREE.MathUtils.randFloat(-0.05, 0.05),
        THREE.MathUtils.randFloat(-0.05, 0.05),
        THREE.MathUtils.randFloat(-0.05, 0.05),
      );
      const mesh = this.createParticle(this.position);

      mesh.userData.velocity = velocity;
      this.explosionParticles.push(mesh);
    }
  }
}

// Exported class

export class FireworkManager {
  constructor(scene) {
    this.fireworks = [];
    this.scene = scene;
  }
  launchFirework(pos) {
    const firework = new Firework(pos, this.scene);
    this.fireworks.push(firework);
  }

  update(dt) {
    this.fireworks.forEach((f) => f.update(dt));
    this.fireworks = this.fireworks.filter((e) => !e.isDead);
  }
}
