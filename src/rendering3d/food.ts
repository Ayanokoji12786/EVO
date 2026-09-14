import * as THREE from 'three';
import type { WorldState } from '../simulation/worldState';
import { elevationAtWorld } from './terrainMesh';

const FOOD_COLOR: Record<string, THREE.Color> = {
  plant: new THREE.Color(0x71834b),
  hardShell: new THREE.Color(0x7cc8ff),
  carcass: new THREE.Color(0xd25a46),
};

const MAX_FOOD_INSTANCES = 5000;

/** Small glowing instanced spheres for food/carcasses — one InstancedMesh keeps thousands
 * of renewable food items to a single draw call. */
export class FoodField3D {
  mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();

  constructor() {
    const geometry = new THREE.SphereGeometry(1, 6, 5);
    const material = new THREE.MeshStandardMaterial({ roughness: 1 });
    this.mesh = new THREE.InstancedMesh(geometry, material, MAX_FOOD_INSTANCES);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FOOD_INSTANCES * 3), 3);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  update(world: WorldState, zoom: number) {
    const items = world.food.items;
    const skipPlants = zoom < 0.55 && items.size > 1400;
    let i = 0;
    for (const food of items.values()) {
      if (i >= MAX_FOOD_INSTANCES) break;
      if (skipPlants && food.kind === 'plant' && food.id % 3 !== 0) continue;
      const groundY = elevationAtWorld(world.terrain, food.x, food.y);
      const scale = food.kind === 'plant' ? 2.2 : food.kind === 'hardShell' ? 3.4 : 3.8;
      this.dummy.position.set(food.x, groundY + scale * 0.5, food.y);
      this.dummy.scale.set(scale, scale * (food.kind === 'plant' ? 0.65 : 0.4), scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, FOOD_COLOR[food.kind] ?? FOOD_COLOR.plant);
      i++;
    }
    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

/** Soft translucent ground discs marking active storms — simpler and cheaper than real
 * particle rain, but reads clearly against the 3D terrain from an aerial camera. */
export class StormField3D {
  group = new THREE.Group();
  private discs: THREE.Mesh[] = [];
  private material: THREE.MeshBasicMaterial;
  private geometry = new THREE.CircleGeometry(1, 32);

  constructor() {
    this.geometry.rotateX(-Math.PI / 2);
    this.material = new THREE.MeshBasicMaterial({ color: 0x6fb3ff, transparent: true, opacity: 0.16, depthWrite: false });
  }

  update(world: WorldState, timeSeconds: number) {
    const storms = world.activeStorms;
    while (this.discs.length < storms.length) {
      const disc = new THREE.Mesh(this.geometry, this.material.clone());
      this.group.add(disc);
      this.discs.push(disc);
    }
    while (this.discs.length > storms.length) {
      const disc = this.discs.pop()!;
      this.group.remove(disc);
    }
    storms.forEach((storm, i) => {
      const disc = this.discs[i];
      const groundY = elevationAtWorld(world.terrain, storm.x, storm.y);
      disc.position.set(storm.x, groundY + 1, storm.y);
      disc.scale.setScalar(storm.radius);
      const mat = disc.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.12 + Math.sin(timeSeconds * 2 + i) * 0.04) * storm.intensity;
    });
  }
}
