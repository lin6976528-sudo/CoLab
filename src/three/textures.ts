import * as THREE from 'three';

export interface ProceduralTextureSet {
  metalRoughness: THREE.CanvasTexture;
  metalBump: THREE.CanvasTexture;
  stoneMap: THREE.CanvasTexture;
  stoneRoughness: THREE.CanvasTexture;
  stoneBump: THREE.CanvasTexture;
  dialMap: THREE.CanvasTexture;
  stageGridMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not allocate 2D canvas context for procedural texture');
  }
  return [canvas, ctx];
}

function deterministicHash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const anisotropy = Math.min(8, Math.max(1, maxAnisotropy || 1));

  // 1. Brushed Anisotropic Metal Roughness & Bump
  const [metalRoughCanvas, mCtx] = makeCanvas(512, 512);
  mCtx.fillStyle = 'rgb(112, 112, 112)';
  mCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y++) {
    const band = deterministicHash(y, 13);
    const val = Math.round(92 + band * 52);
    mCtx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    mCtx.fillRect(0, y, 512, 1);
  }
  for (let i = 0; i < 650; i++) {
    const y = Math.floor(deterministicHash(i, 7) * 512);
    const x = Math.floor(deterministicHash(i, 29) * 512);
    const w = 40 + Math.floor(deterministicHash(i, 53) * 180);
    const bright = deterministicHash(i, 89) > 0.5 ? 165 : 75;
    mCtx.fillStyle = `rgba(${bright}, ${bright}, ${bright}, 0.16)`;
    mCtx.fillRect(x, y, w, 1);
  }

  const metalRoughness = new THREE.CanvasTexture(metalRoughCanvas);
  metalRoughness.wrapS = THREE.RepeatWrapping;
  metalRoughness.wrapT = THREE.RepeatWrapping;
  metalRoughness.repeat.set(2, 2);
  metalRoughness.anisotropy = anisotropy;
  metalRoughness.colorSpace = THREE.NoColorSpace;

  const metalBump = new THREE.CanvasTexture(metalRoughCanvas);
  metalBump.wrapS = THREE.RepeatWrapping;
  metalBump.wrapT = THREE.RepeatWrapping;
  metalBump.repeat.set(3, 3);
  metalBump.anisotropy = anisotropy;
  metalBump.colorSpace = THREE.NoColorSpace;

  // 2. Architectural Travertine / Micro-Mineral Stone
  const [stoneColorCanvas, sCtx] = makeCanvas(512, 512);
  const [stoneRoughCanvas, srCtx] = makeCanvas(512, 512);
  sCtx.fillStyle = '#dad5cc';
  sCtx.fillRect(0, 0, 512, 512);
  srCtx.fillStyle = 'rgb(218, 218, 218)';
  srCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 2) {
    const wave = Math.sin(y * 0.045) * 8 + (deterministicHash(y, 19) - 0.5) * 14;
    const base = Math.round(212 + wave);
    sCtx.fillStyle = `rgb(${base + 4}, ${base}, ${base - 8})`;
    sCtx.fillRect(0, y, 512, 2);
  }

  for (let i = 0; i < 3200; i++) {
    const x = deterministicHash(i, 3) * 512;
    const y = deterministicHash(i, 11) * 512;
    const r = 0.8 + deterministicHash(i, 17) * 2.2;
    const dark = deterministicHash(i, 41) > 0.5;
    sCtx.fillStyle = dark ? 'rgba(135, 128, 118, 0.14)' : 'rgba(248, 245, 240, 0.16)';
    sCtx.beginPath();
    sCtx.arc(x, y, r, 0, Math.PI * 2);
    sCtx.fill();

    const rVal = dark ? 236 : 196;
    srCtx.fillStyle = `rgba(${rVal}, ${rVal}, ${rVal}, 0.24)`;
    srCtx.beginPath();
    srCtx.arc(x, y, r * 1.2, 0, Math.PI * 2);
    srCtx.fill();
  }

  const stoneMap = new THREE.CanvasTexture(stoneColorCanvas);
  stoneMap.wrapS = THREE.RepeatWrapping;
  stoneMap.wrapT = THREE.RepeatWrapping;
  stoneMap.repeat.set(2, 2);
  stoneMap.anisotropy = anisotropy;
  stoneMap.colorSpace = THREE.SRGBColorSpace;

  const stoneRoughness = new THREE.CanvasTexture(stoneRoughCanvas);
  stoneRoughness.wrapS = THREE.RepeatWrapping;
  stoneRoughness.wrapT = THREE.RepeatWrapping;
  stoneRoughness.repeat.set(2, 2);
  stoneRoughness.anisotropy = anisotropy;
  stoneRoughness.colorSpace = THREE.NoColorSpace;

  const stoneBump = new THREE.CanvasTexture(stoneRoughCanvas);
  stoneBump.wrapS = THREE.RepeatWrapping;
  stoneBump.wrapT = THREE.RepeatWrapping;
  stoneBump.repeat.set(2, 2);
  stoneBump.anisotropy = anisotropy;
  stoneBump.colorSpace = THREE.NoColorSpace;

  // 3. Precision Vernier Calibration Dial Texture
  const [dialCanvas, dCtx] = makeCanvas(1024, 1024);
  const cx = 512;
  const cy = 512;
  dCtx.fillStyle = '#1d222b';
  dCtx.fillRect(0, 0, 1024, 1024);

  const grad = dCtx.createRadialGradient(cx, cy, 40, cx, cy, 500);
  grad.addColorStop(0, '#2a313d');
  grad.addColorStop(0.65, '#1b2029');
  grad.addColorStop(1, '#12151b');
  dCtx.fillStyle = grad;
  dCtx.fillRect(0, 0, 1024, 1024);

  dCtx.strokeStyle = 'rgba(222, 188, 124, 0.45)';
  dCtx.lineWidth = 2;
  [180, 290, 390, 465].forEach((radius) => {
    dCtx.beginPath();
    dCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    dCtx.stroke();
  });

  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const isMid = deg % 15 === 0;
    const rInner = isMajor ? 415 : isMid ? 430 : 442;
    const rOuter = 462;
    dCtx.strokeStyle = isMajor ? 'rgba(240, 206, 138, 0.85)' : 'rgba(200, 210, 224, 0.35)';
    dCtx.lineWidth = isMajor ? 3 : 1.5;
    dCtx.beginPath();
    dCtx.moveTo(cx + Math.cos(rad) * rInner, cy + Math.sin(rad) * rInner);
    dCtx.lineTo(cx + Math.cos(rad) * rOuter, cy + Math.sin(rad) * rOuter);
    dCtx.stroke();
  }

  dCtx.fillStyle = 'rgba(240, 206, 138, 0.8)';
  dCtx.font = '600 26px ui-monospace, SFMono-Regular, Menlo, monospace';
  dCtx.textAlign = 'center';
  dCtx.textBaseline = 'middle';
  [
    { deg: 0, label: '000°' },
    { deg: 90, label: '090°' },
    { deg: 180, label: '180°' },
    { deg: 270, label: '270°' },
  ].forEach(({ deg, label }) => {
    const rad = (deg * Math.PI) / 180;
    dCtx.fillText(label, cx + Math.cos(rad) * 355, cy + Math.sin(rad) * 355);
  });

  const dialMap = new THREE.CanvasTexture(dialCanvas);
  dialMap.anisotropy = anisotropy;
  dialMap.colorSpace = THREE.SRGBColorSpace;

  // 4. Subtle Architectural Stage Grid Texture
  const [gridCanvas, gCtx] = makeCanvas(512, 512);
  gCtx.clearRect(0, 0, 512, 512);
  gCtx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  gCtx.lineWidth = 1;
  for (let step = 0; step <= 512; step += 64) {
    gCtx.beginPath();
    gCtx.moveTo(step, 0);
    gCtx.lineTo(step, 512);
    gCtx.stroke();
    gCtx.beginPath();
    gCtx.moveTo(0, step);
    gCtx.lineTo(512, step);
    gCtx.stroke();
  }
  gCtx.strokeStyle = 'rgba(148, 163, 184, 0.30)';
  gCtx.lineWidth = 1.5;
  gCtx.strokeRect(0.5, 0.5, 511, 511);

  const stageGridMap = new THREE.CanvasTexture(gridCanvas);
  stageGridMap.wrapS = THREE.RepeatWrapping;
  stageGridMap.wrapT = THREE.RepeatWrapping;
  stageGridMap.repeat.set(14, 14);
  stageGridMap.anisotropy = anisotropy;
  stageGridMap.colorSpace = THREE.SRGBColorSpace;

  // 5. Radial Contact Shadow Texture (Grounding Guarantee)
  const [shadowCanvas, shCtx] = makeCanvas(512, 512);
  const shGrad = shCtx.createRadialGradient(256, 256, 24, 256, 256, 248);
  shGrad.addColorStop(0, 'rgba(8, 10, 18, 0.56)');
  shGrad.addColorStop(0.42, 'rgba(8, 10, 18, 0.30)');
  shGrad.addColorStop(0.75, 'rgba(8, 10, 18, 0.08)');
  shGrad.addColorStop(1, 'rgba(8, 10, 18, 0.0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 512, 512);

  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);
  contactShadowMap.colorSpace = THREE.SRGBColorSpace;

  return {
    metalRoughness,
    metalBump,
    stoneMap,
    stoneRoughness,
    stoneBump,
    dialMap,
    stageGridMap,
    contactShadowMap,
    dispose: () => {
      metalRoughness.dispose();
      metalBump.dispose();
      stoneMap.dispose();
      stoneRoughness.dispose();
      stoneBump.dispose();
      dialMap.dispose();
      stageGridMap.dispose();
      contactShadowMap.dispose();
    },
  };
}
