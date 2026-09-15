import * as THREE from 'three';
import type { TerrainGrid } from '../environment/terrain';
import { elevationAtWorld, isWithinWorldDisc } from './terrainMesh';

/** Seed-stable scenery placed only in living biomes, rebuilt after terraforming. */
export class VegetationField {
  group = new THREE.Group();
  private crowns: THREE.InstancedMesh;
  private trunks: THREE.InstancedMesh;
  private grid: TerrainGrid | null = null;
  private dirty = true;

  constructor() {
    const crown = new THREE.IcosahedronGeometry(1, 3);
    const vertices = crown.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
      const ripple = 1 + Math.sin(x * 19 + z * 13) * Math.sin(y * 23 - x * 7) * 0.16;
      vertices.setXYZ(i, x * ripple, y * ripple, z * ripple);
    }
    crown.computeVertexNormals();
    this.crowns = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), 3600);
    this.trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.6, 1, 6), new THREE.MeshStandardMaterial({ color: 0x554734, roughness: 1 }), 1200);
    this.crowns.castShadow = this.crowns.receiveShadow = true;
    this.trunks.castShadow = true;
    this.crowns.count = this.trunks.count = 0;
    this.group.add(this.crowns, this.trunks);
  }

  invalidate() { this.dirty = true; }

  ensure(grid: TerrainGrid) {
    if (grid === this.grid && !this.dirty) return;
    this.grid = grid;
    this.dirty = false;
    const dummy = new THREE.Object3D(), color = new THREE.Color();
    let count = 0;
    const random = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    for (let i = 0; i < 7000 && count < 1200; i++) {
      const x = random(i * 3) * grid.worldSize, z = random(i * 3 + 1) * grid.worldSize;
      if (!isWithinWorldDisc(grid.worldSize, x, z, 12)) continue;
      const cell = Math.min(grid.resolution - 1, Math.floor(z / grid.cellSize)) * grid.resolution + Math.min(grid.resolution - 1, Math.floor(x / grid.cellSize));
      const biome = grid.type[cell];
      if (biome !== 1 && !(biome === 6 && random(i + 88) > 0.5) && !(biome === 0 && random(i + 99) > 0.93)) continue;
      if (grid.elevation[cell] < 0.33) continue;
      const y = elevationAtWorld(grid, x, z), size = 5 + random(i + 44) * 7;
      dummy.position.set(x, y + size * 0.55, z);
      dummy.scale.set(size * 0.18, size * 1.1, size * 0.18);
      dummy.updateMatrix(); this.trunks.setMatrixAt(count, dummy.matrix);
      for (let lobe = 0; lobe < 3; lobe++) {
        dummy.position.set(x + Math.sin(lobe * 2.1) * size * 0.26, y + size * (0.95 + lobe * 0.19), z + Math.cos(lobe * 2.1) * size * 0.26);
        dummy.scale.set(size * 0.62, size * 0.54, size * 0.62);
        dummy.rotation.set(random(i) * 0.2, random(i + lobe) * 6, 0);
        dummy.updateMatrix(); this.crowns.setMatrixAt(count * 3 + lobe, dummy.matrix);
        color.setHSL(0.21 + random(i + 5) * 0.08, 0.25 + random(i) * 0.15, 0.16 + random(i + lobe) * 0.12);
        this.crowns.setColorAt(count * 3 + lobe, color);
      }
      count++;
    }
    this.crowns.count = count * 3; this.trunks.count = count;
    this.crowns.instanceMatrix.needsUpdate = this.trunks.instanceMatrix.needsUpdate = true;
    if (this.crowns.instanceColor) this.crowns.instanceColor.needsUpdate = true;
    this.crowns.computeBoundingSphere(); this.trunks.computeBoundingSphere();
  }
}
