import * as THREE from 'three';
import type { TerrainGrid } from '../environment/terrain';
import { TerrainTexture } from '../rendering/terrainTexture';
import surfaceUrl from '../assets/terrain-surface.png';

// Relief as a fraction of world size. Dramatic enough to read as real terrain from an
// angled aerial camera; the simulation's own movement/gameplay logic stays on the flat
// (x, y) plane regardless — this is visual texture, not gameplay elevation.
const HEIGHT_SCALE = 0.07;

/** Bilinear-sampled elevation lookup, so the mesh (built at a coarser subdivision than the
 * terrain grid) still reads the same organic relief the simulation itself uses for climate. */
function sampleElevation(grid: TerrainGrid, gx: number, gy: number): number {
  const x0 = Math.max(0, Math.min(grid.resolution - 1, Math.floor(gx)));
  const y0 = Math.max(0, Math.min(grid.resolution - 1, Math.floor(gy)));
  const x1 = Math.min(grid.resolution - 1, x0 + 1);
  const y1 = Math.min(grid.resolution - 1, y0 + 1);
  const fx = gx - x0;
  const fy = gy - y0;
  const at = (x: number, y: number) => grid.elevation[y * grid.resolution + x];
  const top = at(x0, y0) + (at(x1, y0) - at(x0, y0)) * fx;
  const bottom = at(x0, y1) + (at(x1, y1) - at(x0, y1)) * fx;
  return top + (bottom - top) * fy;
}

export function elevationAtWorld(grid: TerrainGrid, worldX: number, worldY: number): number {
  const gx = (worldX / grid.worldSize) * grid.resolution;
  const gy = (worldY / grid.worldSize) * grid.resolution;
  return sampleElevation(grid, gx, gy) * HEIGHT_SCALE * grid.worldSize;
}

export class TerrainMesh {
  mesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private texture: THREE.CanvasTexture;
  private textureSource = new TerrainTexture();
  private builtForResolution = -1;
  private segments = 192;

  constructor() {
    this.geometry = new THREE.PlaneGeometry(1, 1, this.segments, this.segments);
    this.geometry.rotateX(-Math.PI / 2);
    this.texture = new THREE.CanvasTexture(this.textureSource.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({ map: this.texture, roughness: 0.95, metalness: 0.02 });
    const detail = new THREE.TextureLoader().load(surfaceUrl);
    detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
    detail.repeat.set(32, 32);
    detail.anisotropy = 8;
    material.bumpMap = detail;
    material.bumpScale = 2.5;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.surfaceDetail = { value: detail };
      shader.fragmentShader = 'uniform sampler2D surfaceDetail;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        vec3 grain = texture2D(surfaceDetail, vMapUv * 32.0).rgb;
        diffuseColor.rgb *= mix(vec3(0.72), vec3(1.3), grain);
      `);
    };
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.receiveShadow = true;

    const waterGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x176c78,
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.82,
      transmission: 0.25,
      thickness: 2,
    });
    waterMat.bumpMap = detail;
    waterMat.bumpScale = 0.7;
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
  }

  invalidate() {
    this.textureSource.invalidate();
  }

  ensure(grid: TerrainGrid) {
    const needsRebuild = this.textureSource.dirty || this.builtForResolution !== grid.resolution;
    this.textureSource.ensure(grid);
    const heightScale = HEIGHT_SCALE * grid.worldSize;

    if (needsRebuild) {
      this.texture.needsUpdate = true;
      this.mesh.scale.set(grid.worldSize, 1, grid.worldSize);
      this.mesh.position.set(grid.worldSize / 2, 0, grid.worldSize / 2);

      // The mesh is scaled by worldSize on X/Z but left at scale 1 on Y, so vertex Y here
      // must already be in absolute world units (not normalized) — matching
      // elevationAtWorld()'s output exactly, since the water plane and every organism/food
      // instance is positioned using that same function.
      const positions = this.geometry.attributes.position as THREE.BufferAttribute;
      for (let iy = 0; iy <= this.segments; iy++) {
        for (let ix = 0; ix <= this.segments; ix++) {
          const idx = iy * (this.segments + 1) + ix;
          const gx = (ix / this.segments) * grid.resolution;
          const gy = (iy / this.segments) * grid.resolution;
          const h = sampleElevation(grid, gx, gy) * heightScale;
          positions.setY(idx, h);
        }
      }
      positions.needsUpdate = true;
      this.geometry.computeVertexNormals();
      this.builtForResolution = grid.resolution;

      // A single flat water plane beneath the mean water-level reads correctly through the
      // per-vertex relief above it (classic "ocean plane" trick) without needing to mask
      // exactly which triangles are wet.
      const waterLevel = 0.32 * heightScale;
      this.waterMesh.scale.set(grid.worldSize, 1, grid.worldSize);
      this.waterMesh.position.set(grid.worldSize / 2, waterLevel, grid.worldSize / 2);
    }
  }

  animateWater(timeSeconds: number) {
    const mat = this.waterMesh.material as THREE.MeshPhysicalMaterial;
    mat.opacity = 0.78 + Math.sin(timeSeconds * 0.6) * 0.03;
  }
}
