import * as THREE from 'three';
import { MAGIC_NUMBERS } from './MagicNumbers.js';

export class ParticleSystem {
    constructor(scene, total, material, mesh) {
        this.scene = scene;
        this.count = 0;
        this.total = total;
        this.material = material;
        this.mesh = mesh;
        this.particlesLoops = [];
        this.particleTime = 0;
    }

    ensureCapacity(position, delta) {
        this.particleTime += delta;
        const particlesToAdd = Math.floor(this.particleTime * MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.SPAWN_RATE);
        this.particleTime -= particlesToAdd / MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.SPAWN_RATE;

        for (let i = 0; i < particlesToAdd; i++) {
            this.addParticle(position);
        }
    }

    addParticle(position) {
        if (this.count >= this.total) return;
        const particle = new THREE.Mesh(this.mesh, this.material);
        const randomPositionOffset = new THREE.Vector3(
            (Math.random() - 0.5) * MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.OFFSET_SIZE,
            (Math.random() - 0.5) * MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.OFFSET_SIZE,
            (Math.random() - 0.5) * MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.OFFSET_SIZE
        );
        position.add(randomPositionOffset);
        particle.position.copy(position);
        particle.scale.set(MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.SIZE, MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.SIZE, MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.SIZE);
        const randomTo = new THREE.Vector3(
            (Math.random() - 0.5) * MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.RANDOM_TURBULENCE,
            (Math.random() - 0.5) * MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.RANDOM_TURBULENCE,
            (Math.random() - 0.5) * MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.RANDOM_TURBULENCE
        );

        this.scene.add(particle);
        this.count++;
        let t = 0;
        const duration = MAGIC_NUMBERS.SHOOTING_STAR.PARTICLES.DURATION;
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
