import * as THREE from 'three';
import { PartMetadata, Scene3DType } from './types';
import { StudioMaterialBundle } from './materials';
import { ProceduralTextureSet } from './textures';

export interface ExplodablePart {
  object: THREE.Object3D;
  homePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
  metadata: PartMetadata;
}

export interface BuiltSceneModel {
  root: THREE.Group;
  parts: ExplodablePart[];
  updateMotion: (dt: number, elapsed: number) => void;
  disposeGeometries: () => void;
}

function registerInteractivePart(
  parts: ExplodablePart[],
  object: THREE.Object3D,
  metadata: PartMetadata,
  explodeOffset: [number, number, number]
): void {
  object.userData.partMeta = metadata;
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.layers.enable(1);
      child.userData.partMeta = metadata;
      child.userData.partRoot = object;
    }
  });
  parts.push({
    object,
    homePos: object.position.clone(),
    explodeOffset: new THREE.Vector3(...explodeOffset),
    metadata,
  });
}

function createContactShadowPlane(
  textures: ProceduralTextureSet,
  radius: number,
  geometries: THREE.BufferGeometry[]
): { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial } {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geo.rotateX(-Math.PI / 2);
  geometries.push(geo);

  const material = new THREE.MeshBasicMaterial({
    map: textures.contactShadowMap,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = 0.002;
  mesh.renderOrder = -1;
  return { mesh, material };
}

function snapGroupBaseToZero(group: THREE.Group): void {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  if (Number.isFinite(box.min.y)) {
    group.position.y -= box.min.y;
  }
}

function createBeveledRingGeometry(
  outerR: number,
  innerR: number,
  depth: number,
  bevelSize = 0.025,
  segments = 56
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 3,
    curveSegments: segments,
  });
  geo.center();
  return geo;
}

function createSpokedGearGeometry(
  outerR: number,
  rootR: number,
  innerHubR: number,
  teethCount: number,
  spokesCount: number,
  depth: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teethCount;

  for (let i = 0; i < teethCount; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.22;
    const a2 = a0 + step * 0.42;
    const a3 = a0 + step * 0.64;
    const a4 = a0 + step * 0.84;
    if (i === 0) {
      shape.moveTo(Math.cos(a0) * rootR, Math.sin(a0) * rootR);
    } else {
      shape.lineTo(Math.cos(a0) * rootR, Math.sin(a0) * rootR);
    }
    shape.lineTo(Math.cos(a1) * rootR, Math.sin(a1) * rootR);
    shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    shape.lineTo(Math.cos(a3) * outerR, Math.sin(a3) * outerR);
    shape.lineTo(Math.cos(a4) * rootR, Math.sin(a4) * rootR);
  }
  shape.closePath();

  const holeR = innerHubR * 0.45;
  const centerHole = new THREE.Path();
  centerHole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
  shape.holes.push(centerHole);

  const cutInnerR = innerHubR + 0.08;
  const cutOuterR = rootR - 0.10;
  const spokeSpan = (Math.PI * 2) / spokesCount;
  const gapMargin = 0.14;

  for (let s = 0; s < spokesCount; s++) {
    const startA = s * spokeSpan + gapMargin;
    const endA = (s + 1) * spokeSpan - gapMargin;
    if (endA <= startA) continue;
    const cutout = new THREE.Path();
    cutout.absarc(0, 0, cutOuterR, startA, endA, false);
    cutout.absarc(0, 0, cutInnerR, endA, startA, true);
    cutout.closePath();
    shape.holes.push(cutout);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
    curveSegments: 24,
  });
  geo.center();
  return geo;
}

// ============================================================================
// SCENE 1: KINETIC CHRONOMETER ORRERY
// ============================================================================
function buildOrreryModel(
  mats: StudioMaterialBundle,
  textures: ProceduralTextureSet
): BuiltSceneModel {
  const root = new THREE.Group();
  const assembly = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const parts: ExplodablePart[] = [];

  // 1. Turned Stone & Brass Observatory Plinth (LatheGeometry)
  const plinthGroup = new THREE.Group();
  const plinthProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(1.72, 0.0),
    new THREE.Vector2(1.72, 0.11),
    new THREE.Vector2(1.56, 0.17),
    new THREE.Vector2(1.42, 0.19),
    new THREE.Vector2(1.36, 0.34),
    new THREE.Vector2(1.18, 0.38),
    new THREE.Vector2(0.0, 0.38),
  ];
  const plinthGeo = new THREE.LatheGeometry(plinthProfile, 64);
  geometries.push(plinthGeo);
  const plinthMesh = new THREE.Mesh(plinthGeo, mats.plinth);
  plinthGroup.add(plinthMesh);

  const dialDiskGeo = new THREE.CylinderGeometry(1.16, 1.16, 0.025, 64);
  geometries.push(dialDiskGeo);
  const dialDisk = new THREE.Mesh(dialDiskGeo, mats.dial);
  dialDisk.position.y = 0.39;
  plinthGroup.add(dialDisk);

  // 36 instanced vernier bezel markers (InstancedMesh, 1 draw call)
  const tickGeo = new THREE.BoxGeometry(0.026, 0.028, 0.075);
  geometries.push(tickGeo);
  const ticksInstanced = new THREE.InstancedMesh(tickGeo, mats.hero, 36);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const radius = 1.27;
    dummy.position.set(Math.cos(angle) * radius, 0.395, Math.sin(angle) * radius);
    dummy.rotation.set(0, -angle + Math.PI / 2, 0);
    dummy.scale.set(1, i % 3 === 0 ? 1.45 : 0.85, i % 3 === 0 ? 1.25 : 0.85);
    dummy.updateMatrix();
    ticksInstanced.setMatrixAt(i, dummy.matrix);
  }
  ticksInstanced.instanceMatrix.needsUpdate = true;
  ticksInstanced.computeBoundingSphere();
  plinthGroup.add(ticksInstanced);

  assembly.add(plinthGroup);
  registerInteractivePart(
    parts,
    plinthGroup,
    {
      id: 'orrery-plinth',
      labelZh: '車削礦石基座與刻度盤',
      labelEn: 'Turned Stone Plinth & Vernier Dial',
      materialSpecZh: '霧面石灰華石材 + 36 分度合金刻標',
      materialSpecEn: 'Matte Travertine + 36 Instanced Bezel Ticks',
      category: 'plinth',
    },
    [0, -0.45, 0]
  );

  // 2. Curved Yoke Cradle (TubeGeometry)
  const yokeGroup = new THREE.Group();
  const yokeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.42, 1.72, 0),
    new THREE.Vector3(-1.32, 0.88, 0),
    new THREE.Vector3(-0.75, 0.44, 0),
    new THREE.Vector3(0, 0.41, 0),
    new THREE.Vector3(0.75, 0.44, 0),
    new THREE.Vector3(1.32, 0.88, 0),
    new THREE.Vector3(1.42, 1.72, 0),
  ]);
  const yokeGeo = new THREE.TubeGeometry(yokeCurve, 56, 0.055, 16, false);
  geometries.push(yokeGeo);
  const yokeMesh = new THREE.Mesh(yokeGeo, mats.frame);
  yokeGroup.add(yokeMesh);

  const hubShaftGeo = new THREE.CylinderGeometry(0.11, 0.14, 0.56, 28);
  geometries.push(hubShaftGeo);
  const hubShaft = new THREE.Mesh(hubShaftGeo, mats.frame);
  hubShaft.position.y = 0.65;
  yokeGroup.add(hubShaft);

  assembly.add(yokeGroup);
  registerInteractivePart(
    parts,
    yokeGroup,
    {
      id: 'orrery-yoke',
      labelZh: '雙臂承重支架',
      labelEn: 'Meridian Cradle Yoke',
      materialSpecZh: '深色陽極鍛造結構臂 (Roughness 0.50)',
      materialSpecEn: 'Anodized Structural Frame (Roughness 0.50)',
      category: 'frame',
    },
    [0, -0.18, -0.45]
  );

  // 3. Outer Meridian Gimbal Ring (Beveled ExtrudeGeometry)
  const outerGimbalGroup = new THREE.Group();
  outerGimbalGroup.position.set(0, 1.72, 0);
  const outerRingGeo = createBeveledRingGeometry(1.38, 1.24, 0.09, 0.02, 64);
  geometries.push(outerRingGeo);
  const outerRing = new THREE.Mesh(outerRingGeo, mats.hero);
  outerGimbalGroup.add(outerRing);

  const trunnionGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.24, 24);
  trunnionGeo.rotateZ(Math.PI / 2);
  geometries.push(trunnionGeo);
  const leftTrunnion = new THREE.Mesh(trunnionGeo, mats.frame);
  leftTrunnion.position.set(-1.38, 0, 0);
  const rightTrunnion = new THREE.Mesh(trunnionGeo, mats.frame);
  rightTrunnion.position.set(1.38, 0, 0);
  outerGimbalGroup.add(leftTrunnion, rightTrunnion);

  assembly.add(outerGimbalGroup);
  registerInteractivePart(
    parts,
    outerGimbalGroup,
    {
      id: 'orrery-outer-gimbal',
      labelZh: '外子午線陀螺環',
      labelEn: 'Outer Meridian Gimbal',
      materialSpecZh: '拉絲物理金屬清漆層 + 雙耳軸承',
      materialSpecEn: 'Brushed Physical Alloy + Precision Trunnions',
      category: 'hero',
    },
    [-0.55, 0.35, 0]
  );

  // 4. Inner Equatorial Gimbal Ring
  const innerGimbalGroup = new THREE.Group();
  innerGimbalGroup.position.set(0, 1.72, 0);
  innerGimbalGroup.rotation.set(0.42, 0.35, 0.25);
  const innerRingGeo = createBeveledRingGeometry(1.06, 0.94, 0.07, 0.018, 56);
  geometries.push(innerRingGeo);
  const innerRing = new THREE.Mesh(innerRingGeo, mats.hero);
  innerGimbalGroup.add(innerRing);

  assembly.add(innerGimbalGroup);
  registerInteractivePart(
    parts,
    innerGimbalGroup,
    {
      id: 'orrery-inner-gimbal',
      labelZh: '赤道傾角內環',
      labelEn: 'Equatorial Inclination Ring',
      materialSpecZh: '23.4° 傾角精密平衡環',
      materialSpecEn: 'Inclined Gimbal Ring (23.4° Offset)',
      category: 'hero',
    },
    [0.55, 0.42, 0.35]
  );

  // 5. Spoked Escapement Gear Wheel (ExtrudeGeometry)
  const gearGroup = new THREE.Group();
  gearGroup.position.set(0, 1.04, 0);
  gearGroup.rotation.x = Math.PI / 2;
  const gearGeo = createSpokedGearGeometry(0.84, 0.75, 0.20, 28, 6, 0.06);
  geometries.push(gearGeo);
  const gearMesh = new THREE.Mesh(gearGeo, mats.hero);
  gearGroup.add(gearMesh);

  assembly.add(gearGroup);
  registerInteractivePart(
    parts,
    gearGroup,
    {
      id: 'orrery-escapement-gear',
      labelZh: '28 齒鏤空擒縱主輪',
      labelEn: '28-Tooth Spoked Escapement Wheel',
      materialSpecZh: '倒角擠出成形齒輪 (6 輻條減重孔)',
      materialSpecEn: 'Beveled Extruded Gear (6 Cutout Spokes)',
      category: 'hero',
    },
    [0, -0.05, 0.58]
  );

  // 6. Central Luminous Solar Core & Cage
  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, 1.72, 0);
  const sunGeo = new THREE.IcosahedronGeometry(0.24, 2);
  geometries.push(sunGeo);
  const sunMesh = new THREE.Mesh(sunGeo, mats.accent);
  coreGroup.add(sunMesh);

  const cageGeo = new THREE.TorusGeometry(0.36, 0.022, 16, 48);
  geometries.push(cageGeo);
  const cageA = new THREE.Mesh(cageGeo, mats.frame);
  cageA.rotation.x = Math.PI / 3;
  const cageB = new THREE.Mesh(cageGeo, mats.frame);
  cageB.rotation.y = Math.PI / 3;
  coreGroup.add(cageA, cageB);

  assembly.add(coreGroup);
  registerInteractivePart(
    parts,
    coreGroup,
    {
      id: 'orrery-solar-core',
      labelZh: '恆星能量核心與護籠',
      labelEn: 'Radiant Solar Core & Armillary Cage',
      materialSpecZh: '自發光晶核 + 雙軸防護環',
      materialSpecEn: 'Emissive Core + Dual Armillary Bands',
      category: 'accent',
    },
    [0, 0.72, 0]
  );

  // 7. Articulated Planetary Armatures (3 orbital arms + satellites)
  const planetsGroup = new THREE.Group();
  planetsGroup.position.set(0, 1.72, 0);

  const planetConfigs = [
    { armRadius: 0.58, height: 0.14, size: 0.095, phase: 0.2, hasRing: false },
    { armRadius: 0.82, height: -0.18, size: 0.135, phase: 2.3, hasRing: true },
    { armRadius: 1.02, height: 0.24, size: 0.08, phase: 4.4, hasRing: false },
  ];

  const planetPivots: THREE.Group[] = [];
  planetConfigs.forEach((cfg) => {
    const pivot = new THREE.Group();
    pivot.rotation.y = cfg.phase;

    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.18, 0, 0),
      new THREE.Vector3(cfg.armRadius * 0.55, cfg.height * 0.5, 0.08),
      new THREE.Vector3(cfg.armRadius, cfg.height, 0),
    ]);
    const armGeo = new THREE.TubeGeometry(armCurve, 24, 0.018, 10, false);
    geometries.push(armGeo);
    pivot.add(new THREE.Mesh(armGeo, mats.frame));

    const bodyGeo = new THREE.SphereGeometry(cfg.size, 28, 28);
    geometries.push(bodyGeo);
    const body = new THREE.Mesh(bodyGeo, mats.hero);
    body.position.set(cfg.armRadius, cfg.height, 0);
    pivot.add(body);

    if (cfg.hasRing) {
      const satRingGeo = new THREE.TorusGeometry(cfg.size * 1.65, 0.016, 12, 36);
      satRingGeo.rotateX(Math.PI * 0.42);
      geometries.push(satRingGeo);
      const satRing = new THREE.Mesh(satRingGeo, mats.accent);
      satRing.position.copy(body.position);
      pivot.add(satRing);
    }

    planetPivots.push(pivot);
    planetsGroup.add(pivot);
  });

  assembly.add(planetsGroup);
  registerInteractivePart(
    parts,
    planetsGroup,
    {
      id: 'orrery-planets',
      labelZh: '行星軌道懸臂組',
      labelEn: 'Planetary Orbital Armatures',
      materialSpecZh: '三體衛星系統與土星環總成',
      materialSpecEn: 'Tri-Orbit Satellites & Ringed Body',
      category: 'hero',
    },
    [0, 0.48, -0.52]
  );

  snapGroupBaseToZero(assembly);
  parts.forEach((p) => p.homePos.copy(p.object.position));

  root.add(assembly);
  const contact = createContactShadowPlane(textures, 2.55, geometries);
  root.add(contact.mesh);

  return {
    root,
    parts,
    updateMotion: (_dt, elapsed) => {
      outerGimbalGroup.rotation.y = elapsed * 0.24;
      innerGimbalGroup.rotation.z = 0.25 + elapsed * 0.36;
      innerGimbalGroup.rotation.x = 0.42 + Math.sin(elapsed * 0.5) * 0.12;
      gearGroup.rotation.z = -elapsed * 0.42;
      coreGroup.rotation.y = elapsed * 0.65;
      planetPivots[0].rotation.y = 0.2 + elapsed * 0.72;
      planetPivots[1].rotation.y = 2.3 + elapsed * 0.44;
      planetPivots[2].rotation.y = 4.4 + elapsed * 0.28;
    },
    disposeGeometries: () => {
      geometries.forEach((g) => g.dispose());
      contact.material.dispose();
    },
  };
}

// ============================================================================
// SCENE 2: PAVILION OF LIGHT (ARCHITECTURAL TERRACE)
// ============================================================================
function buildPavilionModel(
  mats: StudioMaterialBundle,
  textures: ProceduralTextureSet
): BuiltSceneModel {
  const root = new THREE.Group();
  const assembly = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const parts: ExplodablePart[] = [];

  // 1. Stepped Terraced Travertine Foundation (ExtrudeGeometry)
  const terraceGroup = new THREE.Group();
  const baseShape = new THREE.Shape();
  baseShape.absarc(0, 0, 2.15, 0, Math.PI * 2, false);
  const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.04,
    bevelSegments: 3,
    curveSegments: 64,
  });
  baseGeo.rotateX(-Math.PI / 2);
  geometries.push(baseGeo);
  const baseSlab = new THREE.Mesh(baseGeo, mats.plinth);
  baseSlab.position.y = 0.035;
  terraceGroup.add(baseSlab);

  const midShape = new THREE.Shape();
  midShape.absarc(0, 0, 1.68, 0, Math.PI * 2, false);
  const midGeo = new THREE.ExtrudeGeometry(midShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 56,
  });
  midGeo.rotateX(-Math.PI / 2);
  geometries.push(midGeo);
  const midSlab = new THREE.Mesh(midGeo, mats.plinth);
  midSlab.position.y = 0.29;
  terraceGroup.add(midSlab);

  assembly.add(terraceGroup);
  registerInteractivePart(
    parts,
    terraceGroup,
    {
      id: 'pavilion-terrace',
      labelZh: '雙層斜角石材台階基座',
      labelEn: 'Beveled Travertine Terrace Plinth',
      materialSpecZh: '礦物紋理高糙度建築基座 (Roughness 0.88)',
      materialSpecEn: 'Mineral Travertine Slab (Roughness 0.88)',
      category: 'plinth',
    },
    [0, -0.45, 0]
  );

  // 2. Reflective Courtyard Pool & Brass Weir
  const poolGroup = new THREE.Group();
  const poolRingGeo = createBeveledRingGeometry(1.24, 1.12, 0.07, 0.015, 56);
  poolRingGeo.rotateX(Math.PI / 2);
  geometries.push(poolRingGeo);
  const poolRim = new THREE.Mesh(poolRingGeo, mats.frame);
  poolRim.position.y = 0.49;
  poolGroup.add(poolRim);

  const waterGeo = new THREE.CylinderGeometry(1.13, 1.13, 0.04, 56);
  geometries.push(waterGeo);
  const waterMesh = new THREE.Mesh(waterGeo, mats.water);
  waterMesh.position.y = 0.485;
  poolGroup.add(waterMesh);

  assembly.add(poolGroup);
  registerInteractivePart(
    parts,
    poolGroup,
    {
      id: 'pavilion-pool',
      labelZh: '鏡面水景中庭與金屬堰緣',
      labelEn: 'Reflecting Courtyard Water Basin',
      materialSpecZh: '高光澤清漆水體 + 深色金屬邊框',
      materialSpecEn: 'Clearcoat Water Surface + Metal Weir',
      category: 'accent',
    },
    [0, -0.1, 0.55]
  );

  // 3. Fluted Perimeter Colonnade (8 columns + Lathe capitals)
  const columnsGroup = new THREE.Group();
  const shaftGeo = new THREE.CylinderGeometry(0.068, 0.082, 1.28, 18);
  const capProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.08, 0.0),
    new THREE.Vector2(0.125, 0.06),
    new THREE.Vector2(0.135, 0.11),
    new THREE.Vector2(0.0, 0.11),
  ];
  const capGeo = new THREE.LatheGeometry(capProfile, 24);
  geometries.push(shaftGeo, capGeo);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const r = 1.46;
    const col = new THREE.Group();
    const shaft = new THREE.Mesh(shaftGeo, mats.hero);
    shaft.position.y = 1.12;
    const cap = new THREE.Mesh(capGeo, mats.frame);
    cap.position.y = 1.75;
    col.add(shaft, cap);
    col.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    columnsGroup.add(col);
  }

  assembly.add(columnsGroup);
  registerInteractivePart(
    parts,
    columnsGroup,
    {
      id: 'pavilion-colonnade',
      labelZh: '環形柱廊與柱頭飾件',
      labelEn: 'Fluted Perimeter Colonnade',
      materialSpecZh: '8 根環狀支撐立柱 + 車削柱頭',
      materialSpecEn: '8 Radial Columns + Turned Capitals',
      category: 'hero',
    },
    [-0.55, 0.25, 0]
  );

  // 4. Sweeping Parabolic Arch Ribs (TubeGeometry x 4)
  const ribsGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const rotY = (i / 4) * Math.PI;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.46, 1.84, 0),
      new THREE.Vector3(-0.78, 2.52, 0),
      new THREE.Vector3(0, 2.74, 0),
      new THREE.Vector3(0.78, 2.52, 0),
      new THREE.Vector3(1.46, 1.84, 0),
    ]);
    const ribGeo = new THREE.TubeGeometry(curve, 36, 0.042, 12, false);
    geometries.push(ribGeo);
    const ribMesh = new THREE.Mesh(ribGeo, mats.frame);
    ribMesh.rotation.y = rotY;
    ribsGroup.add(ribMesh);
  }
  assembly.add(ribsGroup);
  registerInteractivePart(
    parts,
    ribsGroup,
    {
      id: 'pavilion-ribs',
      labelZh: '雙曲拋物線拱肋結構',
      labelEn: 'Parabolic Vault Arch Ribs',
      materialSpecZh: '4 組交叉懸鏈線管狀拱肋',
      materialSpecEn: '4 Intersecting Catenary Structural Ribs',
      category: 'frame',
    },
    [0.45, 0.55, 0]
  );

  // 5. Oculus Canopy Crown Roof (LatheGeometry + Bevel Ring)
  const canopyGroup = new THREE.Group();
  const roofProfile = [
    new THREE.Vector2(0.42, 0.0),
    new THREE.Vector2(0.95, -0.06),
    new THREE.Vector2(1.58, -0.28),
    new THREE.Vector2(1.74, -0.34),
    new THREE.Vector2(1.74, -0.25),
    new THREE.Vector2(1.12, -0.02),
    new THREE.Vector2(0.45, 0.06),
    new THREE.Vector2(0.42, 0.0),
  ];
  const roofGeo = new THREE.LatheGeometry(roofProfile, 56);
  geometries.push(roofGeo);
  const roofMesh = new THREE.Mesh(roofGeo, mats.hero);
  roofMesh.position.y = 2.72;
  canopyGroup.add(roofMesh);

  const oculusRimGeo = createBeveledRingGeometry(0.46, 0.36, 0.08, 0.015, 48);
  oculusRimGeo.rotateX(Math.PI / 2);
  geometries.push(oculusRimGeo);
  const oculusRim = new THREE.Mesh(oculusRimGeo, mats.frame);
  oculusRim.position.y = 2.76;
  canopyGroup.add(oculusRim);

  assembly.add(canopyGroup);
  registerInteractivePart(
    parts,
    canopyGroup,
    {
      id: 'pavilion-canopy',
      labelZh: '天窗穹頂薄殼與採光圈',
      labelEn: 'Oculus Shell Roof Canopy',
      materialSpecZh: '車削流線金屬薄殼 + 中央天窗框',
      materialSpecEn: 'Turned Shell Canopy + Oculus Skylight Ring',
      category: 'hero',
    },
    [0, 0.92, 0]
  );

  // 6. Helical Spiral Staircase & Central Lantern Hearth
  const stairGroup = new THREE.Group();
  const mastGeo = new THREE.CylinderGeometry(0.065, 0.065, 1.85, 20);
  const stepGeo = new THREE.BoxGeometry(0.42, 0.036, 0.17);
  geometries.push(mastGeo, stepGeo);

  const mast = new THREE.Mesh(mastGeo, mats.frame);
  mast.position.y = 1.42;
  stairGroup.add(mast);

  for (let s = 0; s < 14; s++) {
    const a = s * 0.36;
    const step = new THREE.Mesh(stepGeo, mats.hero);
    step.position.set(Math.cos(a) * 0.24, 0.56 + s * 0.11, Math.sin(a) * 0.24);
    step.rotation.y = -a;
    stairGroup.add(step);
  }

  const lanternGeo = new THREE.OctahedronGeometry(0.16, 1);
  geometries.push(lanternGeo);
  const lantern = new THREE.Mesh(lanternGeo, mats.accent);
  lantern.position.y = 2.42;
  stairGroup.add(lantern);

  assembly.add(stairGroup);
  registerInteractivePart(
    parts,
    stairGroup,
    {
      id: 'pavilion-stair',
      labelZh: '螺旋階梯軸心與光核燈籠',
      labelEn: 'Helical Staircase & Beacon Core',
      materialSpecZh: '14 階懸臂踏階 + 發光多面體燈核',
      materialSpecEn: '14 Cantilever Treads + Radiant Core',
      category: 'accent',
    },
    [0, 0.32, -0.58]
  );

  // 7. Instanced Courtyard Cypress Grove & Perimeter Stones (InstancedMesh, 28 elements)
  const groveGroup = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.024, 0.034, 0.24, 10);
  const crownGeo = new THREE.ConeGeometry(0.14, 0.44, 12);
  const boulderGeo = new THREE.DodecahedronGeometry(0.11, 1);
  geometries.push(trunkGeo, crownGeo, boulderGeo);

  const treeCount = 14;
  const stoneCount = 14;
  const trunks = new THREE.InstancedMesh(trunkGeo, mats.frame, treeCount);
  const crowns = new THREE.InstancedMesh(crownGeo, mats.foliage, treeCount);
  const boulders = new THREE.InstancedMesh(boulderGeo, mats.plinth, stoneCount);

  const d = new THREE.Object3D();
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + 0.18;
    const r = 1.84 + (i % 2) * 0.14;
    const s = 0.85 + ((i * 37) % 10) * 0.045;
    d.position.set(Math.cos(angle) * r, 0.36 + 0.1 * s, Math.sin(angle) * r);
    d.rotation.set(0, angle, 0);
    d.scale.set(s, s, s);
    d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix);

    d.position.set(Math.cos(angle) * r, 0.56 + 0.18 * s, Math.sin(angle) * r);
    d.updateMatrix();
    crowns.setMatrixAt(i, d.matrix);
  }
  for (let i = 0; i < stoneCount; i++) {
    const angle = (i / stoneCount) * Math.PI * 2 + 0.06;
    const r = 1.92 - (i % 3) * 0.08;
    const s = 0.7 + ((i * 23) % 7) * 0.12;
    d.position.set(Math.cos(angle) * r, 0.31, Math.sin(angle) * r);
    d.rotation.set(i * 0.5, i * 1.1, 0);
    d.scale.set(s * 1.3, s * 0.65, s);
    d.updateMatrix();
    boulders.setMatrixAt(i, d.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  boulders.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere();
  crowns.computeBoundingSphere();
  boulders.computeBoundingSphere();

  groveGroup.add(trunks, crowns, boulders);
  assembly.add(groveGroup);
  registerInteractivePart(
    parts,
    groveGroup,
    {
      id: 'pavilion-grove',
      labelZh: '庭園植栽與邊緣景石陣列',
      labelEn: 'Instanced Courtyard Grove & Stones',
      materialSpecZh: '28 件實例化樹冠與景石批次算繪',
      materialSpecEn: '28 Instanced Trees & Perimeter Boulders',
      category: 'plinth',
    },
    [0.52, -0.1, 0.45]
  );

  snapGroupBaseToZero(assembly);
  parts.forEach((p) => p.homePos.copy(p.object.position));

  root.add(assembly);
  const contact = createContactShadowPlane(textures, 2.95, geometries);
  root.add(contact.mesh);

  return {
    root,
    parts,
    updateMotion: (_dt, elapsed) => {
      lantern.rotation.y = elapsed * 0.9;
      lantern.position.y = 2.42 + Math.sin(elapsed * 2.1) * 0.05;
    },
    disposeGeometries: () => {
      geometries.forEach((g) => g.dispose());
      contact.material.dispose();
    },
  };
}

// ============================================================================
// SCENE 3: AERO-TURBULENCE TURBOFAN RIG
// ============================================================================
function buildTurbineModel(
  mats: StudioMaterialBundle,
  textures: ProceduralTextureSet
): BuiltSceneModel {
  const root = new THREE.Group();
  const assembly = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const parts: ExplodablePart[] = [];

  // 1. Slotted Industrial Test-Rig Bedplate & Gusset Cradle
  const bedGroup = new THREE.Group();
  const bedShape = new THREE.Shape();
  bedShape.moveTo(-1.35, -1.05);
  bedShape.lineTo(1.35, -1.05);
  bedShape.lineTo(1.35, 1.05);
  bedShape.lineTo(-1.35, 1.05);
  bedShape.closePath();

  const bedGeo = new THREE.ExtrudeGeometry(bedShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  bedGeo.rotateX(-Math.PI / 2);
  geometries.push(bedGeo);
  const bedMesh = new THREE.Mesh(bedGeo, mats.plinth);
  bedMesh.position.y = 0.03;
  bedGroup.add(bedMesh);

  // Twin A-Frame Cradle Struts
  const gussetShape = new THREE.Shape();
  gussetShape.moveTo(-0.72, 0);
  gussetShape.lineTo(0.72, 0);
  gussetShape.lineTo(0.46, 0.72);
  gussetShape.lineTo(-0.46, 0.72);
  gussetShape.closePath();
  const cutCircle = new THREE.Path();
  cutCircle.absarc(0, 0.34, 0.17, 0, Math.PI * 2, true);
  gussetShape.holes.push(cutCircle);

  const gussetGeo = new THREE.ExtrudeGeometry(gussetShape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.018,
    bevelSegments: 2,
  });
  gussetGeo.center();
  geometries.push(gussetGeo);

  const frontCradle = new THREE.Mesh(gussetGeo, mats.frame);
  frontCradle.position.set(0, 0.56, 0.42);
  const rearCradle = new THREE.Mesh(gussetGeo, mats.frame);
  rearCradle.position.set(0, 0.56, -0.42);
  bedGroup.add(frontCradle, rearCradle);

  assembly.add(bedGroup);
  registerInteractivePart(
    parts,
    bedGroup,
    {
      id: 'turbine-cradle',
      labelZh: '測試台架與雙柱減重肋板',
      labelEn: 'Engine Test-Rig Bed & Cradle Gussets',
      materialSpecZh: '複合石材測試底座 + 鏤空結構支撐肋',
      materialSpecEn: 'Engineered Bedplate + Pierced Frame Gussets',
      category: 'plinth',
    },
    [0, -0.48, 0]
  );

  // 2. Aerodynamic Intake Nacelle Shroud (LatheGeometry)
  const shroudGroup = new THREE.Group();
  shroudGroup.position.set(0, 1.50, 0);
  const cowlProfile = [
    new THREE.Vector2(1.06, 0.96),
    new THREE.Vector2(1.16, 0.92),
    new THREE.Vector2(1.24, 0.64),
    new THREE.Vector2(1.26, 0.12),
    new THREE.Vector2(1.20, -0.58),
    new THREE.Vector2(1.10, -0.58),
    new THREE.Vector2(1.08, 0.25),
    new THREE.Vector2(1.01, 0.72),
    new THREE.Vector2(1.06, 0.96),
  ];
  const cowlGeo = new THREE.LatheGeometry(cowlProfile, 64);
  cowlGeo.rotateX(Math.PI / 2);
  geometries.push(cowlGeo);
  const cowlMesh = new THREE.Mesh(cowlGeo, mats.hero);
  shroudGroup.add(cowlMesh);

  // 24 Instanced Flange Bolts around cowl collar (InstancedMesh)
  const boltGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.04, 8);
  boltGeo.rotateX(Math.PI / 2);
  geometries.push(boltGeo);
  const bolts = new THREE.InstancedMesh(boltGeo, mats.frame, 24);
  const bDummy = new THREE.Object3D();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    bDummy.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0.92);
    bDummy.rotation.set(0, 0, a);
    bDummy.updateMatrix();
    bolts.setMatrixAt(i, bDummy.matrix);
  }
  bolts.instanceMatrix.needsUpdate = true;
  bolts.computeBoundingSphere();
  shroudGroup.add(bolts);

  assembly.add(shroudGroup);
  registerInteractivePart(
    parts,
    shroudGroup,
    {
      id: 'turbine-nacelle',
      labelZh: '流線進氣短艙外罩與螺栓環',
      labelEn: 'Aerodynamic Nacelle Cowl & Flange Bolts',
      materialSpecZh: '車削流線進氣唇緣 + 24 顆緊固螺栓',
      materialSpecEn: 'Turned Intake Lip + 24 Instanced Bolts',
      category: 'hero',
    },
    [0, 0.36, 0.58]
  );

  // 3. Exhaust Diffuser Nozzle Cone (LatheGeometry)
  const nozzleGroup = new THREE.Group();
  nozzleGroup.position.set(0, 1.50, -0.78);
  const nozzleProfile = [
    new THREE.Vector2(0.84, 0.24),
    new THREE.Vector2(1.08, 0.22),
    new THREE.Vector2(0.92, -0.52),
    new THREE.Vector2(0.74, -0.52),
    new THREE.Vector2(0.84, 0.24),
  ];
  const nozzleGeo = new THREE.LatheGeometry(nozzleProfile, 56);
  nozzleGeo.rotateX(Math.PI / 2);
  geometries.push(nozzleGeo);
  nozzleGroup.add(new THREE.Mesh(nozzleGeo, mats.frame));

  const corePlugProfile = [
    new THREE.Vector2(0.0, -0.95),
    new THREE.Vector2(0.18, -0.62),
    new THREE.Vector2(0.42, -0.15),
    new THREE.Vector2(0.44, 0.22),
    new THREE.Vector2(0.0, 0.22),
  ];
  const plugGeo = new THREE.LatheGeometry(corePlugProfile, 40);
  plugGeo.rotateX(Math.PI / 2);
  geometries.push(plugGeo);
  nozzleGroup.add(new THREE.Mesh(plugGeo, mats.hero));

  assembly.add(nozzleGroup);
  registerInteractivePart(
    parts,
    nozzleGroup,
    {
      id: 'turbine-nozzle',
      labelZh: '收斂擴散尾噴口與導流錐',
      labelEn: 'Convergent Exhaust Nozzle & Core Plug',
      materialSpecZh: '耐高溫深色導流罩 + 金屬尾錐',
      materialSpecEn: 'High-Temp Shroud + Turned Tail Cone',
      category: 'frame',
    },
    [0, 0.16, -0.82]
  );

  // 4. Swept Airfoil Fan Rotor (18 InstancedMesh Blades + Hub + Ogive Spinner)
  const rotorGroup = new THREE.Group();
  rotorGroup.position.set(0, 1.50, 0.42);

  const hubGeo = new THREE.CylinderGeometry(0.36, 0.38, 0.34, 40);
  hubGeo.rotateX(Math.PI / 2);
  geometries.push(hubGeo);
  rotorGroup.add(new THREE.Mesh(hubGeo, mats.frame));

  const spinnerProfile = [
    new THREE.Vector2(0.0, 0.62),
    new THREE.Vector2(0.14, 0.46),
    new THREE.Vector2(0.28, 0.22),
    new THREE.Vector2(0.355, 0.0),
    new THREE.Vector2(0.0, 0.0),
  ];
  const spinnerGeo = new THREE.LatheGeometry(spinnerProfile, 48);
  spinnerGeo.rotateX(Math.PI / 2);
  geometries.push(spinnerGeo);
  const spinner = new THREE.Mesh(spinnerGeo, mats.accent);
  spinner.position.z = 0.16;
  rotorGroup.add(spinner);

  // Airfoil Blade Geometry (ExtrudeGeometry)
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.08, 0.0);
  bladeShape.quadraticCurveTo(-0.11, 0.34, -0.04, 0.64);
  bladeShape.lineTo(0.09, 0.63);
  bladeShape.quadraticCurveTo(0.10, 0.30, 0.07, 0.0);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  bladeGeo.translate(0, 0, -0.011);
  geometries.push(bladeGeo);

  const bladeCount = 18;
  const bladesInstanced = new THREE.InstancedMesh(bladeGeo, mats.hero, bladeCount);
  const rDummy = new THREE.Object3D();
  for (let i = 0; i < bladeCount; i++) {
    const theta = (i / bladeCount) * Math.PI * 2;
    rDummy.position.set(Math.cos(theta) * 0.32, Math.sin(theta) * 0.32, 0);
    rDummy.rotation.set(0, 0, theta - Math.PI / 2);
    rDummy.rotateY(0.46); // pitch angle
    rDummy.updateMatrix();
    bladesInstanced.setMatrixAt(i, rDummy.matrix);
  }
  bladesInstanced.instanceMatrix.needsUpdate = true;
  bladesInstanced.computeBoundingSphere();
  rotorGroup.add(bladesInstanced);

  assembly.add(rotorGroup);
  registerInteractivePart(
    parts,
    rotorGroup,
    {
      id: 'turbine-rotor',
      labelZh: '18 葉後掠寬弦轉子總成',
      labelEn: '18-Blade Swept Airfoil Rotor',
      materialSpecZh: '廣弦翼型實例葉片 + 拋物線導流鼻錐',
      materialSpecEn: 'Instanced Airfoil Blades + Ogive Spinner',
      category: 'hero',
    },
    [0, 0.45, 0.92]
  );

  // 5. Internal Stator Vane Ring
  const statorGroup = new THREE.Group();
  statorGroup.position.set(0, 1.50, -0.18);
  const statorRingGeo = createBeveledRingGeometry(0.98, 0.88, 0.06, 0.012, 48);
  geometries.push(statorRingGeo);
  statorGroup.add(new THREE.Mesh(statorRingGeo, mats.frame));

  const vaneGeo = new THREE.BoxGeometry(0.025, 0.56, 0.14);
  geometries.push(vaneGeo);
  const vanes = new THREE.InstancedMesh(vaneGeo, mats.hero, 12);
  const vDummy = new THREE.Object3D();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    vDummy.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0);
    vDummy.rotation.set(0.24, 0, a - Math.PI / 2);
    vDummy.updateMatrix();
    vanes.setMatrixAt(i, vDummy.matrix);
  }
  vanes.instanceMatrix.needsUpdate = true;
  vanes.computeBoundingSphere();
  statorGroup.add(vanes);

  assembly.add(statorGroup);
  registerInteractivePart(
    parts,
    statorGroup,
    {
      id: 'turbine-stator',
      labelZh: '靜子整流導葉環',
      labelEn: 'Bypass Stator Vane Stage',
      materialSpecZh: '12 組斜角靜子整流導葉',
      materialSpecEn: '12 Radial Stator Diffuser Vanes',
      category: 'frame',
    },
    [-0.58, 0.18, -0.15]
  );

  // 6. Telemetry Manifold & Swept Conduits (TubeGeometry)
  const conduitGroup = new THREE.Group();
  const manifoldGeo = new THREE.BoxGeometry(0.32, 0.18, 0.48);
  geometries.push(manifoldGeo);
  const manifold = new THREE.Mesh(manifoldGeo, mats.frame);
  manifold.position.set(1.12, 0.34, 0.05);
  conduitGroup.add(manifold);

  [-0.12, 0, 0.12].forEach((zOff) => {
    const cCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.12, 0.42, 0.05 + zOff),
      new THREE.Vector3(1.36, 0.78, 0.05 + zOff * 0.8),
      new THREE.Vector3(1.34, 1.24, 0.05 + zOff * 0.5),
      new THREE.Vector3(1.18, 1.48, 0.05 + zOff * 0.4),
    ]);
    const cGeo = new THREE.TubeGeometry(cCurve, 28, 0.022, 10, false);
    geometries.push(cGeo);
    conduitGroup.add(new THREE.Mesh(cGeo, mats.accent));
  });

  assembly.add(conduitGroup);
  registerInteractivePart(
    parts,
    conduitGroup,
    {
      id: 'turbine-conduits',
      labelZh: '遙測傳感匯流排與導管組',
      labelEn: 'Telemetry Manifold & Fluid Conduits',
      materialSpecZh: '三線曲率導管 + 側邊數據匯流閥塊',
      materialSpecEn: 'Tri-Tube Sensor Conduits + Side Manifold',
      category: 'accent',
    },
    [0.72, 0.08, 0]
  );

  snapGroupBaseToZero(assembly);
  parts.forEach((p) => p.homePos.copy(p.object.position));

  root.add(assembly);
  const contact = createContactShadowPlane(textures, 2.75, geometries);
  root.add(contact.mesh);

  return {
    root,
    parts,
    updateMotion: (_dt, elapsed) => {
      rotorGroup.rotation.z = -elapsed * 2.4;
    },
    disposeGeometries: () => {
      geometries.forEach((g) => g.dispose());
      contact.material.dispose();
    },
  };
}

export function buildProceduralScene(
  type: Scene3DType,
  mats: StudioMaterialBundle,
  textures: ProceduralTextureSet
): BuiltSceneModel {
  switch (type) {
    case 'orrery':
      return buildOrreryModel(mats, textures);
    case 'pavilion':
      return buildPavilionModel(mats, textures);
    case 'turbine':
      return buildTurbineModel(mats, textures);
  }
}
