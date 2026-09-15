import * as THREE from 'three';
import type { TerrainGrid } from '../environment/terrain';
import { TerrainTexture } from '../rendering/terrainTexture';
import surfaceUrl from '../assets/terrain-surface.png';
import atlasUrl from '../assets/world-atlas.png';

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

/** The visible planet is a circular crop of the underlying square simulation domain. */
export function isWithinWorldDisc(worldSize: number, x: number, y: number, inset = 0) {
  return Math.hypot(x - worldSize / 2, y - worldSize / 2) <= worldSize / 2 - inset;
}

export class TerrainMesh {
  mesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  atmosphereMesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private texture: THREE.CanvasTexture;
  private atlas: THREE.Texture;
  private textureSource = new TerrainTexture();
  private builtForResolution = -1;
  private segments = 192;

  constructor() {
    this.geometry = new THREE.PlaneGeometry(1, 1, this.segments, this.segments);
    this.geometry.rotateX(-Math.PI / 2);
    this.texture = new THREE.CanvasTexture(this.textureSource.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.atlas = new THREE.TextureLoader().load(atlasUrl);
    this.atlas.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({ map: this.texture, roughness: 0.9, metalness: 0.02 });
    const detail = new THREE.TextureLoader().load(surfaceUrl);
    detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
    detail.repeat.set(32, 32);
    detail.anisotropy = 8;
    material.bumpMap = detail;
    material.bumpScale = 2.5;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.surfaceDetail = { value: detail };
      shader.uniforms.worldAtlas = { value: this.atlas };
      shader.fragmentShader = 'uniform sampler2D surfaceDetail;\nuniform sampler2D worldAtlas;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        // The simulation's grid still owns every biome, while this cinematic atlas supplies
        // the fine rivers, erosion, reefs and cloud shadows a low-resolution grid cannot.
        vec3 atlas = texture2D(worldAtlas, vMapUv).rgb;
        diffuseColor.rgb = mix(atlas, diffuseColor.rgb, 0.30);
        vec3 grain = texture2D(surfaceDetail, vMapUv * 32.0).rgb;
        diffuseColor.rgb *= mix(vec3(0.72), vec3(1.3), grain);
        // Present the world as a bounded planet, not an endless square simulation board.
        if (length(vMapUv - vec2(0.5)) > 0.5) discard;
      `);
    };
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.receiveShadow = true;

    const waterGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMask = radialMaskTexture();
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x176c78,
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.82,
      transmission: 0.25,
      thickness: 2,
      alphaMap: waterMask,
    });
    waterMat.bumpMap = detail;
    waterMat.bumpScale = 0.7;
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);

    // A quiet atmospheric rim gives the disc a physical edge at the furthest camera view.
    const atmosphereGeo = new THREE.RingGeometry(0.502, 0.522, 192);
    atmosphereGeo.rotateX(-Math.PI / 2);
    this.atmosphereMesh = new THREE.Mesh(atmosphereGeo, new THREE.MeshBasicMaterial({
      color: 0x76d8ff,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }));
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
      this.atmosphereMesh.scale.set(grid.worldSize, 1, grid.worldSize);
      this.atmosphereMesh.position.set(grid.worldSize / 2, waterLevel + 1.5, grid.worldSize / 2);
    }
  }

  animateWater(timeSeconds: number) {
    const mat = this.waterMesh.material as THREE.MeshPhysicalMaterial;
    mat.opacity = 0.78 + Math.sin(timeSeconds * 0.6) * 0.03;
  }
}

function radialMaskTexture() {
  const size = 128;
  // Three.js reads the green channel of an alpha map, so retain RGBA rather than using a
  // single-channel texture (which would make every water pixel transparent on some GPUs).
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const distance = Math.hypot(dx, dy);
      const alpha = distance < 0.492 ? 255 : distance < 0.5 ? Math.round((0.5 - distance) / 0.008 * 255) : 0;
      const index = (y * size + x) * 4;
      data[index] = alpha;
      data[index + 1] = alpha;
      data[index + 2] = alpha;
      data[index + 3] = alpha;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}
