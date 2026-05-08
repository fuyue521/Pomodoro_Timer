import * as THREE from 'three';

const PARTICLE_COUNT = 800;
const SPAWN_RADIUS = 12;

export function createParticles(scene) {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT); // per-particle speed variation

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Random point in sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 3 + Math.random() * SPAWN_RADIUS;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    velocities[i] = 0.003 + Math.random() * 0.012;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffaa66,
    size: 0.04,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(geometry, material);
  particles.name = 'particles';
  scene.add(particles);

  return { particles, velocities };
}

export function updateParticles(particlesData, deltaTime) {
  const { particles, velocities } = particlesData;
  const positions = particles.geometry.attributes.position.array;
  const dt = Math.min(deltaTime, 0.1); // cap to avoid jumps on tab switch

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Float upward
    positions[i * 3 + 1] += velocities[i] * dt * 60;

    // Small horizontal drift
    positions[i * 3] += (Math.sin(Date.now() * 0.001 + i) * 0.002) * dt * 60;
    positions[i * 3 + 2] += (Math.cos(Date.now() * 0.001 + i) * 0.002) * dt * 60;

    // Reset if too high or strayed too far
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const dist = Math.sqrt(x * x + y * y + z * z);

    if (y > SPAWN_RADIUS || dist > SPAWN_RADIUS + 3) {
      // Respawn at bottom of sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * SPAWN_RADIUS;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = -SPAWN_RADIUS * 0.5 + Math.random() * 2; // spawn lower
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
  }

  particles.geometry.attributes.position.needsUpdate = true;
}

export function setParticleColor(particles, hex) {
  particles.material.color.set(hex);
}

export function getParticleColor(particles) {
  return '#' + particles.material.color.getHexString();
}

