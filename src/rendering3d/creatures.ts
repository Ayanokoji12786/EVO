import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { WorldState } from '../simulation/worldState';
import type { Organism } from '../simulation/types';
import { geneticDistance } from '../genetics/genome';
import { elevationAtWorld } from './terrainMesh';

function hashHue(n: number): number {
  return (n * 137.508) % 360;
}
function genomeHue(org: Organism): number {
  const t = org.genome.traits;
  return (t.size * 53 + t.maxSpeed * 79 + (t.visionRadius / 260) * 137 + t.metabolism * 47 + t.aggression * 101 + t.diet * 173 + (t.wingDevelopment ?? 0) * 211) % 360;
}

/** One shared low-poly creature body (capsule torso + head lobe), oriented along +X so a
 * heading of 0 faces +X in world space. Kept intentionally simple: at the aerial scale this
 * whole population renders at, individual anatomical detail would be invisible — the
 * selected organism gets the detailed genome-driven 2D "hero" portrait instead (see
 * CreatureInspector), so this instanced mesh only needs to read correctly as "an animal."
 */
function buildCreatureGeometry(): THREE.BufferGeometry {
  const body = new THREE.CapsuleGeometry(0.34, 0.55, 3, 8);
  body.rotateZ(Math.PI / 2);
  const head = new THREE.SphereGeometry(0.22, 8, 6);
  head.translate(0.42, 0.05, 0);
  const merged = mergeGeometries([body, head], false);
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

  constructor() {
    const geometry = buildCreatureGeometry();
    const material = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.08, vertexColors: false });
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
    let i = 0;
    const selected = options.selectedId !== null ? world.organisms.get(options.selectedId) : undefined;

    for (const org of world.organisms.values()) {
      if (!org.alive) continue;
      if (i >= MAX_INSTANCES) break;
      this.idToIndex.set(org.id, i);

      const t = org.genome.traits;
      const groundY = elevationAtWorld(world.terrain, org.x, org.y);
      const scale = Math.max(0.3, t.size) * (world.terrain.worldSize / 1400) * 6;

      this.dummy.position.set(org.x, groundY + scale * 0.28, org.y);
      this.dummy.rotation.set(0, -org.heading, 0);
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      let hue: number;
      if (options.evolutionVision) hue = genomeHue(org);
      else if (options.overlays.species) hue = hashHue(org.speciesId);
      else if (options.overlays.genetics && selected) hue = 220 - Math.min(1, geneticDistance(selected.genome, org.genome) * 2) * 220;
      else if (options.overlays.energy) hue = Math.max(0, Math.min(1, org.energy / org.maxEnergy)) * 110;
      else hue = hashHue(org.speciesId);

      const dimmed =
        (options.ancestryDescendantIds !== null && !options.ancestryDescendantIds.has(org.id)) ||
        (options.selectedId !== null && options.selectedId !== org.id && !options.overlays.species && !options.evolutionVision);
      const lightness = dimmed ? 22 : 46 + Math.max(0, Math.min(1, org.energy / org.maxEnergy)) * 12;
      this.color.setHSL(hue / 360, dimmed ? 0.25 : 0.62, lightness / 100);
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
