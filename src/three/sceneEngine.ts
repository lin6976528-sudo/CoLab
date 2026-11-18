import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CameraPresetId,
  LightingPresetId,
  MaterialFinishId,
  PartMetadata,
  SCENE_CATALOG,
  Scene3DType,
} from './types';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import {
  applyFinishToBundle,
  createStudioMaterialBundle,
  StudioMaterialBundle,
} from './materials';
import { buildProceduralScene, BuiltSceneModel } from './proceduralModels';

// Module-scope pre-allocated math objects to prevent GC churn inside render ticks
const _pointer = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
_raycaster.layers.set(1);
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _tmpVec = new THREE.Vector3();

interface LightingPresetSpec {
  background: number;
  fogDensity: number;
  floorColor: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  keyColor: number;
  keyIntensity: number;
  keyPos: [number, number, number];
  rimColor: number;
  rimIntensity: number;
  exposure: number;
}

const LIGHTING_SPECS: Record<LightingPresetId, LightingPresetSpec> = {
  studio: {
    background: 0x0f1219,
    fogDensity: 0.032,
    floorColor: 0x151923,
    hemiSky: 0xd9e8ff,
    hemiGround: 0x262933,
    hemiIntensity: 0.72,
    keyColor: 0xfff3de,
    keyIntensity: 2.35,
    keyPos: [5.5, 8.2, 4.8],
    rimColor: 0x8bb8ff,
    rimIntensity: 0.95,
    exposure: 1.08,
  },
  dusk: {
    background: 0x17121b,
    fogDensity: 0.036,
    floorColor: 0x1d1621,
    hemiSky: 0xffc699,
    hemiGround: 0x251b2e,
    hemiIntensity: 0.65,
    keyColor: 0xffb677,
    keyIntensity: 2.5,
    keyPos: [6.4, 5.4, 3.8],
    rimColor: 0x7e8cff,
    rimIntensity: 1.15,
    exposure: 1.12,
  },
  arctic: {
    background: 0xe6ecf4,
    fogDensity: 0.026,
    floorColor: 0xdbe3ee,
    hemiSky: 0xffffff,
    hemiGround: 0x9aa8bc,
    hemiIntensity: 0.92,
    keyColor: 0xfff9ef,
    keyIntensity: 2.05,
    keyPos: [5.0, 8.8, 5.2],
    rimColor: 0x9ec5ff,
    rimIntensity: 0.72,
    exposure: 1.02,
  },
};

function detectSoftwareWebGL(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return false;
    const rendererStr = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    return /swiftshader|llvmpipe|software|mesa offscreen|angle.*swiftshader/i.test(rendererStr);
  } catch {
    return false;
  }
}

export interface SceneEngineCallbacks {
  onPartSelect?: (part: PartMetadata | null) => void;
  onPartHover?: (part: PartMetadata | null) => void;
  onEngineError?: (reason: string) => void;
}

export interface SceneEngineOptions {
  initialScene: Scene3DType;
  initialFinish: MaterialFinishId;
  initialLighting: LightingPresetId;
  initialExplode: number;
  initialAutoRotate: boolean;
  initialPaused: boolean;
  isTurboMode: boolean;
  callbacks?: SceneEngineCallbacks;
}

export class ThreeStudioEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRenderTarget: THREE.WebGLRenderTarget;
  private envScene: RoomEnvironment;
  private textures: ProceduralTextureSet;
  private materials: StudioMaterialBundle;
  private currentModel: BuiltSceneModel | null = null;

  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private stageFloor: THREE.Mesh;
  private stageGrid: THREE.Mesh;
  private stageFloorGeo: THREE.CircleGeometry;
  private stageGridGeo: THREE.PlaneGeometry;
  private stageFloorMat: THREE.MeshStandardMaterial;
  private stageGridMat: THREE.MeshBasicMaterial;
  private selectionHalo: THREE.Mesh;
  private selectionHaloGeo: THREE.RingGeometry;
  private selectionHaloMat: THREE.MeshBasicMaterial;

  private resizeObserver: ResizeObserver;
  private callbacks: SceneEngineCallbacks;
  private isSoftwareGl: boolean;
  private isTurboMode: boolean;

  private sceneType: Scene3DType;
  private finishId: MaterialFinishId;
  private lightingId: LightingPresetId;
  private targetExplode: number;
  private currentExplode: number;
  private motionPaused: boolean;
  private autoRotate: boolean;

  private hasCameraGoal = false;
  private needsControlSettle = false;
  private rafId: number | null = null;
  private renderScheduled = false;
  private isDisposed = false;
  private elapsedMotion = 0;
  private lastTickTime = 0;
  private lastRayMoveTime = 0;
  private pointerDownPos = { x: 0, y: 0 };

  private selectedPartRoot: THREE.Object3D | null = null;
  private hoveredPartId: string | null = null;
  private highlightedMaterials: THREE.Material[] = [];

  constructor(container: HTMLElement, options: SceneEngineOptions) {
    this.container = container;
    this.callbacks = options.callbacks || {};
    this.sceneType = options.initialScene;
    this.finishId = options.initialFinish;
    this.lightingId = options.initialLighting;
    this.targetExplode = options.initialExplode;
    this.currentExplode = options.initialExplode;
    this.motionPaused = options.initialPaused;
    this.autoRotate = options.initialAutoRotate;
    this.isTurboMode = options.isTurboMode;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    // Probe WebGL context safely first
    const tempCanvas = document.createElement('canvas');
    const probeGl =
      tempCanvas.getContext('webgl2', { powerPreference: 'high-performance' }) ||
      tempCanvas.getContext('webgl', { powerPreference: 'high-performance' });
    if (!probeGl) {
      throw new Error('WEBGL_UNAVAILABLE');
    }
    this.isSoftwareGl = detectSoftwareWebGL(probeGl);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !this.isTurboMode,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && !this.isTurboMode;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.updatePixelRatio();
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.outline = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    this.camera.layers.enable(0);
    this.camera.layers.enable(1);

    // Studio IBL Environment (RoomEnvironment + PMREMGenerator)
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.envScene = new RoomEnvironment();
    this.envRenderTarget = this.pmremGenerator.fromScene(this.envScene, 0.04);
    this.scene.environment = this.envRenderTarget.texture;

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.85;
    this.controls.panSpeed = 0.65;
    this.controls.minDistance = 2.35;
    this.controls.maxDistance = 13.5;
    this.controls.maxPolarAngle = Math.PI * 0.482;
    this.controls.autoRotate = this.autoRotate && !this.motionPaused;
    this.controls.autoRotateSpeed = 0.9;

    this.controls.addEventListener('start', this.handleControlStart);
    this.controls.addEventListener('change', this.handleControlChange);

    // Procedural Textures & PBR Material Bundle
    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());
    this.materials = createStudioMaterialBundle(this.textures, this.finishId);

    // Lights
    this.hemiLight = new THREE.HemisphereLight(0xd9e8ff, 0x262933, 0.72);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff3de, 2.35);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1.0;
    this.keyLight.shadow.camera.far = 22.0;
    this.keyLight.shadow.camera.left = -4.2;
    this.keyLight.shadow.camera.right = 4.2;
    this.keyLight.shadow.camera.top = 4.2;
    this.keyLight.shadow.camera.bottom = -4.2;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.025;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x8bb8ff, 0.95);
    this.rimLight.position.set(-5.2, 4.4, -4.6);
    this.scene.add(this.rimLight);

    // Stage Floor & Subtle Drafting Grid
    this.stageFloorGeo = new THREE.CircleGeometry(28, 64);
    this.stageFloorGeo.rotateX(-Math.PI / 2);
    this.stageFloorMat = new THREE.MeshStandardMaterial({
      color: 0x151923,
      roughness: 0.92,
      metalness: 0.06,
      envMapIntensity: 0.35,
    });
    this.stageFloor = new THREE.Mesh(this.stageFloorGeo, this.stageFloorMat);
    this.stageFloor.position.y = -0.002;
    this.stageFloor.receiveShadow = true;
    this.scene.add(this.stageFloor);

    this.stageGridGeo = new THREE.PlaneGeometry(24, 24);
    this.stageGridGeo.rotateX(-Math.PI / 2);
    this.stageGridMat = new THREE.MeshBasicMaterial({
      map: this.textures.stageGridMap,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    this.stageGrid = new THREE.Mesh(this.stageGridGeo, this.stageGridMat);
    this.stageGrid.position.y = 0.0005;
    this.scene.add(this.stageGrid);

    // Selection Halo Ring (replaces pulse dots with crisp CAD ring)
    this.selectionHaloGeo = new THREE.RingGeometry(0.45, 0.49, 48);
    this.selectionHaloGeo.rotateX(-Math.PI / 2);
    this.selectionHaloMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.selectionHalo = new THREE.Mesh(this.selectionHaloGeo, this.selectionHaloMat);
    this.selectionHalo.visible = false;
    this.scene.add(this.selectionHalo);

    // Initialize Lighting, Model & Camera
    this.applyLightingPreset(this.lightingId);
    this.loadSceneModel(this.sceneType, true);

    // Events
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);

    this.lastTickTime = performance.now();
    this.startLoopIfNeeded();
  }

  private updatePixelRatio(): void {
    const cap = this.isSoftwareGl || this.isTurboMode ? 1 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  }

  private handleResize(): void {
    if (this.isDisposed) return;
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.requestRender();
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.stopLoop();
    } else {
      this.lastTickTime = performance.now();
      this.startLoopIfNeeded();
    }
  };

  private handleControlStart = (): void => {
    // Immediate user drag cancels automated camera preset interpolation
    this.hasCameraGoal = false;
    this.needsControlSettle = true;
    this.startLoopIfNeeded();
  };

  private handleControlChange = (): void => {
    if (!this.rafId && !this.isDisposed) {
      this.requestRender();
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.isDisposed || !this.currentModel) return;
    const now = performance.now();
    if (now - this.lastRayMoveTime < 45) return; // Throttle hover raycast
    this.lastRayMoveTime = now;

    const hit = this.raycastPart(e);
    const hitMeta = hit ? (hit.userData.partMeta as PartMetadata | undefined) || null : null;
    const nextId = hitMeta?.id || null;

    if (nextId !== this.hoveredPartId) {
      this.hoveredPartId = nextId;
      this.renderer.domElement.style.cursor = nextId ? 'pointer' : 'grab';
      this.callbacks.onPartHover?.(hitMeta);
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (this.isDisposed || !this.currentModel) return;
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    // Ignore orbit drags
    if (dx * dx + dy * dy > 25) return;

    const hit = this.raycastPart(e);
    if (hit && hit.userData.partRoot) {
      const partRoot = hit.userData.partRoot as THREE.Object3D;
      const meta = hit.userData.partMeta as PartMetadata;
      this.setSelectedPart(partRoot, meta);
    } else {
      this.clearSelection();
    }
  };

  private raycastPart(e: PointerEvent): THREE.Object3D | null {
    if (!this.currentModel) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_pointer, this.camera);

    const hits = _raycaster.intersectObjects(this.currentModel.root.children, true);
    return hits.length > 0 ? hits[0].object : null;
  }

  private clearHighlightMaterials(): void {
    if (this.selectedPartRoot) {
      this.selectedPartRoot.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.userData.origMaterial) {
          mesh.material = mesh.userData.origMaterial;
          delete mesh.userData.origMaterial;
        }
      });
    }
    this.highlightedMaterials.forEach((m) => m.dispose());
    this.highlightedMaterials = [];
  }

  private setSelectedPart(partRoot: THREE.Object3D, meta: PartMetadata): void {
    this.clearHighlightMaterials();
    this.selectedPartRoot = partRoot;

    partRoot.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material && !Array.isArray(mesh.material)) {
        mesh.userData.origMaterial = mesh.material;
        const cloned = mesh.material.clone() as THREE.MeshStandardMaterial;
        if ('emissive' in cloned && cloned.emissive) {
          cloned.emissive.setHex(0x4f46e5);
          cloned.emissiveIntensity = 0.28;
        }
        mesh.material = cloned;
        this.highlightedMaterials.push(cloned);
      }
    });

    // Position selection halo cleanly under part
    const box = new THREE.Box3().setFromObject(partRoot);
    const center = box.getCenter(_tmpVec);
    const size = new THREE.Vector3();
    box.getSize(size);
    const radius = Math.max(0.45, Math.max(size.x, size.z) * 0.55);
    this.selectionHalo.position.set(center.x, 0.012, center.z);
    this.selectionHalo.scale.set(radius / 0.47, 1, radius / 0.47);
    this.selectionHalo.visible = true;

    this.callbacks.onPartSelect?.(meta);
    this.requestRender();
  }

  public clearSelection(): void {
    this.clearHighlightMaterials();
    this.selectedPartRoot = null;
    this.selectionHalo.visible = false;
    this.callbacks.onPartSelect?.(null);
    this.requestRender();
  }

  private loadSceneModel(type: Scene3DType, snapCamera: boolean): void {
    this.clearSelection();
    if (this.currentModel) {
      this.scene.remove(this.currentModel.root);
      this.currentModel.disposeGeometries();
      this.currentModel = null;
    }

    this.sceneType = type;
    this.currentModel = buildProceduralScene(type, this.materials, this.textures);
    this.scene.add(this.currentModel.root);

    // Apply current explode factor immediately on switch
    this.applyExplodeToParts(this.currentExplode);

    if (snapCamera) {
      const preset = SCENE_CATALOG[type].overviewCamera;
      this.camera.position.set(...preset.position);
      this.controls.target.set(...preset.target);
      this.controls.update();
      this.hasCameraGoal = false;
    } else {
      this.setCameraPreset('overview');
    }

    this.requestRender();
  }

  private applyExplodeToParts(factor: number): void {
    if (!this.currentModel) return;
    for (const part of this.currentModel.parts) {
      part.object.position
        .copy(part.homePos)
        .addScaledVector(part.explodeOffset, factor);
    }
  }

  private applyLightingPreset(id: LightingPresetId): void {
    const spec = LIGHTING_SPECS[id];
    this.lightingId = id;

    this.scene.background = new THREE.Color(spec.background);
    this.scene.fog = new THREE.FogExp2(spec.background, spec.fogDensity);
    this.stageFloorMat.color.setHex(spec.floorColor);
    this.stageGridMat.opacity = id === 'arctic' ? 0.52 : 0.34;

    this.hemiLight.color.setHex(spec.hemiSky);
    this.hemiLight.groundColor.setHex(spec.hemiGround);
    this.hemiLight.intensity = spec.hemiIntensity;

    this.keyLight.color.setHex(spec.keyColor);
    this.keyLight.intensity = spec.keyIntensity;
    this.keyLight.position.set(...spec.keyPos);

    this.rimLight.color.setHex(spec.rimColor);
    this.rimLight.intensity = spec.rimIntensity;

    this.renderer.toneMappingExposure = spec.exposure;
    this.requestRender();
  }

  // Public API
  public setSceneType(type: Scene3DType): void {
    if (type === this.sceneType) return;
    this.loadSceneModel(type, false);
  }

  public setMaterialFinish(finish: MaterialFinishId): void {
    this.finishId = finish;
    applyFinishToBundle(this.materials, finish);
    // Keep highlight color clean if a part is selected
    if (this.selectedPartRoot && this.selectedPartRoot.userData.partMeta) {
      const root = this.selectedPartRoot;
      const meta = root.userData.partMeta as PartMetadata;
      this.setSelectedPart(root, meta);
    }
    this.requestRender();
  }

  public setLightingPreset(id: LightingPresetId): void {
    this.applyLightingPreset(id);
  }

  public setExplodeAmount(amount: number): void {
    this.targetExplode = THREE.MathUtils.clamp(amount, 0, 1);
    this.startLoopIfNeeded();
  }

  public setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
    this.controls.autoRotate = enabled && !this.motionPaused;
    if (this.controls.autoRotate) {
      this.startLoopIfNeeded();
    } else {
      this.requestRender();
    }
  }

  public setMotionPaused(paused: boolean): void {
    this.motionPaused = paused;
    this.controls.autoRotate = this.autoRotate && !paused;
    if (!paused) {
      this.lastTickTime = performance.now();
      this.startLoopIfNeeded();
    } else {
      this.requestRender();
    }
  }

  public setTurboMode(enabled: boolean): void {
    this.isTurboMode = enabled;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && !enabled;
    this.updatePixelRatio();
    this.handleResize();
  }

  public setCameraPreset(preset: CameraPresetId): void {
    const spec = SCENE_CATALOG[this.sceneType];
    const targetPose =
      preset === 'detail'
        ? spec.detailCamera
        : preset === 'top'
        ? spec.topCamera
        : preset === 'low'
        ? spec.lowCamera
        : spec.overviewCamera;

    this.applyCameraPose(targetPose.position, targetPose.target);
  }

  public applyCameraPose(
    pos: [number, number, number],
    target: [number, number, number]
  ): void {
    _camGoalPos.set(pos[0], pos[1], pos[2]);
    _camGoalTarget.set(target[0], target[1], target[2]);
    this.hasCameraGoal = true;
    this.startLoopIfNeeded();
  }

  public getCameraPose(): {
    position: [number, number, number];
    target: [number, number, number];
  } {
    return {
      position: [
        Number(this.camera.position.x.toFixed(3)),
        Number(this.camera.position.y.toFixed(3)),
        Number(this.camera.position.z.toFixed(3)),
      ],
      target: [
        Number(this.controls.target.x.toFixed(3)),
        Number(this.controls.target.y.toFixed(3)),
        Number(this.controls.target.z.toFixed(3)),
      ],
    };
  }

  public resetView(): void {
    this.clearSelection();
    this.setCameraPreset('overview');
  }

  public requestRender(): void {
    if (this.isDisposed || this.renderScheduled || this.rafId !== null) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      if (this.isDisposed) return;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  private needsContinuousLoop(): boolean {
    if (document.hidden || this.isDisposed) return false;
    const explodeDiff = Math.abs(this.targetExplode - this.currentExplode) > 0.0005;
    const autoRotActive = this.autoRotate && !this.motionPaused;
    const kineticActive = !this.motionPaused;
    return (
      kineticActive ||
      autoRotActive ||
      explodeDiff ||
      this.hasCameraGoal ||
      this.needsControlSettle
    );
  }

  private startLoopIfNeeded(): void {
    if (this.isDisposed || this.rafId !== null || document.hidden) return;
    if (!this.needsContinuousLoop()) {
      this.requestRender();
      return;
    }
    this.lastTickTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (now: number): void => {
    this.rafId = null;
    if (this.isDisposed || document.hidden) return;

    const rawDt = (now - this.lastTickTime) * 0.001;
    this.lastTickTime = now;
    const dt = Math.min(0.05, Math.max(0.0001, rawDt));

    // 1. Kinetic model animation
    if (!this.motionPaused && this.currentModel) {
      this.elapsedMotion += dt;
      this.currentModel.updateMotion(dt, this.elapsedMotion);
    }

    // 2. Smoothly damped Exploded View interpolation
    if (Math.abs(this.targetExplode - this.currentExplode) > 0.0004) {
      this.currentExplode = THREE.MathUtils.damp(
        this.currentExplode,
        this.targetExplode,
        8.5,
        dt
      );
      this.applyExplodeToParts(this.currentExplode);
    } else if (this.currentExplode !== this.targetExplode) {
      this.currentExplode = this.targetExplode;
      this.applyExplodeToParts(this.currentExplode);
    }

    // 3. Smoothly damped Camera Preset interpolation
    if (this.hasCameraGoal) {
      const alpha = 1 - Math.exp(-6.5 * dt);
      this.camera.position.lerp(_camGoalPos, alpha);
      this.controls.target.lerp(_camGoalTarget, alpha);
      if (
        this.camera.position.distanceToSquared(_camGoalPos) < 0.0004 &&
        this.controls.target.distanceToSquared(_camGoalTarget) < 0.0004
      ) {
        this.camera.position.copy(_camGoalPos);
        this.controls.target.copy(_camGoalTarget);
        this.hasCameraGoal = false;
      }
    }

    // 4. OrbitControls damping settle check
    const controlsMoved = this.controls.update();
    this.needsControlSettle = Boolean(controlsMoved);

    // 5. Render frame
    this.renderer.render(this.scene, this.camera);

    // 6. Schedule next frame ONLY if motion or damping still active
    if (this.needsContinuousLoop()) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.stopLoop();

    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.controls.removeEventListener('start', this.handleControlStart);
    this.controls.removeEventListener('change', this.handleControlChange);
    this.controls.dispose();

    this.clearHighlightMaterials();
    if (this.currentModel) {
      this.scene.remove(this.currentModel.root);
      this.currentModel.disposeGeometries();
      this.currentModel = null;
    }

    this.stageFloorGeo.dispose();
    this.stageFloorMat.dispose();
    this.stageGridGeo.dispose();
    this.stageGridMat.dispose();
    this.selectionHaloGeo.dispose();
    this.selectionHaloMat.dispose();

    this.materials.dispose();
    this.textures.dispose();
    this.envRenderTarget.dispose();
    this.envScene.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
