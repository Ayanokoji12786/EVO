import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { WorldState } from '../simulation/worldState';
import type { Organism } from '../simulation/types';
import { geneticDistance } from '../genetics/genome';
import { elevationAtWorld, isWithinWorldDisc } from './terrainMesh';
import hideUrl from '../assets/creature-hide.png';

function hashHue(n: number): number {
  return (n * 137.508) % 360;
}
function genomeHue(org: Organism): number {
  const t = org.genome.traits;
  return (t.size * 53 + t.maxSpeed * 79 + (t.visionRadius / 260) * 137 + t.metabolism * 47 + t.aggression * 101 + t.diet * 173 + (t.wingDevelopment ?? 0) * 211) % 360;
}

/** Shared anatomical mesh; local vertex colors retain eyes, belly and dorsal markings
 * under the per-organism coat color. The low limbs animate on the GPU. */
function buildCreatureGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  function ellipsoid(x: number, y: number, z: number, sx: number, sy: number, sz: number, shade = 1) {
    const geo = new THREE.SphereGeometry(1, 12, 8);
    geo.scale(sx, sy, sz);
    geo.translate(x, y, z);
    const colors = new Float32Array(geo.attributes.position.count * 3).fill(shade);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(geo);
  }
  function limb(a: number[], b: number[], radius: number, shade = 0.8) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const geo = new THREE.CylinderGeometry(radius * 0.65, radius, start.distanceTo(end), 7);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()));
    geo.translate(...start.add(end).multiplyScalar(0.5).toArray());
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(shade), 3));
    parts.push(geo);
  }
  ellipsoid(-0.05, 0.55, 0, 0.62, 0.28, 0.27);
  ellipsoid(0.34, 0.65, 0, 0.28, 0.3, 0.24);
  ellipsoid(0.65, 0.77, 0, 0.28, 0.19, 0.2);
  ellipsoid(0.87, 0.7, 0, 0.21, 0.1, 0.14, 0.8);
  for (const side of [-1, 1]) {
    ellipsoid(0.74, 0.83, side * 0.174, 0.058, 0.05, 0.025, 0.045);
    ellipsoid(0.75, 0.85, side * 0.193, 0.012, 0.013, 0.009, 1.6);
    for (const x of [-0.4, 0.36]) {
      ellipsoid(x, 0.46, side * 0.22, 0.15, 0.22, 0.14);
      limb([x, 0.48, side * 0.22], [x - 0.12, 0.25, side * 0.32], 0.085);
      limb([x - 0.12, 0.25, side * 0.32], [x + 0.06, 0.06, side * 0.32], 0.052);
      ellipsoid(x + 0.13, 0.05, side * 0.32, 0.13, 0.04, 0.07, 0.45);
    }
  }
  for (let i = 0; i < 7; i++) {
    const x = -0.53 - i * 0.13;
    limb([x, 0.54 - i * 0.045, 0], [x - 0.15, 0.5 - i * 0.04, 0], 0.13 * (1 - i / 8));
    ellipsoid(-0.5 + i * 0.14, 0.83, 0, 0.055, 0.1 + i * 0.014, 0.045, 0.52);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  merged.computeVertexNormals();
  merged.scale(1, 1, 1);
  return merged;
}

const MAX_INSTANCES = 6000;

export class CreatureField {
  mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private idToIndex = new Map<number, number>();
  private clock = { value: 0 };

  constructor() {
    const geometry = buildCreatureGeometry();
    const material = new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0, vertexColors: true });
    const hide = new THREE.TextureLoader().load(hideUrl);
    hide.colorSpace = THREE.SRGBColorSpace;
    hide.wrapS = hide.wrapT = THREE.RepeatWrapping;
    hide.anisotropy = 8;
    material.map = hide;
    material.bumpMap = hide;
    material.bumpScale = 0.015;
    material.onBeforeCompile = shader => {
      shader.uniforms.creatureTime = this.clock;
      shader.vertexShader = 'uniform float creatureTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        float phase = creatureTime * 0.3 + instanceMatrix[3].x * 0.13;
        float foot = 1.0 - smoothstep(0.08, 0.45, position.y);
        transformed.x += sin(phase + sign(position.z) * sign(position.x) * 1.57) * foot * 0.12;
        transformed.y += abs(sin(phase)) * foot * 0.035;
      `);
    };
    this.mesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCES);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_INSTANCES * 3), 3);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  /** Rebuilds every instance transform/color for the current tick. Called once per rendered
   * frame — organism count is bounded (see MAX_INSTANCES) so this stays a flat, cheap loop
   * with no per-instance allocation. */
  update(
    world: WorldState,
    options: {
      selectedId: number | null;
      ancestryDescendantIds: Set<number> | null;
      overlays: { species: boolean; genetics: boolean; energy: boolean; vision: boolean };
      evolutionVision: boolean;
      tick: number;
    },
  ) {
    this.idToIndex.clear();
    this.clock.value = options.tick;
    let i = 0;
    const selected = options.selectedId !== null ? world.organisms.get(options.selectedId) : undefined;

    for (const org of world.organisms.values()) {
      if (!org.alive) continue;
      if (!isWithinWorldDisc(world.terrain.worldSize, org.x, org.y, 5)) continue;
      if (i >= MAX_INSTANCES) break;
      this.idToIndex.set(org.id, i);

      const t = org.genome.traits;
      const groundY = elevationAtWorld(world.terrain, org.x, org.y);
      // Diet is already the simulation's real herbivore-to-carnivore trait. A strong
      // predator silhouette makes that behavioural difference readable at a glance,
      // without altering speed, metabolism, combat, or the organism's actual genome.
      const predatorScale = t.diet >= 0.62 ? 1.85 : t.diet >= 0.42 ? 1.2 : 1;
      const scale = Math.max(0.3, t.size) * (world.terrain.worldSize / 1400) * 6 * predatorScale;

      this.dummy.position.set(org.x, groundY, org.y);
      this.dummy.rotation.set(0, -org.heading, 0);
      this.dummy.scale.set(scale * (0.85 + t.diet * 0.3), scale * (0.8 + t.maxSpeed * 0.12), scale * (1.15 - t.diet * 0.3));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      let hue: number;
      if (options.evolutionVision) hue = genomeHue(org);
      else if (options.overlays.species) hue = hashHue(org.speciesId);
      else if (options.overlays.genetics && selected) hue = 220 - Math.min(1, geneticDistance(selected.genome, org.genome) * 2) * 220;
      else if (options.overlays.energy) hue = Math.max(0, Math.min(1, org.energy / org.maxEnergy)) * 110;
      else hue = 24 + (org.speciesId * 17 % 65);

      const dimmed =
        (options.ancestryDescendantIds !== null && !options.ancestryDescendantIds.has(org.id)) ||
        (options.selectedId !== null && options.selectedId !== org.id && !options.overlays.species && !options.evolutionVision);
      const lightness = dimmed ? 22 : 46 + Math.max(0, Math.min(1, org.energy / org.maxEnergy)) * 12;
      this.color.setHSL(hue / 360, dimmed ? 0.25 : 0.62, lightness / 100);
      if (!options.evolutionVision && !options.overlays.species && !options.overlays.genetics && !options.overlays.energy) {
        this.color.setHSL(hue / 360, 0.15 + t.camouflage * 0.15, dimmed ? 0.38 : 0.72);
      }
      this.mesh.setColorAt(i, this.color);

      i++;
    }

    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  indexFor(organismId: number): number | undefined {
    return this.idToIndex.get(organismId);
  }
}
