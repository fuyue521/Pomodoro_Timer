import * as THREE from 'three';

const PARTICLE_COUNT = 800;
const SPAWN_RADIUS = 12;
const TRAIL_LEVELS = 3;
const TRAIL_LERP = [0.45, 0.2, 0.07];

let mode = 'float';
let globalTransition = 0;
let transition = 0;
let mainGeo, mainMat, mainPoints;
let trailGeo, trailMat, trailPoints;
let velocities;
let orbitParams;            // [radius, speed, angle, zDepth, wobbleAmp, wobbleFreq] * 6
let trailPositions;
let particleTransitions;    // per-particle lerp toward globalTransition
let trailLength = 1.0;      // multiplier for trail lerp (higher = longer tail)

export function createParticles(scene) {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  velocities = new Float32Array(PARTICLE_COUNT);
  orbitParams = new Float32Array(PARTICLE_COUNT * 6);
  particleTransitions = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 3 + Math.random() * SPAWN_RADIUS;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    velocities[i] = 0.003 + Math.random() * 0.012;

    // Orbit params — swirl in XY plane (screen plane), Z for depth
    orbitParams[i * 6]     = 1.0 + Math.random() * 6.0;
    orbitParams[i * 6 + 1] = 0.25 + Math.random() * 1.1;
    orbitParams[i * 6 + 2] = Math.random() * Math.PI * 2;
    orbitParams[i * 6 + 3] = (Math.random() - 0.5) * 3.5;
    orbitParams[i * 6 + 4] = 0.1 + Math.random() * 0.7;
    orbitParams[i * 6 + 5] = 0.5 + Math.random() * 2.2;
    particleTransitions[i] = 0;
  }

  // --- Main particles ---
  mainGeo = new THREE.BufferGeometry();
  mainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  mainMat = new THREE.PointsMaterial({
    color: 0xffaa66,
    size: 0.04,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  mainPoints = new THREE.Points(mainGeo, mainMat);
  mainPoints.name = 'particles';
  scene.add(mainPoints);

  // --- Trail particles ---
  trailPositions = new Float32Array(PARTICLE_COUNT * TRAIL_LEVELS * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    for (let lvl = 0; lvl < TRAIL_LEVELS; lvl++) {
      const idx = (i * TRAIL_LEVELS + lvl) * 3;
      trailPositions[idx]     = positions[i * 3];
      trailPositions[idx + 1] = positions[i * 3 + 1];
      trailPositions[idx + 2] = positions[i * 3 + 2];
    }
  }
  trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailMat = new THREE.PointsMaterial({
    color: 0xffaa66,
    size: 0.022,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  trailPoints = new THREE.Points(trailGeo, trailMat);
  trailPoints.name = 'trails';
  scene.add(trailPoints);

  return { particles: mainPoints, mainPoints, trailPoints, trailGeo };
}

export function setParticleMode(newMode) {
  mode = newMode;
}

export function updateParticles(particlesData, deltaTime) {
  const dt = Math.min(deltaTime, 0.1);
  const positions = mainGeo.attributes.position.array;

  // Global target
  const target = mode === 'orbit' ? 1 : 0;
  const globalSpeed = 1.5;
  globalTransition += (target - globalTransition) * (1 - Math.exp(-globalSpeed * dt));

  // Smooth blend for trail opacity
  transition += (globalTransition - transition) * (1 - Math.exp(-3 * dt));
  trailMat.opacity = transition * 0.16;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const i6 = i * 6;

    // --- Orbit target: Starry Night swirl in XY plane ---
    orbitParams[i6 + 2] += orbitParams[i6 + 1] * dt;
    const angle = orbitParams[i6 + 2];
    const baseR = orbitParams[i6];
    const wobble = Math.sin(angle * orbitParams[i6 + 5]) * orbitParams[i6 + 4];
    const oRadius = baseR + wobble;
    const ox = oRadius * Math.cos(angle);
    const oy = oRadius * Math.sin(angle);
    const oz = orbitParams[i6 + 3] + Math.sin(angle * 0.7 + i * 0.1) * 0.4;

    // --- Float position ---
    let fx = positions[i3];
    let fy = positions[i3 + 1] + velocities[i] * dt * 60;
    let fz = positions[i3 + 2];

    fx += Math.sin(Date.now() * 0.001 + i) * 0.002 * dt * 60;
    fz += Math.cos(Date.now() * 0.001 + i) * 0.002 * dt * 60;

    const dist = Math.sqrt(fx * fx + fy * fy + fz * fz);
    if (fy > SPAWN_RADIUS || dist > SPAWN_RADIUS + 3) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * SPAWN_RADIUS;
      fx = r * Math.sin(phi) * Math.cos(theta);
      fy = -SPAWN_RADIUS * 0.5 + Math.random() * 2;
      fz = r * Math.cos(phi);
    }

    // --- Per-particle staggered transition ---
    const dx = ox - fx;
    const dy = oy - fy;
    const dz = oz - fz;
    const distToOrbit = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const attractSpeed = 0.15 + 2.8 / (1.0 + distToOrbit);
    particleTransitions[i] += (globalTransition - particleTransitions[i]) * (1 - Math.exp(-attractSpeed * dt));

    const t = particleTransitions[i];
    positions[i3]     = fx + (ox - fx) * t;
    positions[i3 + 1] = fy + (oy - fy) * t;
    positions[i3 + 2] = fz + (oz - fz) * t;

    // --- Trail ---
    for (let lvl = 0; lvl < TRAIL_LEVELS; lvl++) {
      const ti = (i * TRAIL_LEVELS + lvl) * 3;
      const lerpFactor = 1 - Math.exp(-TRAIL_LERP[lvl] / trailLength * 20 * dt);
      trailPositions[ti]     += (positions[i3]     - trailPositions[ti])     * lerpFactor;
      trailPositions[ti + 1] += (positions[i3 + 1] - trailPositions[ti + 1]) * lerpFactor;
      trailPositions[ti + 2] += (positions[i3 + 2] - trailPositions[ti + 2]) * lerpFactor;
    }
  }

  mainGeo.attributes.position.needsUpdate = true;
  trailGeo.attributes.position.needsUpdate = true;
}

export function setParticleColor(particles, hex) {
  mainMat.color.set(hex);
  trailMat.color.set(hex);
}

export function getParticleColor(particles) {
  return '#' + mainMat.color.getHexString();
}

export function setParticleSize(size) {
  mainMat.size = size;
  trailMat.size = size * 0.55;
}

export function getParticleSize() {
  return mainMat.size;
}

export function setParticleOpacity(opacity) {
  mainMat.opacity = opacity;
}

export function getParticleOpacity() {
  return mainMat.opacity;
}

export function setTrailLength(factor) {
  trailLength = factor;
}
