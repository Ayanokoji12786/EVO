import * as THREE from 'three';
import type { WorldState } from '../simulation/worldState';
import type { Camera } from '../rendering/camera';
import { createSceneRig, updateLighting, type SceneRig } from './scene';
import { TerrainMesh, elevationAtWorld } from './terrainMesh';
import { CreatureField } from './creatures';
import { FoodField3D, StormField3D } from './food';
import { VegetationField } from './vegetation';

export interface Render3DOptions {
  selectedId: number | null;
  ancestryDescendantIds: Set<number> | null;
  overlays: { species: boolean; genetics: boolean; energy: boolean; vision: boolean };
  evolutionVision: boolean;
}

/** Owns the whole Three.js scene graph for one world and draws it each frame. This is the
 * 3D replacement for the old flat-canvas `drawFrame` — same job (take world state + camera +
 * options, produce a picture), entirely different renderer underneath. */
export class WorldRenderer3D {
  private renderer: THREE.WebGLRenderer;
  private rig: SceneRig;
  private terrain: TerrainMesh;
  private creatures: CreatureField;
  private food: FoodField3D;
  private storms: StormField3D;
  private vegetation = new VegetationField();
  private selectionRing: THREE.Mesh;
  private visionCone: THREE.Mesh;
  private startTime = performance.now();

  constructor(canvas: HTMLCanvasElement, worldSize: number) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    this.rig = createSceneRig(worldSize);
    this.terrain = new TerrainMesh();
    this.rig.scene.add(this.terrain.mesh, this.terrain.waterMesh);
    this.rig.scene.add(this.vegetation.group);

    this.creatures = new CreatureField();
    this.rig.scene.add(this.creatures.mesh);

    this.food = new FoodField3D();
    this.rig.scene.add(this.food.mesh);

    this.storms = new StormField3D();
    this.rig.scene.add(this.storms.group);

    const ringGeo = new THREE.RingGeometry(0.85, 1, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.selectionRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    this.selectionRing.visible = false;
    this.rig.scene.add(this.selectionRing);

    const coneGeo = new THREE.ConeGeometry(1, 1, 24, 1, true);
    coneGeo.rotateX(Math.PI / 2);
    coneGeo.translate(0, 0, -0.5);
    this.visionCone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
    this.visionCone.visible = false;
    this.rig.scene.add(this.visionCone);
  }

  setSize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
  }

  pickTerrain(camera: Camera, world: WorldState, sx: number, sy: number): [number, number] | null {
    this.terrain.ensure(world.terrain);
    this.terrain.mesh.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(sx / camera.viewportW * 2 - 1, 1 - sy / camera.viewportH * 2), camera.three);
    const hit = ray.intersectObject(this.terrain.mesh, false)[0];
    return hit ? [hit.point.x, hit.point.z] : null;
  }

  /** Forces the terrain mesh/texture to rebuild on the next draw — call after God Mode
   * terraforming edits the terrain grid directly. */
  invalidateTerrain() {
    this.terrain.invalidate();
    this.vegetation.invalidate();
  }

  dispose() {
    const textures = new Set<THREE.Texture>();
    this.rig.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
        material.dispose();
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    textures.forEach(texture => texture.dispose());
    this.rig.sun.shadow.dispose();
    this.renderer.dispose();
  }

  draw(camera: Camera, world: WorldState, options: Render3DOptions) {
    const timeSeconds = (performance.now() - this.startTime) / 1000;
    this.terrain.ensure(world.terrain);
    this.vegetation.ensure(world.terrain);
    this.terrain.animateWater(timeSeconds);
    updateLighting(this.rig, world.climate, world.config.worldSize, this.renderer);

    this.creatures.update(world, {
      selectedId: options.selectedId,
      ancestryDescendantIds: options.ancestryDescendantIds,
      overlays: options.overlays,
      evolutionVision: options.evolutionVision,
      tick: world.tick,
    });
    this.food.update(world, camera.zoom);
    this.storms.update(world, timeSeconds);

    this.updateSelectionMarkers(world, options);

    this.renderer.render(this.rig.scene, camera.three);
  }

  private updateSelectionMarkers(world: WorldState, options: Render3DOptions) {
    const org = options.selectedId !== null ? world.organisms.get(options.selectedId) : undefined;
    if (!org || !org.alive) {
      this.selectionRing.visible = false;
      this.visionCone.visible = false;
      return;
    }
    const groundY = elevationAtWorld(world.terrain, org.x, org.y);
    const scale = Math.max(0.3, org.genome.traits.size) * (world.terrain.worldSize / 1400) * 6;

    this.selectionRing.visible = true;
    this.selectionRing.position.set(org.x, groundY + 0.4, org.y);
    this.selectionRing.scale.setScalar(scale * 1.6);

    const showCone = options.overlays.vision;
    this.visionCone.visible = showCone;
    if (showCone) {
      const t = org.genome.traits;
      const fovRad = (t.fieldOfView * Math.PI) / 180;
      const coneRadius = Math.tan(fovRad / 2) * t.visionRadius;
      this.visionCone.position.set(org.x, groundY + scale * 0.3, org.y);
      this.visionCone.rotation.set(0, -org.heading, 0);
      this.visionCone.scale.set(coneRadius, coneRadius, t.visionRadius);
    }
  }
}
