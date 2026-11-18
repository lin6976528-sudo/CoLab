import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  handleFirestoreError,
  isFirestoreOfflineError,
  OperationType,
} from '../utils/errorHandling';
import {
  LightingPresetId,
  MaterialFinishId,
  Scene3DType,
  ScenePresetRecord,
} from '../three/types';

const LOCAL_PRESETS_KEY = 'colab_3d_scene_presets_v1';

function readLocalPresets(): ScenePresetRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalPresets(presets: ScenePresetRecord[]): void {
  try {
    localStorage.setItem(LOCAL_PRESETS_KEY, JSON.stringify(presets.slice(0, 30)));
  } catch {
    // Ignore storage quota errors
  }
}

function generateValidPresetId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `scene_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '');
}

export interface SaveScenePresetInput {
  name: string;
  sceneType: Scene3DType;
  materialFinish: MaterialFinishId;
  lightingPreset: LightingPresetId;
  explodeAmount: number;
  autoRotate: boolean;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
}

export function subscribeUserScenePresets(
  userId: string | null | undefined,
  onUpdate: (presets: ScenePresetRecord[]) => void
): () => void {
  if (!userId) {
    onUpdate(readLocalPresets());
    return () => {};
  }

  // Hydrate immediately from local cache while Firestore syncs
  const cached = readLocalPresets().filter((p) => p.userId === userId || p.userId === 'local');
  if (cached.length > 0) {
    onUpdate(cached);
  }

  const q = query(
    collection(db, 'scenes_3d'),
    where('userId', '==', userId)
  );

  const toMillis = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    const parsed = Date.parse(String(ts));
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: ScenePresetRecord[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: String(data.userId || userId),
            name: String(data.name || 'Untitled Scene'),
            sceneType: (data.sceneType || 'orrery') as Scene3DType,
            materialFinish: (data.materialFinish || 'brass') as MaterialFinishId,
            lightingPreset: (data.lightingPreset || 'studio') as LightingPresetId,
            explodeAmount: typeof data.explodeAmount === 'number' ? data.explodeAmount : 0,
            autoRotate: Boolean(data.autoRotate),
            cameraPosition: (Array.isArray(data.cameraPosition) && data.cameraPosition.length === 3
              ? [Number(data.cameraPosition[0]), Number(data.cameraPosition[1]), Number(data.cameraPosition[2])]
              : [4.6, 3.2, 5.1]) as [number, number, number],
            cameraTarget: (Array.isArray(data.cameraTarget) && data.cameraTarget.length === 3
              ? [Number(data.cameraTarget[0]), Number(data.cameraTarget[1]), Number(data.cameraTarget[2])]
              : [0, 1.55, 0]) as [number, number, number],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        })
        .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
      writeLocalPresets(items);
      onUpdate(items);
    },
    (error) => {
      if (isFirestoreOfflineError(error)) {
        onUpdate(readLocalPresets());
        return;
      }
      handleFirestoreError(error, OperationType.LIST, 'scenes_3d', auth);
    }
  );

  return unsubscribe;
}

export async function saveScenePreset(
  userId: string | null | undefined,
  input: SaveScenePresetInput
): Promise<ScenePresetRecord> {
  const safeName = input.name.trim().slice(0, 80) || 'Custom 3D Scene';
  const clampedExplode = Math.max(0, Math.min(1, Number(input.explodeAmount) || 0));
  const id = generateValidPresetId();

  const localRecord: ScenePresetRecord = {
    id,
    userId: userId || 'local',
    name: safeName,
    sceneType: input.sceneType,
    materialFinish: input.materialFinish,
    lightingPreset: input.lightingPreset,
    explodeAmount: clampedExplode,
    autoRotate: Boolean(input.autoRotate),
    cameraPosition: input.cameraPosition,
    cameraTarget: input.cameraTarget,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!userId) {
    const existing = readLocalPresets();
    writeLocalPresets([localRecord, ...existing]);
    return localRecord;
  }

  try {
    const docRef = doc(db, 'scenes_3d', id);
    await setDoc(docRef, {
      userId,
      name: safeName,
      sceneType: input.sceneType,
      materialFinish: input.materialFinish,
      lightingPreset: input.lightingPreset,
      explodeAmount: clampedExplode,
      autoRotate: Boolean(input.autoRotate),
      cameraPosition: input.cameraPosition,
      cameraTarget: input.cameraTarget,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return localRecord;
  } catch (error) {
    if (isFirestoreOfflineError(error)) {
      const existing = readLocalPresets();
      writeLocalPresets([localRecord, ...existing]);
      return localRecord;
    }
    handleFirestoreError(error, OperationType.CREATE, `scenes_3d/${id}`, auth);
    throw error;
  }
}

export async function deleteScenePreset(
  userId: string | null | undefined,
  presetId: string
): Promise<void> {
  const existing = readLocalPresets();
  writeLocalPresets(existing.filter((item) => item.id !== presetId));

  if (!userId) return;

  try {
    await deleteDoc(doc(db, 'scenes_3d', presetId));
  } catch (error) {
    if (isFirestoreOfflineError(error)) return;
    handleFirestoreError(error, OperationType.DELETE, `scenes_3d/${presetId}`, auth);
  }
}
