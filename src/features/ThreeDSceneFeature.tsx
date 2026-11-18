import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookmarkPlus,
  Camera,
  ChevronDown,
  ChevronUp,
  Compass,
  FolderOpen,
  Layers,
  Pause,
  Play,
  RotateCcw,
  RefreshCw,
  Sun,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { ThreeStudioEngine } from '../three/sceneEngine';
import { FINISH_SPECS } from '../three/materials';
import {
  CameraPresetId,
  LightingPresetId,
  MaterialFinishId,
  PartMetadata,
  SCENE_CATALOG,
  Scene3DType,
  ScenePresetRecord,
} from '../three/types';
import {
  deleteScenePreset,
  saveScenePreset,
  subscribeUserScenePresets,
} from '../services/scene3dService';

const SCENE_IDS: Scene3DType[] = ['orrery', 'pavilion', 'turbine'];
const FINISH_IDS: MaterialFinishId[] = ['brass', 'titanium', 'ceramic', 'cobalt', 'jade'];
const LIGHTING_IDS: LightingPresetId[] = ['studio', 'dusk', 'arctic'];
const CAMERA_PRESETS: { id: CameraPresetId; labelZh: string; labelEn: string }[] = [
  { id: 'overview', labelZh: '概覽', labelEn: 'Overview' },
  { id: 'detail', labelZh: '特寫', labelEn: 'Detail' },
  { id: 'top', labelZh: '俯視', labelEn: 'Top' },
  { id: 'low', labelZh: '低角度', labelEn: 'Low' },
];

export default function ThreeDSceneFeature() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { currentUser } = useAuth();
  const { isTurboMode } = usePerformance();

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ThreeStudioEngine | null>(null);

  const [sceneType, setSceneType] = useState<Scene3DType>('orrery');
  const [materialFinish, setMaterialFinish] = useState<MaterialFinishId>('brass');
  const [lightingPreset, setLightingPreset] = useState<LightingPresetId>('studio');
  const [explodeAmount, setExplodeAmount] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [motionPaused, setMotionPaused] = useState<boolean>(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);

  const [selectedPart, setSelectedPart] = useState<PartMetadata | null>(null);
  const [hoveredPart, setHoveredPart] = useState<PartMetadata | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  const [savedPresets, setSavedPresets] = useState<ScenePresetRecord[]>([]);
  const [presetNameInput, setPresetNameInput] = useState<string>('');
  const [isSavingPreset, setIsSavingPreset] = useState<boolean>(false);
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);

  // Mount isolated WebGL Engine once
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    let engine: ThreeStudioEngine | null = null;
    try {
      engine = new ThreeStudioEngine(mountEl, {
        initialScene: sceneType,
        initialFinish: materialFinish,
        initialLighting: lightingPreset,
        initialExplode: explodeAmount,
        initialAutoRotate: autoRotate,
        initialPaused: motionPaused,
        isTurboMode,
        callbacks: {
          onPartSelect: (meta) => setSelectedPart(meta),
          onPartHover: (meta) => setHoveredPart(meta),
          onEngineError: (reason) => setWebglError(reason),
        },
      });
      engineRef.current = engine;
      setWebglError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setWebglError(msg);
    }

    return () => {
      if (engine) {
        engine.dispose();
      }
      engineRef.current = null;
    };
    // Mount once intentionally; state updates drive engine via imperative methods below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Propagate Turbo Mode toggle cleanly
  useEffect(() => {
    engineRef.current?.setTurboMode(isTurboMode);
  }, [isTurboMode]);

  // Keyboard shortcut 'H' to collapse/expand bottom control dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsPresetsOpen(false);
        engineRef.current?.clearSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Subscribe to saved 3D presets (Firestore when signed in, local cache fallback otherwise)
  useEffect(() => {
    const unsubscribe = subscribeUserScenePresets(currentUser?.uid, (presets) => {
      setSavedPresets(presets);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  const handleSceneChange = useCallback((nextScene: Scene3DType) => {
    setSceneType(nextScene);
    setSelectedPart(null);
    setHoveredPart(null);
    engineRef.current?.setSceneType(nextScene);
  }, []);

  const handleFinishChange = useCallback((nextFinish: MaterialFinishId) => {
    setMaterialFinish(nextFinish);
    engineRef.current?.setMaterialFinish(nextFinish);
  }, []);

  const handleLightingChange = useCallback((nextLighting: LightingPresetId) => {
    setLightingPreset(nextLighting);
    engineRef.current?.setLightingPreset(nextLighting);
  }, []);

  const handleExplodeChange = useCallback((val: number) => {
    setExplodeAmount(val);
    engineRef.current?.setExplodeAmount(val);
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => {
      const next = !prev;
      engineRef.current?.setAutoRotate(next);
      return next;
    });
  }, []);

  const handleToggleMotion = useCallback(() => {
    setMotionPaused((prev) => {
      const next = !prev;
      engineRef.current?.setMotionPaused(next);
      return next;
    });
  }, []);

  const handleCameraPreset = useCallback((presetId: CameraPresetId) => {
    engineRef.current?.setCameraPreset(presetId);
  }, []);

  const handleResetView = useCallback(() => {
    setExplodeAmount(0);
    engineRef.current?.setExplodeAmount(0);
    engineRef.current?.resetView();
  }, []);

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingPreset) return;
    const pose = engineRef.current?.getCameraPose() || {
      position: SCENE_CATALOG[sceneType].overviewCamera.position,
      target: SCENE_CATALOG[sceneType].overviewCamera.target,
    };
    const defaultLabel = `${isZh ? SCENE_CATALOG[sceneType].titleZh : SCENE_CATALOG[sceneType].titleEn} · ${isZh ? FINISH_SPECS[materialFinish].labelZh : FINISH_SPECS[materialFinish].labelEn}`;
    const nameToSave = (presetNameInput.trim() || defaultLabel).slice(0, 80);

    setIsSavingPreset(true);
    try {
      await saveScenePreset(currentUser?.uid, {
        name: nameToSave,
        sceneType,
        materialFinish,
        lightingPreset,
        explodeAmount,
        autoRotate,
        cameraPosition: pose.position,
        cameraTarget: pose.target,
      });
      setPresetNameInput('');
      setPresetFeedback(isZh ? '已儲存場景預設' : 'Scene preset saved');
      setTimeout(() => setPresetFeedback(null), 2400);
    } catch (err) {
      console.error('Failed to save 3D scene preset:', err);
      setPresetFeedback(isZh ? '儲存失敗，請稍後再試' : 'Save failed');
      setTimeout(() => setPresetFeedback(null), 2600);
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleApplyPreset = useCallback((preset: ScenePresetRecord) => {
    setSceneType(preset.sceneType);
    setMaterialFinish(preset.materialFinish);
    setLightingPreset(preset.lightingPreset);
    setExplodeAmount(preset.explodeAmount);
    setAutoRotate(preset.autoRotate);

    const engine = engineRef.current;
    if (engine) {
      engine.setSceneType(preset.sceneType);
      engine.setMaterialFinish(preset.materialFinish);
      engine.setLightingPreset(preset.lightingPreset);
      engine.setExplodeAmount(preset.explodeAmount);
      engine.setAutoRotate(preset.autoRotate);
      engine.applyCameraPose(preset.cameraPosition, preset.cameraTarget);
    }
    setIsPresetsOpen(false);
  }, []);

  const handleDeletePreset = useCallback(
    async (id: string) => {
      try {
        await deleteScenePreset(currentUser?.uid, id);
      } catch (err) {
        console.error('Failed to delete 3D preset:', err);
      }
    },
    [currentUser?.uid]
  );

  const isLightStage = lightingPreset === 'arctic';
  const activePart = selectedPart || hoveredPart;
  const sceneMeta = SCENE_CATALOG[sceneType];

  // Solid / rgba HUD surfaces (NO backdrop-blur over WebGL)
  const hudSurfaceClass = useMemo(
    () =>
      isLightStage
        ? 'bg-[rgba(255,255,255,0.93)] text-zinc-900 border border-zinc-300/90 shadow-lg'
        : 'bg-[rgba(14,17,24,0.90)] text-zinc-100 border border-white/14 shadow-2xl',
    [isLightStage]
  );

  const subtleChipClass = isLightStage
    ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-300/70'
    : 'bg-[rgba(255,255,255,0.07)] text-zinc-300 hover:bg-[rgba(255,255,255,0.14)] border border-white/10';

  const activeChipClass = isLightStage
    ? 'bg-zinc-900 text-white border border-zinc-900'
    : 'bg-indigo-500 text-white border border-indigo-400';

  return (
    <div className="relative w-full h-full min-h-[540px] overflow-hidden select-none">
      {/* Isolated WebGL Canvas Mount — zero React state overlays inside */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full"
        aria-label={isZh ? '3D 互動場景視窗' : 'Interactive 3D Scene Viewport'}
      />

      {/* WebGL Error Fallback */}
      {webglError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-zinc-950 text-zinc-100">
          <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-semibold">
              {isZh ? '無法初始化 WebGL 3D 繪圖引擎' : 'WebGL 3D Engine Unavailable'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {isZh
                ? '目前裝置或瀏覽器環境不支援硬體/軟體 WebGL 渲染。請確認瀏覽器已啟用 WebGL 後重試。'
                : 'This browser environment could not initialize a WebGL context. Please enable WebGL and retry.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>{isZh ? '重新整理' : 'Reload'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Top-Left Compact Scene & Part Inspector Badge (solid/rgba, no backdrop-blur, no pulse dots) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none max-w-[82vw] sm:max-w-sm">
        <div className={`pointer-events-auto rounded-2xl px-3.5 py-2 flex items-center gap-3 ${hudSurfaceClass}`}>
          <div>
            <div className="text-xs font-bold tracking-wide leading-tight">
              {isZh ? sceneMeta.titleZh : sceneMeta.titleEn}
            </div>
            <div className={`text-[11px] leading-tight mt-0.5 ${isLightStage ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {isZh ? sceneMeta.subtitleZh : sceneMeta.subtitleEn}
            </div>
          </div>
        </div>

        {activePart && (
          <div className={`pointer-events-auto rounded-2xl px-3.5 py-2 flex items-start justify-between gap-3 ${hudSurfaceClass}`}>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                {selectedPart
                  ? isZh
                    ? '已選取組件'
                    : 'Selected Assembly'
                  : isZh
                  ? '懸停檢視'
                  : 'Hover Inspect'}
              </div>
              <div className="text-xs font-semibold truncate mt-0.5">
                {isZh ? activePart.labelZh : activePart.labelEn}
              </div>
              <div className={`text-[11px] truncate ${isLightStage ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {isZh ? activePart.materialSpecZh : activePart.materialSpecEn}
              </div>
            </div>
            {selectedPart && (
              <button
                type="button"
                onClick={() => engineRef.current?.clearSelection()}
                className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${subtleChipClass}`}
                title={isZh ? '取消選取' : 'Clear selection'}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Bottom Control Dock (<= 15% viewport footprint, solid rgba, no backdrop-blur) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 w-[94vw] max-w-3xl pointer-events-none">
        {/* Saved Cloud Presets Drawer (only visible when opened) */}
        {isPresetsOpen && (
          <div className={`pointer-events-auto w-full rounded-2xl p-3 space-y-2.5 ${hudSurfaceClass}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <FolderOpen size={14} className="text-indigo-400" />
                <span>
                  {isZh
                    ? `3D 場景預設集 (${savedPresets.length})`
                    : `Saved 3D Scene Presets (${savedPresets.length})`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {presetFeedback && (
                  <span className="text-[11px] font-medium text-emerald-400">{presetFeedback}</span>
                )}
                <button
                  type="button"
                  onClick={() => setIsPresetsOpen(false)}
                  className={`p-1 rounded-lg cursor-pointer ${subtleChipClass}`}
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePreset} className="flex items-center gap-2">
              <input
                type="text"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                maxLength={80}
                placeholder={
                  isZh
                    ? '輸入目前視角與材質的預設名稱...'
                    : 'Name current view, finish & lighting...'
                }
                className={`flex-1 px-3 py-1.5 rounded-xl text-xs outline-none border ${
                  isLightStage
                    ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500'
                    : 'bg-zinc-900 border-white/15 text-zinc-100 placeholder-zinc-500 focus:border-indigo-400'
                }`}
              />
              <button
                type="submit"
                disabled={isSavingPreset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer shrink-0"
              >
                <BookmarkPlus size={13} />
                <span>{isSavingPreset ? (isZh ? '儲存中...' : 'Saving...') : isZh ? '儲存目前視角' : 'Save Scene'}</span>
              </button>
            </form>

            {savedPresets.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-0.5">
                {savedPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl text-[11px] font-medium ${subtleChipClass}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="hover:underline cursor-pointer truncate max-w-[160px]"
                      title={preset.name}
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(preset.id)}
                      className="p-0.5 rounded hover:text-rose-400 cursor-pointer"
                      title={isZh ? '刪除預設' : 'Delete preset'}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-[11px] py-1 ${isLightStage ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {isZh
                  ? '尚未儲存任何 3D 場景預設。調整機體、材質與視角後即可一鍵存檔。'
                  : 'No saved 3D scene presets yet. Save your favorite camera angle and finish above.'}
              </div>
            )}
          </div>
        )}

        {/* Collapse / Expand Dock Handle */}
        <button
          type="button"
          onClick={() => setIsDockCollapsed((v) => !v)}
          className={`pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold cursor-pointer transition-colors ${hudSurfaceClass}`}
          title={isZh ? '快速鍵 H 切換控制列' : 'Press H to toggle controls'}
        >
          {isDockCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          <span>
            {isDockCollapsed
              ? isZh
                ? '顯示控制列 (H)'
                : 'Show Controls (H)'
              : isZh
              ? '隱藏控制列 (H)'
              : 'Hide Controls (H)'}
          </span>
        </button>

        {/* Main Single Compact Control Dock */}
        {!isDockCollapsed && (
          <div className={`pointer-events-auto w-full rounded-2xl px-3 py-2.5 space-y-2 ${hudSurfaceClass}`}>
            {/* Row 1: Model Switcher, Material Finish Swatches, Lighting & Transport */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Subject Selector */}
              <div className="flex items-center gap-1">
                {SCENE_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSceneChange(id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                      sceneType === id ? activeChipClass : subtleChipClass
                    }`}
                  >
                    {isZh ? SCENE_CATALOG[id].titleZh : SCENE_CATALOG[id].titleEn}
                  </button>
                ))}
              </div>

              {/* Material Finish Swatches */}
              <div className="flex items-center gap-1.5" role="group" aria-label="Material Finish">
                {FINISH_IDS.map((id) => {
                  const spec = FINISH_SPECS[id];
                  const isActive = materialFinish === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleFinishChange(id)}
                      title={isZh ? spec.labelZh : spec.labelEn}
                      className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                        isActive
                          ? 'scale-115 border-indigo-400 ring-2 ring-indigo-400/35'
                          : 'border-white/30 hover:scale-105'
                      }`}
                      style={{ backgroundColor: spec.swatchHex }}
                    />
                  );
                })}
              </div>

              {/* Lighting Presets */}
              <div className="flex items-center gap-1">
                <Sun size={12} className="text-amber-400 mr-0.5 hidden sm:inline" />
                {LIGHTING_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleLightingChange(id)}
                    className={`px-2 py-1 rounded-xl text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                      lightingPreset === id ? activeChipClass : subtleChipClass
                    }`}
                  >
                    {id === 'studio'
                      ? isZh
                        ? '攝影棚'
                        : 'Studio'
                      : id === 'dusk'
                      ? isZh
                        ? '暮光'
                        : 'Dusk'
                      : isZh
                      ? '極晝'
                      : 'Arctic'}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Exploded View Slider, Camera Presets, Play/Orbit/Reset/Cloud */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10">
              {/* Explode Slider */}
              <label className="flex items-center gap-2 text-[11px] font-medium min-w-[155px] flex-1 max-w-[230px]">
                <Layers size={13} className="text-indigo-400 shrink-0" />
                <span className="shrink-0">{isZh ? '爆炸拆解' : 'Explode'}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={explodeAmount}
                  onChange={(e) => handleExplodeChange(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5"
                />
                <span className="font-mono text-[10px] w-8 text-right shrink-0">
                  {Math.round(explodeAmount * 100)}%
                </span>
              </label>

              {/* Camera Presets */}
              <div className="flex items-center gap-1">
                <Camera size={12} className="text-zinc-400 mr-0.5 hidden sm:inline" />
                {CAMERA_PRESETS.map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => handleCameraPreset(cam.id)}
                    className={`px-2 py-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${subtleChipClass}`}
                  >
                    {isZh ? cam.labelZh : cam.labelEn}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleToggleMotion}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    !motionPaused ? activeChipClass : subtleChipClass
                  }`}
                  title={motionPaused ? (isZh ? '繼續動態' : 'Resume motion') : isZh ? '暫停動態' : 'Pause motion'}
                >
                  {motionPaused ? <Play size={13} /> : <Pause size={13} />}
                </button>
                <button
                  type="button"
                  onClick={handleToggleAutoRotate}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    autoRotate ? activeChipClass : subtleChipClass
                  }`}
                  title={isZh ? '自動環繞視角' : 'Auto-orbit camera'}
                >
                  <Compass size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${subtleChipClass}`}
                  title={isZh ? '重設視角與組裝' : 'Reset view & assembly'}
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPresetsOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                    isPresetsOpen ? activeChipClass : subtleChipClass
                  }`}
                  title={isZh ? '雲端儲存 / 載入場景預設' : 'Save & load 3D scene presets'}
                >
                  <BookmarkPlus size={12} />
                  <span>{isZh ? '預設集' : 'Presets'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
