import * as THREE from 'three';
import type { WorldState } from '../simulation/worldState';
import type { Camera } from '../rendering/camera';
import { createSceneRig, updateLighting, type SceneRig } from './scene';
import { TerrainMesh, elevationAtWorld, isWithinWorldDisc } from './terrainMesh';
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
  private selectionRings: THREE.Mesh[] = [];
  private visionCone: THREE.Mesh;
  private startTime = performance.now();

  constructor(canvas: HTMLCanvasElement, worldSize: number) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    // PCFSoftShadowMap was removed in current Three.js; PCFShadowMap keeps soft filtered
    // world shadows without emitting a warning on every renderer construction.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    this.rig = createSceneRig(worldSize);
    this.terrain = new TerrainMesh();
    this.rig.scene.add(this.terrain.mesh, this.terrain.waterMesh, this.terrain.atmosphereMesh);
    this.rig.scene.add(this.vegetation.group);

    this.creatures = new CreatureField();
    this.rig.scene.add(this.creatures.mesh);

    this.food = new FoodField3D();
    this.rig.scene.add(this.food.mesh);

    this.storms = new StormField3D();
    this.rig.scene.add(this.storms.group);

    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(.88, 1, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color: i === 1 ? 0x8fffd2 : 0x77e7ff,
        transparent: true,
        opacity: .7,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      ring.visible = false;
      ring.renderOrder = 8 + i;
      this.selectionRings.push(ring);
      this.rig.scene.add(ring);
    }

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
    if (!hit) return null;
    return isWithinWorldDisc(world.config.worldSize, hit.point.x, hit.point.z) ? [hit.point.x, hit.point.z] : null;
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

    this.updateSelectionMarkers(world, options, timeSeconds);

    this.renderer.render(this.rig.scene, camera.three);
  }

  private updateSelectionMarkers(world: WorldState, options: Render3DOptions, timeSeconds: number) {
    const org = options.selectedId !== null ? world.organisms.get(options.selectedId) : undefined;
    if (!org || !org.alive) {
      this.selectionRings.forEach((ring) => { ring.visible = false; });
      this.visionCone.visible = false;
      return;
    }
    const groundY = elevationAtWorld(world.terrain, org.x, org.y);
    const predatorScale = org.genome.traits.diet >= 0.62 ? 1.85 : org.genome.traits.diet >= 0.42 ? 1.2 : 1;
    const scale = Math.max(0.3, org.genome.traits.size) * (world.terrain.worldSize / 1400) * 6 * predatorScale;

    this.selectionRings.forEach((ring, index) => {
      const phase = (timeSeconds * .62 + index / this.selectionRings.length) % 1;
      const pulseScale = scale * (1.35 + phase * .82);
      ring.visible = true;
      ring.position.set(org.x, groundY + .34 + index * .035, org.y);
      ring.scale.setScalar(pulseScale);
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = .62 * Math.pow(1 - phase, 1.35) + .08;
    });

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
