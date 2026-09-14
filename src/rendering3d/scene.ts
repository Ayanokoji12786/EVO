import * as THREE from 'three';
import type { ClimateState } from '../simulation/types';
import { sunlightFactor, seasonalFactor } from '../environment/climate';

export interface SceneRig {
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  fillLight: THREE.AmbientLight;
  fog: THREE.Fog;
  starField: THREE.Points;
}

/** Builds the persistent scene graph: lighting rig, atmospheric fog, and a faint starfield
 * that only becomes visible once the sun light drops low (night). */
export function createSceneRig(worldSize: number): SceneRig {
  const scene = new THREE.Scene();

  const fog = new THREE.Fog(0x0a0e14, worldSize * 0.35, worldSize * 1.6);
  scene.fog = fog;

  const sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
  sun.position.set(worldSize * 0.3, worldSize * 0.5, worldSize * 0.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -worldSize * 0.7;
  sun.shadow.camera.right = sun.shadow.camera.top = worldSize * 0.7;
  sun.shadow.camera.far = worldSize * 3;
  sun.shadow.normalBias = 0.8;
  sun.target.position.set(worldSize / 2, 0, worldSize / 2);
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0x9fc3ff, 0x1a2417, 0.55);
  scene.add(hemi);

  const fillLight = new THREE.AmbientLight(0x9bacc5, 0.4);
  scene.add(fillLight);

  const starGeo = new THREE.BufferGeometry();
  const starCount = 800;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const radius = worldSize * (2.2 + Math.random() * 1.5);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85); // keep them mostly above the horizon
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + worldSize * 0.2;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xdfeaff, size: worldSize * 0.0035, transparent: true, opacity: 0 });
  const starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  return { scene, sun, hemi, fillLight, fog, starField };
}

const DAY_SKY = new THREE.Color(0x8fc7ff);
const NIGHT_SKY = new THREE.Color(0x040611);
const DAY_FOG = new THREE.Color(0xaecbe0);
const NIGHT_FOG = new THREE.Color(0x05070d);
const SUMMER_SUN = new THREE.Color(0xfff2d8);
const WINTER_SUN = new THREE.Color(0xcfe0ff);

/** Drives the whole lighting rig from the simulation's own day/night + season state, so
 * "photorealism" here means responding to the actual clock rather than a canned loop. */
export function updateLighting(rig: SceneRig, climate: ClimateState, worldSize: number, renderer: THREE.WebGLRenderer) {
  const light = sunlightFactor(climate);
  const season = seasonalFactor(climate);
  const dayAngle = climate.dayNightProgress * Math.PI * 2 - Math.PI / 2;

  const sunHeight = Math.max(0.05, Math.sin(dayAngle));
  rig.sun.position.set(worldSize / 2 + Math.cos(dayAngle) * worldSize * 0.6, sunHeight * worldSize * 0.7, worldSize * 0.35);
  rig.sun.intensity = 0.25 + light * 1.5;
  rig.sun.color.copy(WINTER_SUN).lerp(SUMMER_SUN, season);

  rig.hemi.intensity = 0.5 + light * 0.55;
  rig.fillLight.intensity = 0.3 + (1 - light) * 0.35;

  const sky = NIGHT_SKY.clone().lerp(DAY_SKY, light);
  renderer.setClearColor(sky, 1);
  rig.fog.color.copy(NIGHT_FOG).lerp(DAY_FOG, light);

  const starMat = rig.starField.material as THREE.PointsMaterial;
  starMat.opacity = Math.max(0, 0.85 - light * 1.4);
}
