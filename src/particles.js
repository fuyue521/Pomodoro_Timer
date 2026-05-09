import * as THREE from 'three';

const PARTICLE_COUNT = 800;
const SPAWN_RADIUS = 12;
const RING_CLEAR = 2.0;       // min distance from origin in XY during focus
const TRAIL_LEVELS = 3;
const TRAIL_LERP = [0.45, 0.2, 0.07];
const LEVEL_FADE  = [0.55, 0.30, 0.12];  // alpha per level (normal blending)

let mode = 'float';
let globalTransition = 0;
let transition = 0;
let mainGeo, mainMat, mainPoints;
let velocities;
let orbitParams;            // [radius, speed, angle, zDepth, wobbleAmp, wobbleFreq] * 6
let trailPositions;         // ghost positions for trail head placement
let particleTransitions;    // per-particle lerp toward globalTransition
let trailLength = 1.0;      // multiplier for ghost lerp speed (higher = longer tail)

// Triangle trail
let trailTriGeo, trailTriMat, trailTriMesh;
let trailVerts;             // Float32Array: 7200 vertices × 3 = positions
let trailColors;            // Float32Array: 7200 vertices × 4 = RGBA
let particleR = 1, particleG = 0.667, particleB = 0.4; // current particle color (0-1)

const VERT_COUNT = PARTICLE_COUNT * TRAIL_LEVELS * 3;
const UP = new THREE.Vector3(0, 1, 0);
const ALT_UP = new THREE.Vector3(1, 0, 0);

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

    orbitParams[i * 6]     = RING_CLEAR + 0.5 + Math.random() * 5.0;
    orbitParams[i * 6 + 1] = 0.25 + Math.random() * 1.1;
    orbitParams[i * 6 + 2] = Math.random() * Math.PI * 2;
    orbitParams[i * 6 + 3] = (Math.random() - 0.5) * 3.5;
    orbitParams[i * 6 + 4] = 0.1 + Math.random() * 0.7;
    orbitParams[i * 6 + 5] = 0.5 + Math.random() * 2.2;
    particleTransitions[i] = 0;
  }

  // --- Main particles (point sprites) ---
  mainGeo = new THREE.BufferGeometry();
  mainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  mainMat = new THREE.PointsMaterial({
    color: 0xffaa66,
    size: 0.04,
    transparent: true,
    opacity: 0.5,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });
  mainPoints = new THREE.Points(mainGeo, mainMat);
  mainPoints.name = 'particles';
  scene.add(mainPoints);

  // --- Ghost positions (same lerp logic as before, used as triangle origins) ---
  trailPositions = new Float32Array(PARTICLE_COUNT * TRAIL_LEVELS * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    for (let lvl = 0; lvl < TRAIL_LEVELS; lvl++) {
      const idx = (i * TRAIL_LEVELS + lvl) * 3;
      trailPositions[idx]     = positions[i * 3];
      trailPositions[idx + 1] = positions[i * 3 + 1];
      trailPositions[idx + 2] = positions[i * 3 + 2];
    }
  }

  // --- Triangle trail mesh ---
  trailVerts = new Float32Array(VERT_COUNT * 3);
  trailColors = new Float32Array(VERT_COUNT * 4);

  trailTriGeo = new THREE.BufferGeometry();
  trailTriGeo.setAttribute('position', new THREE.BufferAttribute(trailVerts, 3));
  trailTriGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 4));

  trailTriMat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute vec4 color;
      varying vec4 vColor;
      void main() {
        vColor = color;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec4 vColor;
      void main() {
        gl_FragColor = vColor;
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

  trailTriMesh = new THREE.Mesh(trailTriGeo, trailTriMat);
  trailTriMesh.name = 'trails';
  trailTriMesh.frustumCulled = false;
  scene.add(trailTriMesh);

  return mainPoints;
}

export function setParticleMode(newMode) {
  mode = newMode;
}

export function updateParticles(deltaTime) {
  const dt = Math.min(deltaTime, 0.1);
  const positions = mainGeo.attributes.position.array;

  const target = mode === 'orbit' ? 1 : 0;
  const globalSpeed = 1.5;
  globalTransition += (target - globalTransition) * (1 - Math.exp(-globalSpeed * dt));
  transition += (globalTransition - transition) * (1 - Math.exp(-3 * dt));

  const size = mainMat.size;
  const baseHalf = size * 0.707;          // half diagonal of particle square

  const _forward = new THREE.Vector3();
  const _side = new THREE.Vector3();

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const i6 = i * 6;

    // --- Orbit target ---
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
      if (globalTransition > 0.5) {
        // Spawn outside ring during focus
        const sa = Math.random() * Math.PI * 2;
        const sr = RING_CLEAR + 1.5 + Math.random() * (SPAWN_RADIUS - RING_CLEAR);
        fx = sr * Math.cos(sa);
        fy = (Math.random() - 0.5) * 4;
        fz = sr * Math.sin(sa) * (Math.random() > 0.5 ? 1 : -1);
      } else {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 3 + Math.random() * SPAWN_RADIUS;
        fx = r * Math.sin(phi) * Math.cos(theta);
        fy = -SPAWN_RADIUS * 0.5 + Math.random() * 2;
        fz = r * Math.cos(phi);
      }
    }

    // --- Staggered transition ---
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

    // --- Push out of ring area during focus ---
    if (globalTransition > 0.01) {
      const xyDist = Math.sqrt(positions[i3] * positions[i3] + positions[i3 + 1] * positions[i3 + 1]);
      if (xyDist < RING_CLEAR) {
        const push = ((RING_CLEAR - xyDist) / RING_CLEAR) * RING_CLEAR;
        if (xyDist < 0.001) {
          const ra = Math.random() * Math.PI * 2;
          positions[i3] += Math.cos(ra) * push;
          positions[i3 + 1] += Math.sin(ra) * push;
        } else {
          positions[i3] += (positions[i3] / xyDist) * push;
          positions[i3 + 1] += (positions[i3 + 1] / xyDist) * push;
        }
      }
    }

    // --- Ghost lerp ---
    for (let lvl = 0; lvl < TRAIL_LEVELS; lvl++) {
      const ti = (i * TRAIL_LEVELS + lvl) * 3;
      const lerpFactor = 1 - Math.exp(-TRAIL_LERP[lvl] / trailLength * 20 * dt);
      trailPositions[ti]     += (positions[i3]     - trailPositions[ti])     * lerpFactor;
      trailPositions[ti + 1] += (positions[i3 + 1] - trailPositions[ti + 1]) * lerpFactor;
      trailPositions[ti + 2] += (positions[i3 + 2] - trailPositions[ti + 2]) * lerpFactor;
    }

    // --- Triangle trail geometry (chained, length proportional to trailLength) ---
    // Use ghost0 for direction only; triangle lengths are controlled by trailLength
    const gBase = i * TRAIL_LEVELS * 3;
    _forward.set(
      positions[i3]     - trailPositions[gBase],
      positions[i3 + 1] - trailPositions[gBase + 1],
      positions[i3 + 2] - trailPositions[gBase + 2]
    );
    const fwdLen = _forward.length();

    if (fwdLen < 0.0001) {
      // No movement — hide all triangles for this particle
      for (let lvl = 0; lvl < TRAIL_LEVELS; lvl++) {
        const vi = (i * TRAIL_LEVELS + lvl) * 3;
        const ci = (i * TRAIL_LEVELS + lvl) * 3 * 4;
        for (let v = 0; v < 3; v++) {
          trailVerts[(vi + v) * 3]     = positions[i3];
          trailVerts[(vi + v) * 3 + 1] = positions[i3 + 1];
          trailVerts[(vi + v) * 3 + 2] = positions[i3 + 2];
          trailColors[(ci + v) * 4]     = 0;
          trailColors[(ci + v) * 4 + 1] = 0;
          trailColors[(ci + v) * 4 + 2] = 0;
          trailColors[(ci + v) * 4 + 3] = 0;
        }
      }
    } else {
      _forward.divideScalar(fwdLen);

      // Perpendicular for base width
      _side.crossVectors(_forward, Math.abs(_forward.dot(UP)) > 0.99 ? ALT_UP : UP);
      _side.normalize();

      // Chain triangles: each level's apex is the next level's base
      const apexScale = [10, 7, 3];
      let bx = positions[i3], by = positions[i3 + 1], bz = positions[i3 + 2];

      for (let lvl = 0; lvl < TRAIL_LEVELS; lvl++) {
        const vi = (i * TRAIL_LEVELS + lvl) * 3;
        const ci = (i * TRAIL_LEVELS + lvl) * 3 * 4;

        const apexDist = baseHalf * trailLength * apexScale[lvl];
        const fade = LEVEL_FADE[lvl] * t;

        const ax = bx - _forward.x * apexDist;
        const ay = by - _forward.y * apexDist;
        const az = bz - _forward.z * apexDist;

        // v0, v1 = base (aligns with particle diagonal for lvl=0)
        trailVerts[vi * 3]     = bx + _side.x * baseHalf;
        trailVerts[vi * 3 + 1] = by + _side.y * baseHalf;
        trailVerts[vi * 3 + 2] = bz + _side.z * baseHalf;
        trailColors[ci * 4]     = particleR;
        trailColors[ci * 4 + 1] = particleG;
        trailColors[ci * 4 + 2] = particleB;
        trailColors[ci * 4 + 3] = fade;

        const vi1 = vi + 1;
        trailVerts[vi1 * 3]     = bx - _side.x * baseHalf;
        trailVerts[vi1 * 3 + 1] = by - _side.y * baseHalf;
        trailVerts[vi1 * 3 + 2] = bz - _side.z * baseHalf;
        trailColors[(ci + 1) * 4]     = particleR;
        trailColors[(ci + 1) * 4 + 1] = particleG;
        trailColors[(ci + 1) * 4 + 2] = particleB;
        trailColors[(ci + 1) * 4 + 3] = fade;

        // v2 = apex (chain to next level)
        trailVerts[(vi + 2) * 3]     = ax;
        trailVerts[(vi + 2) * 3 + 1] = ay;
        trailVerts[(vi + 2) * 3 + 2] = az;
        trailColors[(ci + 2) * 4]     = particleR;
        trailColors[(ci + 2) * 4 + 1] = particleG;
        trailColors[(ci + 2) * 4 + 2] = particleB;
        trailColors[(ci + 2) * 4 + 3] = 0;

        // Next level's base = this apex
        bx = ax; by = ay; bz = az;
      }
    }
  }

  mainGeo.attributes.position.needsUpdate = true;
  trailTriGeo.attributes.position.needsUpdate = true;
  trailTriGeo.attributes.color.needsUpdate = true;
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

export function setParticleColor(hex) {
  mainMat.color.set(hex);
  const { r, g, b } = hexToRgb(hex);
  particleR = r;
  particleG = g;
  particleB = b;
}

export function getParticleColor() {
  return '#' + mainMat.color.getHexString();
}

export function setParticleSize(size) {
  mainMat.size = size;
}

export function setParticleOpacity(opacity) {
  mainMat.opacity = opacity;
}

export function setTrailLength(factor) {
  trailLength = factor;
}

export function setParticlesVisible(visible) {
  if (mainPoints) mainPoints.visible = visible;
  if (trailTriMesh) trailTriMesh.visible = visible;
}
