import * as THREE from 'three';
import { MaterialFinishId } from './types';
import { ProceduralTextureSet } from './textures';

export interface FinishSpec {
  id: MaterialFinishId;
  labelZh: string;
  labelEn: string;
  swatchHex: string;
  heroColor: number;
  heroMetalness: number;
  heroRoughness: number;
  heroClearcoat: number;
  frameColor: number;
  frameMetalness: number;
  frameRoughness: number;
  plinthColor: number;
  plinthRoughness: number;
  accentColor: number;
  accentEmissive: number;
  accentEmissiveIntensity: number;
}

export const FINISH_SPECS: Record<MaterialFinishId, FinishSpec> = {
  brass: {
    id: 'brass',
    labelZh: '香檳拉絲銅',
    labelEn: 'Brushed Brass',
    swatchHex: '#d4a656',
    heroColor: 0xd6a85a,
    heroMetalness: 0.92,
    heroRoughness: 0.24,
    heroClearcoat: 0.15,
    frameColor: 0x2b303a,
    frameMetalness: 0.78,
    frameRoughness: 0.50, // >= 0.26 contrast delta vs hero
    plinthColor: 0xd8d2c7,
    plinthRoughness: 0.88,
    accentColor: 0xf4b95e,
    accentEmissive: 0xd9822b,
    accentEmissiveIntensity: 0.55,
  },
  titanium: {
    id: 'titanium',
    labelZh: '航太霧面鈦',
    labelEn: 'Satin Titanium',
    swatchHex: '#b9c4d1',
    heroColor: 0xc2ccd8,
    heroMetalness: 0.90,
    heroRoughness: 0.26,
    heroClearcoat: 0.12,
    frameColor: 0x222731,
    frameMetalness: 0.68,
    frameRoughness: 0.54,
    plinthColor: 0xc7ccd3,
    plinthRoughness: 0.86,
    accentColor: 0x67d4f5,
    accentEmissive: 0x2299d4,
    accentEmissiveIntensity: 0.65,
  },
  ceramic: {
    id: 'ceramic',
    labelZh: '溫潤骨瓷白',
    labelEn: 'Warm Ceramic',
    swatchHex: '#ebe4d8',
    heroColor: 0xede6da,
    heroMetalness: 0.08,
    heroRoughness: 0.22,
    heroClearcoat: 0.68,
    frameColor: 0x8f7352,
    frameMetalness: 0.84,
    frameRoughness: 0.48,
    plinthColor: 0xc8bfb2,
    plinthRoughness: 0.90,
    accentColor: 0xe6a15c,
    accentEmissive: 0xc97328,
    accentEmissiveIntensity: 0.45,
  },
  cobalt: {
    id: 'cobalt',
    labelZh: '鈷藍烤漆',
    labelEn: 'Cobalt Lacquer',
    swatchHex: '#2f62e0',
    heroColor: 0x2c5fe0,
    heroMetalness: 0.34,
    heroRoughness: 0.18,
    heroClearcoat: 0.88,
    frameColor: 0xced5e0,
    frameMetalness: 0.92,
    frameRoughness: 0.44,
    plinthColor: 0xbfc6d1,
    plinthRoughness: 0.88,
    accentColor: 0x5cc9ff,
    accentEmissive: 0x2d8be6,
    accentEmissiveIntensity: 0.72,
  },
  jade: {
    id: 'jade',
    labelZh: '青瓷玉釉',
    labelEn: 'Celadon Jade',
    swatchHex: '#2e8068',
    heroColor: 0x2d7d64,
    heroMetalness: 0.20,
    heroRoughness: 0.20,
    heroClearcoat: 0.82,
    frameColor: 0xcba158,
    frameMetalness: 0.88,
    frameRoughness: 0.46,
    plinthColor: 0xd0ccc2,
    plinthRoughness: 0.88,
    accentColor: 0x7be0be,
    accentEmissive: 0x2b9e7a,
    accentEmissiveIntensity: 0.55,
  },
};

export interface StudioMaterialBundle {
  hero: THREE.MeshPhysicalMaterial;
  frame: THREE.MeshStandardMaterial;
  plinth: THREE.MeshStandardMaterial;
  dial: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  water: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

export function createStudioMaterialBundle(
  textures: ProceduralTextureSet,
  initialFinish: MaterialFinishId
): StudioMaterialBundle {
  const hero = new THREE.MeshPhysicalMaterial({
    roughnessMap: textures.metalRoughness,
    bumpMap: textures.metalBump,
    bumpScale: 0.008,
    envMapIntensity: 1.25,
  });

  const frame = new THREE.MeshStandardMaterial({
    roughnessMap: textures.metalRoughness,
    bumpMap: textures.metalBump,
    bumpScale: 0.012,
    envMapIntensity: 0.95,
  });

  const plinth = new THREE.MeshStandardMaterial({
    map: textures.stoneMap,
    roughnessMap: textures.stoneRoughness,
    bumpMap: textures.stoneBump,
    bumpScale: 0.018,
    metalness: 0.04,
    envMapIntensity: 0.65,
  });

  const dial = new THREE.MeshStandardMaterial({
    map: textures.dialMap,
    metalness: 0.58,
    roughness: 0.34,
    envMapIntensity: 1.0,
  });

  const accent = new THREE.MeshStandardMaterial({
    metalness: 0.25,
    roughness: 0.18,
    envMapIntensity: 1.2,
  });

  const foliage = new THREE.MeshStandardMaterial({
    color: 0x456b52,
    roughness: 0.84,
    metalness: 0.02,
    envMapIntensity: 0.5,
  });

  const water = new THREE.MeshPhysicalMaterial({
    color: 0x265b73,
    roughness: 0.08,
    metalness: 0.14,
    clearcoat: 0.95,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.4,
  });

  const bundle: StudioMaterialBundle = {
    hero,
    frame,
    plinth,
    dial,
    accent,
    foliage,
    water,
    dispose: () => {
      hero.dispose();
      frame.dispose();
      plinth.dispose();
      dial.dispose();
      accent.dispose();
      foliage.dispose();
      water.dispose();
    },
  };

  applyFinishToBundle(bundle, initialFinish);
  return bundle;
}

export function applyFinishToBundle(bundle: StudioMaterialBundle, finishId: MaterialFinishId): void {
  const spec = FINISH_SPECS[finishId];
  bundle.hero.color.setHex(spec.heroColor);
  bundle.hero.metalness = spec.heroMetalness;
  bundle.hero.roughness = spec.heroRoughness;
  bundle.hero.clearcoat = spec.heroClearcoat;
  bundle.hero.clearcoatRoughness = 0.14;

  bundle.frame.color.setHex(spec.frameColor);
  bundle.frame.metalness = spec.frameMetalness;
  bundle.frame.roughness = spec.frameRoughness;

  bundle.plinth.color.setHex(spec.plinthColor);
  bundle.plinth.roughness = spec.plinthRoughness;

  bundle.accent.color.setHex(spec.accentColor);
  bundle.accent.emissive.setHex(spec.accentEmissive);
  bundle.accent.emissiveIntensity = spec.accentEmissiveIntensity;
}
