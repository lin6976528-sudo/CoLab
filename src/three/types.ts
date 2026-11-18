export type Scene3DType = 'orrery' | 'pavilion' | 'turbine';

export type MaterialFinishId = 'brass' | 'titanium' | 'ceramic' | 'cobalt' | 'jade';

export type LightingPresetId = 'studio' | 'dusk' | 'arctic';

export type CameraPresetId = 'overview' | 'detail' | 'top' | 'low';

export interface PartMetadata {
  id: string;
  labelZh: string;
  labelEn: string;
  materialSpecZh: string;
  materialSpecEn: string;
  category: 'hero' | 'frame' | 'plinth' | 'accent';
}

export interface ScenePresetRecord {
  id: string;
  userId: string;
  name: string;
  sceneType: Scene3DType;
  materialFinish: MaterialFinishId;
  lightingPreset: LightingPresetId;
  explodeAmount: number;
  autoRotate: boolean;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SceneConfigState {
  sceneType: Scene3DType;
  materialFinish: MaterialFinishId;
  lightingPreset: LightingPresetId;
  explodeAmount: number;
  autoRotate: boolean;
  motionPaused: boolean;
}

export const SCENE_CATALOG: Record<
  Scene3DType,
  {
    id: Scene3DType;
    titleZh: string;
    titleEn: string;
    subtitleZh: string;
    subtitleEn: string;
    overviewCamera: { position: [number, number, number]; target: [number, number, number] };
    detailCamera: { position: [number, number, number]; target: [number, number, number] };
    topCamera: { position: [number, number, number]; target: [number, number, number] };
    lowCamera: { position: [number, number, number]; target: [number, number, number] };
  }
> = {
  orrery: {
    id: 'orrery',
    titleZh: '精密天體儀',
    titleEn: 'Kinetic Orrery',
    subtitleZh: '多軸陀螺儀與機械擒縱機構',
    subtitleEn: 'Multi-axis gimbal & escapement',
    overviewCamera: { position: [4.6, 3.2, 5.1], target: [0, 1.55, 0] },
    detailCamera: { position: [2.35, 2.25, 2.55], target: [0, 1.72, 0] },
    topCamera: { position: [0.05, 6.2, 1.2], target: [0, 1.4, 0] },
    lowCamera: { position: [4.2, 0.95, 4.4], target: [0, 1.55, 0] },
  },
  pavilion: {
    id: 'pavilion',
    titleZh: '光之建築亭',
    titleEn: 'Pavilion of Light',
    subtitleZh: '懸臂階地與雙曲拱肋穹頂',
    subtitleEn: 'Cantilever terrace & parabolic ribs',
    overviewCamera: { position: [5.6, 3.5, 5.8], target: [0, 1.15, 0] },
    detailCamera: { position: [2.7, 1.85, 2.9], target: [0, 1.2, 0] },
    topCamera: { position: [0.05, 7.2, 1.4], target: [0, 1.0, 0] },
    lowCamera: { position: [5.1, 0.85, 4.7], target: [0, 1.15, 0] },
  },
  turbine: {
    id: 'turbine',
    titleZh: '航太渦輪扇',
    titleEn: 'Aero Turbofan Rig',
    subtitleZh: '後掠葉片轉子與整流短艙',
    subtitleEn: 'Swept airfoil rotor & cowl rig',
    overviewCamera: { position: [4.8, 2.75, 5.1], target: [0, 1.48, 0] },
    detailCamera: { position: [2.15, 1.82, 2.95], target: [0, 1.52, 0.35] },
    topCamera: { position: [0.05, 6.4, 0.9], target: [0, 1.42, 0] },
    lowCamera: { position: [4.3, 0.88, 4.2], target: [0, 1.48, 0] },
  },
};
