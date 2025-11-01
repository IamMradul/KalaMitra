type Object3D = InstanceType<typeof import('three')["Object3D"]>;
// Helper: create a simple human avatar (cylinder body, sphere head)
function createSimpleAvatar(color: number = 0x3b82f6): InstanceType<typeof THREE.Group> {
  const group = new THREE.Group();
  // Taller body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.95, 16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
  );
  body.position.y = 0.475;
  body.userData.isAvatarPart = true;
  group.add(body);
  // Larger head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffe0bd, roughness: 0.4 })
  );
  head.position.y = 1.08;
  head.userData.isAvatarPart = true;
  group.add(head);
  // Simple face: eyes and mouth
  // Eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
  leftEye.position.set(-0.06, 1.15, 0.19);
  leftEye.userData.isAvatarPart = true;
  group.add(leftEye);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
  rightEye.position.set(0.06, 1.15, 0.19);
  rightEye.userData.isAvatarPart = true;
  group.add(rightEye);
  // Mouth
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x8d5524 });
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8), mouthMat);
  mouth.position.set(0, 1.09, 0.21);
  mouth.rotation.x = Math.PI / 2;
  mouth.userData.isAvatarPart = true;
  group.add(mouth);
  // Arms
  const armMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.38, 12), armMat);
  leftArm.position.set(-0.22, 0.75, 0);
  leftArm.rotation.z = Math.PI / 5;
  leftArm.userData.isAvatarPart = true;
  group.add(leftArm);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.38, 12), armMat);
  rightArm.position.set(0.22, 0.75, 0);
  rightArm.rotation.z = -Math.PI / 5;
  rightArm.userData.isAvatarPart = true;
  group.add(rightArm);
  group.scale.set(2, 2, 2); // Double the size in all dimensions
  return group;
}
import * as THREE from 'three';

// Use InstanceType for MeshStandardMaterial type assertion
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { supabase } from '../lib/supabase';
type Mesh = InstanceType<typeof import('three')['Mesh']>;
type Group = InstanceType<typeof import('three')['Group']>;
type Scene = InstanceType<typeof import('three')['Scene']>;
type PerspectiveCamera = InstanceType<typeof import('three')['PerspectiveCamera']>;
type WebGLRenderer = InstanceType<typeof import('three')['WebGLRenderer']>;

export interface MarketBillboard {
  id: string;
  mesh: Mesh;
}

export interface MarketStall {
  sellerId: string;
  group: Group;
  billboards: MarketBillboard[];
  gotoButton?: Mesh;
}

export interface MarketplaceRefs {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  stalls: MarketStall[];
  resize: () => void;
  dispose: () => void;
  start: () => void;
  stop: () => void;
}

export type StallInput = {
  sellerId: string;
  productImages: { id: string; url: string }[];
  storeName?: string;
  addAvatar?: boolean;
  stallTheme?: string;
  welcomeMessage?: string;
  decor?: Record<string, string | number | boolean | null>;
  featuredProductIds?: string[];
};

function createDecorUmbrella(): Group {
  const g = new THREE.Group();
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: 0.1, roughness: 0.8 }));
  canopy.position.y = 0.55;
  g.add(canopy);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 24), new THREE.MeshStandardMaterial({ color: 0xe84393 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.3;
  g.add(rim);
  for (let i = 0; i < 6; i++) {
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0x2ecc71 }));
    const a = (i / 6) * Math.PI * 2;
    tassel.position.set(Math.cos(a) * 0.52, 0.18, Math.sin(a) * 0.52);
    g.add(tassel);
  }
  return g;
}

function createLantern(): Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), new THREE.MeshStandardMaterial({ color: 0xf1c40f, emissive: 0x8a6d1f, emissiveIntensity: 0.2 }));
  g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0xf39c12 }));
  tail.position.y = -0.35;
  g.add(tail);
  return g;
}

function createWheel(): Mesh {
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 12, 24), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
  wheel.rotation.z = Math.PI / 2;
  wheel.castShadow = true;
  return wheel;
}

function createStallStructure(): Group {
  const group = new THREE.Group();

  const groundGeom = new THREE.PlaneGeometry(10, 10);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xcab38e });
  // Avoid z-fighting with the main plaza by offsetting and lifting slightly
  groundMat.polygonOffset = true;
  groundMat.polygonOffsetFactor = 1;
  groundMat.polygonOffsetUnits = 1;
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.y = 0.03;
  group.add(ground);

  const table = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 2.2), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
  table.position.set(0, 0.25, 0);
  table.castShadow = true;
  table.receiveShadow = true;
  group.add(table);

  const postGeom = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 12);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5a4633 });
  [[-3.2, -1.2],[3.2, -1.2],[-3.2, 1.2],[3.2, 1.2]].forEach(([x,z]) => {
    const post = new THREE.Mesh(postGeom, postMat);
    post.position.set(x, 1.6, z);
    post.castShadow = true;
    group.add(post);
  });

  const canopy = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.2), new THREE.MeshStandardMaterial({ color: 0xd04a02, side: THREE.DoubleSide }));
  canopy.rotation.x = Math.PI / 2.2;
  canopy.position.set(0, 3.3, -0.05);
  canopy.castShadow = true;
  group.add(canopy);

  const buntingMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f });
  for (let i = -3; i <= 3; i++) {
    const tri = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.02), buntingMat);
    tri.position.set(i, 2.0 + Math.random() * 0.2, 1.25);
    group.add(tri);
  }

  // Colorful drapes (two long planes with vibrant colors)
  const drapeMat1 = new THREE.MeshStandardMaterial({ color: 0x9b59b6, side: THREE.DoubleSide });
  const drape1 = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.8, 1, 1), drapeMat1);
  drape1.position.set(0, 2.4, -1.26); // moved behind so products stay visible
  drape1.rotation.y = 0;
  group.add(drape1);

  const drapeMat2 = new THREE.MeshStandardMaterial({ color: 0xfed330, side: THREE.DoubleSide });
  const drape2 = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.7, 1, 1), drapeMat2);
  drape2.position.set(0, 1.85, -1.27);
  drape2.rotation.y = 0;
  group.add(drape2);

  // Decorative umbrellas and lanterns
  const umbLeft = createDecorUmbrella();
  umbLeft.position.set(-3.2, 2.8, -1.05); // behind stall
  group.add(umbLeft);
  const umbRight = createDecorUmbrella();
  umbRight.position.set(3.2, 2.8, -1.05); // behind stall
  group.add(umbRight);

  const lantern = createLantern();
  lantern.position.set(0, 2.6, -1.15);
  group.add(lantern);

  // Wheels to evoke haat cart style
  const wheelL = createWheel();
  wheelL.position.set(-3.5, 0.82, 1.35);
  group.add(wheelL);
  const wheelR = createWheel();
  wheelR.position.set(3.5, 0.82, 1.35);
  group.add(wheelR);

  return group;
}

function createBillboard(url: string, w = 1.0, h = 1.25): Mesh {
  // Handle empty or invalid URLs
  if (!url || url.trim() === '') {
    // Create a placeholder billboard with a default texture
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0xcccccc, 
      transparent: true,
      opacity: 0.8 
    });
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }
  
  const tex = new THREE.TextureLoader().load(
    url,
    undefined, // onLoad
    undefined, // onProgress
    (error: unknown) => {
      console.warn('Failed to load texture for 3D bazaar:', url, error);
    }
  );

  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const geo = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export async function initMarketplaceScene(
  canvas: HTMLCanvasElement,
  stallsInput: StallInput[],
  dayMode: boolean = false
): Promise<MarketplaceRefs> {
  const scene = new THREE.Scene();
  let cloudGroup: typeof THREE.Group.prototype | null = null;
  let cloudAnimOffsets: { baseX: number; baseY: number; baseZ: number; speed: number; phase: number }[] = [];
  if (dayMode) {
    scene.background = new THREE.Color(0xcbeefd); // light blue sky
    cloudGroup = new THREE.Group();
    cloudAnimOffsets = [];
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Group();
      const baseY = 18 + Math.random() * 6;
      const baseZ = -20 + Math.random() * 40;
      const baseX = -20 + Math.random() * 40;
      for (let j = -1; j <= 1; j++) {
        const radius = 1.7 + Math.random() * 0.3;
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 32, 32),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, transparent: false, opacity: 1 })
        );
        sphere.position.set(j * radius * 0.85, Math.abs(j) * 0.4, 0);
        cloud.add(sphere);
      }
      for (let j = -2; j <= 2; j += 4) {
        const radius = 1.0 + Math.random() * 0.2;
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 32, 32),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, transparent: false, opacity: 1 })
        );
        sphere.position.set(j * 1.4, 0.6 + Math.random() * 0.2, 0);
        cloud.add(sphere);
      }
      cloud.position.set(baseX, baseY, baseZ);
      cloudGroup.add(cloud);
      cloudAnimOffsets.push({ baseX, baseY, baseZ, speed: 0.18 + Math.random() * 0.12, phase: Math.random() * Math.PI * 2 });
    }
    scene.add(cloudGroup);
  } else {
    scene.background = new THREE.Color(0x0b0f16); // slightly lighter night blue
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
  camera.position.set(8, 6, 12);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.enablePan = true;
  controls.enableRotate = true;
  controls.enableZoom = true;
  controls.minDistance = 2;
  controls.maxDistance = 35;
  controls.rotateSpeed = 0.9;
  controls.panSpeed = 0.8;
  controls.zoomSpeed = 0.9;
  controls.screenSpacePanning = true;
  (controls as unknown as { zoomToCursor?: boolean }).zoomToCursor = true;
  controls.maxPolarAngle = Math.PI * 0.49; // stay above ground
  controls.target.set(0, 1.2, 0);

  let ambient: InstanceType<typeof import('three')['AmbientLight']>;
  let dir: InstanceType<typeof import('three')['DirectionalLight']>;
  if (dayMode) {
    ambient = new THREE.AmbientLight(0xffffff, 0.55);
    dir = new THREE.DirectionalLight(0xfff7e0, 0.85); // sunlight
    dir.position.set(-30, 40, -10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
  } else {
    ambient = new THREE.AmbientLight(0xffffff, 0.22);
    dir = new THREE.DirectionalLight(0xbfdfff, 0.25); // soft moonlight
    dir.position.set(-30, 25, -10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
  }
  scene.add(ambient);
  scene.add(dir);

  // Large ground to walk around (dynamic size based on stall count)
  const groundColor = dayMode ? 0xf7e9c4 : 0x2a2a2a;
  let groundW = 90, groundH = 60;
  let cols = 3, rows = 1;
  const colSpacing = 18, rowSpacing = 14;
  // Use only currently visible stalls for ground sizing (pagination/infinite scroll)
  const pageSize = 6;
  const visibleStalls = Array.isArray(stallsInput) ? stallsInput.slice(0, pageSize) : [];
  const visibleCount = visibleStalls.length;
  if (visibleCount > 0) {
    const minCols = 3, minRows = 3;
    if (visibleCount <= minCols * minRows) {
      cols = minCols;
      rows = minRows;
    } else {
      cols = Math.max(minCols, Math.floor(groundW / colSpacing));
      cols = Math.min(cols, visibleCount);
      rows = Math.ceil(visibleCount / cols);
    }
    groundW = Math.max(90, cols * (colSpacing * 0.75));
    groundH = Math.max(60, rows * rowSpacing + rowSpacing * 3.2);
  }
  // Center the ground so it covers both the front and last edge
  let groundCenterZ = 0;
  if (visibleCount > 0) {
    const rows = Math.ceil(visibleCount / 3);
    groundCenterZ = rowSpacing * 0.6;
  }
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(groundW, groundH), new THREE.MeshStandardMaterial({ color: groundColor, roughness: 1 }));
  plaza.position.z = groundCenterZ;
  plaza.rotation.x = -Math.PI / 2;
  plaza.receiveShadow = true;
  plaza.name = "ground";
  plaza.userData.ground = true;
  scene.add(plaza);

  // Add vibrant bazaar decorations in background
  const addOverheadBuntings = () => {
    const colors = [0xe74c3c, 0xf1c40f, 0x2ecc71, 0x3498db, 0x9b59b6];
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const y = 4.0 + r * 0.4;
        for (let i = -10; i <= 10; i++) {
          const tri = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.32, 8), new THREE.MeshStandardMaterial({ color: colors[(i + r + c + 500) % colors.length] }));
          tri.position.set(i * 2.2 + c * 12, y - Math.abs(i) * 0.05, -8 + r * 2);
          tri.rotation.x = Math.PI;
          scene.add(tri);
        }
      }
    }
  };

  const addGateArches = () => {
    const arch = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xb86b00, roughness: 0.8 });
    const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4.2, 16), baseMat);
    colL.position.set(-3.8, 2.1, 0);
    const colR = colL.clone();
    colR.position.x = 3.8;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.25, 12, 48, Math.PI), new THREE.MeshStandardMaterial({ color: 0xd35400 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 4.1;
    arch.add(colL, colR, ring);
    // Calculate dynamic gate positions based on stall count
    // Assume stalls are laid out in rows, each row spaced by rowSpacing and colSpacing
    // Place gates well outside the furthest stall positions
    let maxCol = 2, maxRow = 1;
    if (typeof stallsInput !== 'undefined' && Array.isArray(stallsInput)) {
      const total = stallsInput.length;
      maxCol = Math.min(2, (total - 1) % 3);
      maxRow = Math.floor((total - 1) / 3);
    }
    const colSpacing = 18, rowSpacing = 14;
    // arch1: center, last edge (behind last row)
    let centerX = 0, lastEdgeZ = 0;
    if (typeof stallsInput !== 'undefined' && Array.isArray(stallsInput)) {
      const total = stallsInput.length;
      const lastRow = Math.floor((total - 1) / 3);
      lastEdgeZ = (lastRow - 0.5) * rowSpacing + rowSpacing * 0.7;
      centerX = 0;
    }
    const arch1 = arch.clone();
    arch1.position.set(centerX, 0, lastEdgeZ);

    // arch2: left column, one row ahead of front row
    let leftColX = 0, aheadRowZ = 0;
    if (typeof stallsInput !== 'undefined' && Array.isArray(stallsInput)) {
      // One row ahead of front row (row 0)
      aheadRowZ = -(0.5) * rowSpacing - rowSpacing;
      leftColX = -colSpacing;
    }
    const arch2 = arch.clone();
    arch2.position.set(leftColX, 0, aheadRowZ);
    scene.add(arch1, arch2);
  };

  const addStringLights = () => {
    const mat = new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xfff3b0, emissiveIntensity: 0.6 });
    for (let k = -2; k <= 2; k++) {
      for (let i = -12; i <= 12; i += 2) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), mat);
        bulb.position.set(i * 1.5, 3.6 + Math.sin(i * 0.3 + k) * 0.2, k * 8);
        scene.add(bulb);
      }
    }
  };

  addOverheadBuntings();
  addGateArches();
  addStringLights();

  if (dayMode) {
    // Add sun
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(4, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xfff7b2, emissive: 0xffe066, emissiveIntensity: 0.7, roughness: 0.7 })
    );
    sun.position.set(-35, 38, -25);
    sun.castShadow = false;
    scene.add(sun);
  } else {
    // Night sky: stars and moon
    const addStars = () => {
      const starCount = 800;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        positions[i3 + 0] = (Math.random() - 0.5) * 200;
        positions[i3 + 1] = Math.random() * 80 + 10;
        positions[i3 + 2] = (Math.random() - 0.5) * 200;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
    };

    const addMoon = () => {
      const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 24, 24), new THREE.MeshStandardMaterial({ color: 0xf0f0f0, emissive: 0x888888, emissiveIntensity: 0.8, roughness: 0.9 }));
      moon.position.set(-35, 28, -25);
      moon.castShadow = false;
      scene.add(moon);
    };

    addStars();
    addMoon();
  }

  const stalls: MarketStall[] = [];
  // ...existing code...
  // Fetch seller names from Supabase for label display
  const sellerIds = stallsInput.map(s => s.sellerId);
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', sellerIds);
  if (error) {
    console.warn('Error fetching seller profiles:', error);
  }
  const sellerNameMap: Record<string, string> = {};
  if (profiles) {
    profiles.forEach((profile: { id: string; name: string }) => {
      sellerNameMap[profile.id] = profile.name;
    });
  }

  stallsInput.forEach((stall, idx) => {
    // 1. THEME: Choose stall structure based on theme
    let sGroup: Group;
    switch (stall.stallTheme) {
      case 'modern':
        sGroup = createStallStructureModern(stall.decor);
        break;
      case 'festive':
        sGroup = createStallStructureFestive(stall.decor);
        break;
      case 'classic':
      default:
        sGroup = createStallStructureClassic(stall.decor);
        break;
    }
  const row = Math.floor(idx / cols);
  const col = idx % cols;
  // Center stalls horizontally
  const xOffset = (col - (cols - 1) / 2) * colSpacing;
  const zOffset = (row - 0.5) * rowSpacing;
  sGroup.position.set(xOffset, 0, zOffset);
    scene.add(sGroup);

    // 2. AVATAR
    if (stall.addAvatar) {
      const avatarColor = idx % 2 === 0 ? 0x3b82f6 : 0xf43f5e;
      const avatar = createSimpleAvatar(avatarColor);
      avatar.position.set(0, 0, -1.35);
      sGroup.add(avatar);
    }

    // 3. WELCOME MESSAGE (narration only, triggered on navigation)
    // No text label. Narration will be triggered externally when user navigates to this stall.

    // 4. SELLER/STORE NAME
    const makeSellerLabel = (name: string) => {
      // Dynamically size canvas and font for long names
      const baseFont = 'bold 36px "Segoe UI", "Arial Black", Arial, sans-serif';
      const padding = 32;
      const maxWidth = 420;
      const minWidth = 256;
      const fontSize = 36;
      // Estimate text width
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      let textWidth = minWidth - padding;
      if (tempCtx) {
        tempCtx.font = baseFont;
        textWidth = tempCtx.measureText(name).width;
      }
      const canvasWidth = Math.min(Math.max(textWidth + padding, minWidth), maxWidth);
      const canvasHeight = 72;
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw rounded colored background for contrast
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(canvas.width - 18, 0);
        ctx.quadraticCurveTo(canvas.width, 0, canvas.width, 18);
        ctx.lineTo(canvas.width, canvas.height - 18);
        ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - 18, canvas.height);
        ctx.lineTo(18, canvas.height);
        ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - 18);
        ctx.lineTo(0, 18);
        ctx.quadraticCurveTo(0, 0, 18, 0);
        ctx.closePath();
        ctx.fillStyle = '#3b82f6'; // blue background for contrast
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.restore();
        // Draw seller name text
        ctx.font = baseFont;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#222';
        ctx.shadowBlur = 10;
        ctx.fillText(name, canvas.width / 2, 50);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(mat);
      // Scale sprite based on canvas width for consistent sizing
      const scaleX = Math.max(3.7, canvasWidth / 70);
      sprite.scale.set(scaleX, 1.2, 1);
      // Move label higher above the stall
      sprite.position.set(0, 4.5, 0);
      return sprite;
    };
    const labelText = sellerNameMap[stall.sellerId] || stall.storeName || stall.sellerId;
    const sellerLabel = makeSellerLabel(labelText);
    sGroup.add(sellerLabel);

    // 5. STREET LIGHTS
    const makeLamp = (offsetX: number, offsetZ: number) => {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 10), new THREE.MeshStandardMaterial({ color: 0x444444 }));
      pole.position.y = 2.1;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfff2c6, emissive: 0xffcc66, emissiveIntensity: 0.9 }));
      head.position.y = 4.2;
      const light = new THREE.PointLight(0xffe6a8, 1.0, 14, 2);
      light.position.copy(head.position);
      light.castShadow = true;
      lamp.add(pole, head, light);
      lamp.position.set(offsetX, 0, offsetZ);
      return lamp;
    };
    const lampL = makeLamp(-4.5, 1.6);
    const lampR = makeLamp(4.5, 1.6);
    sGroup.add(lampL, lampR);

    // 6. FEATURED PRODUCTS ONLY

    // --- CAROUSEL/PAGING for more than 4 products ---
    interface StallCarousel {
      carouselPage: number;
      carouselProducts: { id: string; url: string }[];
      carouselUpdate: () => void;
      setFocused: (focused: boolean) => void;
    }
    const billboardPositions = [
      new THREE.Vector3(-2.2, 1.4, 0.2),
      new THREE.Vector3(-0.7, 1.45, 0.1),
      new THREE.Vector3(0.8, 1.4, -0.05),
      new THREE.Vector3(2.1, 1.35, 0.05),
    ];
    const billboards: MarketBillboard[] = [];
    let featured: { id: string; url: string }[] = [];
    let nonFeatured: { id: string; url: string }[] = [];
    if (stall.featuredProductIds && stall.featuredProductIds.length > 0) {
      featured = stall.featuredProductIds
        .map(fid => stall.productImages.find(p => p.id === fid))
        .filter((p): p is { id: string; url: string } => !!p)
        .slice(0, billboardPositions.length);
      const featuredSet = new Set(featured.map(p => p.id));
      nonFeatured = stall.productImages.filter(p => !featuredSet.has(p.id));
    } else {
      featured = stall.productImages.slice(0, billboardPositions.length);
      nonFeatured = stall.productImages.slice(billboardPositions.length);
    }
    const pageSize = billboardPositions.length;
    const carouselPages: { id: string; url: string }[][] = [];
    if (featured.length > 0) {
      carouselPages.push(featured);
    }
    for (let i = 0; i < nonFeatured.length; i += pageSize) {
      carouselPages.push(nonFeatured.slice(i, i + pageSize));
    }
    const sGroupCarousel = sGroup as Group & StallCarousel;
    sGroupCarousel.carouselPage = 0;
    sGroupCarousel.carouselProducts = [...featured, ...nonFeatured];
    sGroupCarousel.carouselUpdate = function updateBillboards() {
      billboards.forEach(b => sGroup.remove(b.mesh));
      billboards.length = 0;
      const page = sGroupCarousel.carouselPage;
      const pageProducts = carouselPages[page] || [];
      pageProducts.forEach((p, i2) => {
        const mesh = createBillboard(p.url);
        const pos = billboardPositions[i2 % billboardPositions.length].clone();
        mesh.position.copy(pos);
        mesh.renderOrder = 2;
        mesh.userData = { ...(mesh.userData as object), productId: p.id };
        sGroup.add(mesh);
        billboards.push({ id: p.id, mesh });
      });
      if (leftArrow) leftArrow.visible = sGroupCarousel.carouselPage > 0;
      if (rightArrow) rightArrow.visible = sGroupCarousel.carouselPage < carouselPages.length - 1;
    };
    let leftArrow: Mesh | null = null;
    let rightArrow: Mesh | null = null;
    sGroupCarousel.carouselUpdate();
    sGroupCarousel.setFocused = (focused: boolean) => {
      if (leftArrow) leftArrow.visible = focused && sGroupCarousel.carouselPage > 0;
      if (rightArrow) rightArrow.visible = focused && sGroupCarousel.carouselPage < carouselPages.length - 1;
    };
    if (carouselPages.length > 1) {
      // Responsive arrow placement
      // Left arrow
      const leftGeo = new THREE.ConeGeometry(0.18, 0.5, 16);
      const leftMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
      leftArrow = new THREE.Mesh(leftGeo, leftMat);
      leftArrow.rotation.z = Math.PI / 2;
        // Place arrows at bottom center for both mobile and desktop
        leftArrow.position.set(-1.1, 0.45, 2.1); // bottom center (left)
      leftArrow.userData = { action: 'carousel-left', sellerId: stall.sellerId };
      leftArrow.visible = false;
      sGroup.add(leftArrow);
      // Right arrow
      const rightGeo = new THREE.ConeGeometry(0.18, 0.5, 16);
      const rightMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
      rightArrow = new THREE.Mesh(rightGeo, rightMat);
      rightArrow.rotation.z = -Math.PI / 2;
        // Place arrows at bottom center for both mobile and desktop
        rightArrow.position.set(1.1, 0.45, 2.1); // bottom center (right)
      rightArrow.userData = { action: 'carousel-right', sellerId: stall.sellerId };
      rightArrow.visible = false;
      sGroup.add(rightArrow);

      // Add floating text label near arrows
  let arrowLabel: InstanceType<typeof THREE.Sprite> | null = null;
      const makeArrowLabel = (text: string, x: number, y: number, z: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 900;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // No background, only text
          ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
          ctx.fillStyle = '#fbbf24';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#222';
          ctx.shadowBlur = 8;
          ctx.fillText(text, canvas.width / 2, 44);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(8.2, 0.7, 1);
        sprite.position.set(x, y, z);
        sprite.material.opacity = 1;
        return sprite;
      };
      // Place label above arrows (centered between them)
        // Always place label above arrows at bottom center
        const labelX = 0, labelY = 1.1, labelZ = 2.1;
      // Show/hide label when focused
      sGroupCarousel.setFocused = (focused: boolean) => {
        if (leftArrow) leftArrow.visible = focused && sGroupCarousel.carouselPage > 0;
        if (rightArrow) rightArrow.visible = focused && sGroupCarousel.carouselPage < carouselPages.length - 1;
        if (focused) {
          if (!arrowLabel) {
            arrowLabel = makeArrowLabel('Use these arrows to check more products', labelX, labelY, labelZ);
            sGroup.add(arrowLabel);
          }
          arrowLabel.material.opacity = 1;
          setTimeout(() => {
            if (arrowLabel) {
              let fade = 1;
              const fadeStep = () => {
                fade -= 0.08;
                if (arrowLabel) arrowLabel.material.opacity = Math.max(0, fade);
                if (fade > 0) {
                  requestAnimationFrame(fadeStep);
                } else {
                  if (arrowLabel && arrowLabel.parent) arrowLabel.parent.remove(arrowLabel);
                  arrowLabel = null;
                }
              };
              fadeStep();
            }
          }, 2000);
        } else {
          if (arrowLabel && arrowLabel.parent) arrowLabel.parent.remove(arrowLabel);
          arrowLabel = null;
        }
      };
      // Animate arrows: color pulse (blue to yellow)
      const pulseArrows = () => {
        const t = performance.now() * 0.001;
        // Pulse between blue and yellow
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const pulse = (Math.sin(t * 2.2) + 1) / 2; // 0 to 1
        // Blue: 0x3b82f6, Yellow: 0xfbbf24
        const colorA = { r: 0x3b / 255, g: 0x82 / 255, b: 0xf6 / 255 };
        const colorB = { r: 0xfb / 255, g: 0xbf / 255, b: 0x24 / 255 };
        const r = lerp(colorA.r, colorB.r, pulse);
        const g = lerp(colorA.g, colorB.g, pulse);
        const b = lerp(colorA.b, colorB.b, pulse);
        const newColor = new THREE.Color(r, g, b);
        if (leftArrow && leftArrow.material && 'color' in leftArrow.material) {
          (leftArrow.material as InstanceType<typeof THREE.MeshStandardMaterial>).color.copy(newColor);
        }
        if (rightArrow && rightArrow.material && 'color' in rightArrow.material) {
          (rightArrow.material as InstanceType<typeof THREE.MeshStandardMaterial>).color.copy(newColor);
        }
        requestAnimationFrame(pulseArrows);
      };
      pulseArrows();
    }

    // 7. GO TO BUTTON
    const btnGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.12, 24);
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x12b981, emissive: 0x0ea371, emissiveIntensity: 0.4 });
    const gotoBtn = new THREE.Mesh(btnGeo, btnMat);
    gotoBtn.position.set(0, 0.08, 2.0);
    gotoBtn.castShadow = true;
    gotoBtn.userData = { action: 'goto-stall', sellerId: stall.sellerId };
    sGroup.add(gotoBtn);

    stalls.push({ sellerId: stall.sellerId, group: sGroup, billboards, gotoButton: gotoBtn });
  });
  // --- MINIMAP SETUP ---
  // Create a small top-down orthographic camera that will render a portion of the scene as a minimap
  const minimap: {
    camera: InstanceType<typeof import('three')['OrthographicCamera']> | null;
    sizePx: number;
    padding: number;
    enabled: boolean;
  marker: InstanceType<typeof THREE.Sprite> | null;
  } = {
    camera: null,
    sizePx: 220,
    padding: 8,
    enabled: true,
    marker: null,
  };

  // Determine ground bounds from plaza (if present)
  const groundMesh = scene.getObjectByName('ground') as InstanceType<typeof import('three')['Mesh']> | undefined;
  let groundBounds = { minX: -45, maxX: 45, minZ: -30, maxZ: 30 };
  if (groundMesh) {
    // Use plaza size if available via parameters (PlaneGeometry)
    const geom = groundMesh.geometry;
    if (geom instanceof THREE.PlaneGeometry && geom.parameters) {
      const params = geom.parameters;
      if (typeof params.width === 'number' && typeof params.height === 'number') {
        const w = params.width / 2;
        const h = params.height / 2;
        groundBounds = { minX: -w, maxX: w, minZ: -h, maxZ: h };
      }
    }
  }

  // Create orthographic camera. We'll update its frustum to cover the plaza bounds
  minimap.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  minimap.camera.up.set(0, 0, -1); // make +Z point to top of minimap

  // Helper to compute and update camera frustum centered on the plaza (accounts for plaza.position)
  const updateMinimapCamera = () => {
    // Get plaza geometry size if available
    let plazaWidth = 90, plazaHeight = 60;
    if (groundMesh) {
      const geom = groundMesh.geometry;
      if (geom instanceof THREE.PlaneGeometry && geom.parameters && typeof geom.parameters.width === 'number' && typeof geom.parameters.height === 'number') {
        plazaWidth = geom.parameters.width;
        plazaHeight = geom.parameters.height;
      }
    }
    const centerX = plaza.position.x || 0;
    const centerZ = plaza.position.z || 0;
    const mapSize = Math.max(plazaWidth, plazaHeight) * 1.05; // small margin
    const half = mapSize / 2;
    minimap.camera.left = -half;
    minimap.camera.right = half;
    minimap.camera.top = half;
    minimap.camera.bottom = -half;
    minimap.camera.position.set(centerX, 90, centerZ);
    minimap.camera.lookAt(centerX, 0, centerZ);
    minimap.camera.updateProjectionMatrix();
  };

  // Mobile-specific minimap camera logic
  const updateMinimapCameraMobile = () => {
    let plazaWidth = 90, plazaHeight = 60;
    if (groundMesh) {
      const geom = groundMesh.geometry;
      if (geom instanceof THREE.PlaneGeometry && geom.parameters && typeof geom.parameters.width === 'number' && typeof geom.parameters.height === 'number') {
        plazaWidth = geom.parameters.width;
        plazaHeight = geom.parameters.height;
      }
    }
    const centerX = plaza.position.x || 0;
    const centerZ = plaza.position.z || 0;
    const mapSize = Math.max(plazaWidth, plazaHeight) * 1.05;
    const half = mapSize / 2;
    minimap.camera.left = -half;
    minimap.camera.right = half;
    minimap.camera.top = half;
    minimap.camera.bottom = -half;
    minimap.camera.position.set(centerX, 90, centerZ);
    minimap.camera.lookAt(centerX, 0, centerZ);
    minimap.camera.updateProjectionMatrix();
  };
  // Initial update
  updateMinimapCamera();

  // Create a simple sprite marker to represent the user/camera position
  const markerCanvas = document.createElement('canvas');
  markerCanvas.width = 1000; // larger source canvas for crisper sprite when scaled
  markerCanvas.height = 1000;
  const mctx = markerCanvas.getContext('2d');
  if (mctx) {
    // Clear
    mctx.clearRect(0, 0, markerCanvas.width, markerCanvas.height);
    const cx = markerCanvas.width / 2;
    const cy = markerCanvas.height / 2;
    // Halo outer circle (bigger)
    mctx.beginPath();
    mctx.fillStyle = 'rgba(0,0,0,0.5)';
    mctx.arc(cx, cy, 34, 0, Math.PI * 2);
    mctx.fill();
    // Inner white ring
    mctx.beginPath();
    mctx.fillStyle = '#ffffff';
    mctx.arc(cx, cy, 26, 0, Math.PI * 2);
    mctx.fill();
  // Arrow triangle pointing down (will be rotated in code to match heading)
  mctx.save();
  mctx.translate(cx, cy);
  mctx.fillStyle = '#ff3b30';
  mctx.beginPath();
  mctx.moveTo(0, 20); // tip down
  mctx.lineTo(14, -16);
  mctx.lineTo(-14, -16);
  mctx.closePath();
  mctx.fill();
  mctx.restore();
  }
  const markerTex = new THREE.CanvasTexture(markerCanvas);
  const markerMat = new THREE.SpriteMaterial({ map: markerTex, depthTest: false, depthWrite: false, transparent: true });
  const markerSprite = new THREE.Sprite(markerMat);
  // Scale in world units so it's visible on the minimap but small
  markerSprite.scale.set(1, 1, 1); // will be set dynamically in animate based on map size
  // Ensure the marker renders above other minimap items
  markerSprite.renderOrder = 9999;
  if (markerSprite.material) (markerSprite.material as InstanceType<typeof THREE.SpriteMaterial>).depthTest = false;
  minimap.marker = markerSprite;
  // We'll add the marker to a dedicated minimap group that is only rendered by the minimap camera
  const minimapGroup = new THREE.Group();
  minimapGroup.name = 'minimap-group';
  // (removed wireframe outline to avoid visible cross lines in minimap)
  // Add markers for stalls (small boxes) for orientation
  // Assign a random waving phase to each avatar
  const avatarPhases: number[] = [];
  stalls.forEach((s, idx) => {
    avatarPhases[idx] = Math.random() * Math.PI * 2;
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 1.2), new THREE.MeshBasicMaterial({ color: 0x223344 }));
    const p = s.group.position;
    box.position.set(p.x, 0.1, p.z);
    minimapGroup.add(box);
  });
  // Add the user marker on top (only in minimap group)
  minimapGroup.add(minimap.marker);
  // Only add minimapGroup to the scene for minimap rendering
  // Remove minimapGroup from the main scene before main render, add before minimap render

  // Create an overlay canvas for the circular minimap. Using a separate small renderer
  // and a circular CSS mask (border-radius) works reliably across devices and is
  // lightweight for a small viewport.
  const minimapOverlay = document.createElement('canvas');
  minimapOverlay.className = 'kalamitra-minimap-overlay';
  // Ensure the parent can contain an absolutely positioned overlay
  const parentEl = canvas.parentElement as HTMLElement | null;
  if (parentEl) {
    const cs = getComputedStyle(parentEl);
    if (cs.position === 'static') parentEl.style.position = 'relative';
    parentEl.appendChild(minimapOverlay);
  } else {
    // fallback: append to body
    document.body.appendChild(minimapOverlay);
  }

  // Create a dedicated small WebGL renderer for the minimap
  const minimapRenderer = new THREE.WebGLRenderer({ canvas: minimapOverlay, antialias: true, alpha: true });
  minimapRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  minimapRenderer.setClearColor(0x000000, 0); // transparent background

  // Function to compute appropriate minimap size
  const updateMinimapSize = () => {
  // Mobile-specific minimap overlay and renderer adjustment
  minimap.sizePx = 160;
  const cssSize = minimap.sizePx;
  minimapOverlay.style.position = 'absolute';
  minimapOverlay.style.right = `${minimap.padding}px`;
  minimapOverlay.style.top = `${minimap.padding}px`;
  minimapOverlay.style.width = `${cssSize}px`;
  minimapOverlay.style.height = `${cssSize}px`;
  minimapOverlay.style.borderRadius = '50%';
  minimapOverlay.style.overflow = 'hidden';
  minimapOverlay.style.pointerEvents = 'none';
  minimapOverlay.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
  minimapRenderer.setSize(320, 320, false);
  // Camera/frustum/marker logic
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  try {
    if (isMobile) {
      updateMinimapCameraMobile();
    } else {
      updateMinimapCamera();
    }
  } catch (e) {}
  };

  // Initialize overlay size
  updateMinimapSize();
// --- THEME STRUCTURES ---
function createStallStructureClassic(decor?: Record<string, string | number | boolean | null>): Group {
  // Classic: wood, earthy, traditional, extra bunting, clay pots, warm lights
  const group = createStallStructure();
    // Add rustic wooden backdrop (behind stall)
  {
    const woodWall = new THREE.Mesh(
      new THREE.PlaneGeometry(6.6, 2.5),
      new THREE.MeshStandardMaterial({
        color: 0x8b5a2b,
        roughness: 0.8,
        metalness: 0.1,
        transparent: true,
        opacity: 0.82
      })
    );
    // Move wall further back to avoid hiding avatar
    woodWall.position.set(0, 1.65, -2.2); // was -1.22, now -2.2
    woodWall.rotation.y = 0;
    group.add(woodWall);
  }

  // Hanging lanterns for warm glow
  for (let i = -2; i <= 2; i += 2) {
    const lantern = new THREE.Group();
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a4633 })
    );
    wire.position.y = 2.8;
    lantern.add(wire);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffe4b5, emissive: 0xffe4b5, emissiveIntensity: 0.7 })
    );
    bulb.position.y = 2.61;
    lantern.add(bulb);
    lantern.position.set(i, 2.8, -1.1);
    group.add(lantern);
  }

  // Clay pots on shelves for extra detail (left and right, not center)
  [-1, 1].forEach(i => {
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.08, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 })
    );
    shelf.position.set(i * 2.2, 1.05, -1.18);
    group.add(shelf);
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.19, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0xc97a3d, roughness: 0.7 })
    );
    pot.position.set(i * 2.2, 1.18, -1.08);
    group.add(pot);
  });

  // Add clay pots
  for (let i = -2; i <= 2; i += 2) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 0.32, 12),
      new THREE.MeshStandardMaterial({ color: 0xc97a3d, roughness: 0.7 })
    );
    pot.position.set(i, 0.18, 1.4);
    group.add(pot);
  }
  // Add extra bunting flags
  for (let i = -3; i <= 3; i++) {
    const tri = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.02), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
    tri.position.set(i, 2.3 + Math.random() * 0.2, 1.25);
    group.add(tri);
  }
  // Add warm ambient light
  const warmLight = new THREE.PointLight(0xffe4b5, 0.7, 8, 2);
  warmLight.position.set(0, 2.8, 0);
  group.add(warmLight);
  // Optionally tint
  if (decor && decor.color) {
  group.traverse((obj: Parameters<Group['traverse']>[0]) => {
      // Only update color for meshes
      if ((obj as Mesh).isMesh && (obj as Mesh).material && (obj as Mesh).material.color) {
        (obj as Mesh).material.color.set(decor.color);
      }
    });
  }
  return group;
}

function createStallStructureModern(decor?: Record<string, string | number | boolean | null>): Group {
  // Modern: white, glass, minimal, blue accent, neon lights, planters, bright lights
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 2.2), new THREE.MeshStandardMaterial({ color: 0xf4f4f4, metalness: 0.7, roughness: 0.2 }));
  base.position.set(0, 0.25, 0);
  group.add(base);
  // Minimal open frame: 4 vertical bars and 2 horizontal bars
  const barMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.9, roughness: 0.1, emissive: 0x3b82f6, emissiveIntensity: 0.22 });
  const barGeomV = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 12);
  const barGeomH = new THREE.CylinderGeometry(0.07, 0.07, 6.2, 12);
  // Vertical bars
  [[-3.1, -1.1],[3.1, -1.1],[-3.1, 1.1],[3.1, 1.1]].forEach(([x,z]) => {
    const bar = new THREE.Mesh(barGeomV, barMat);
    bar.position.set(x, 1.6, z);
    group.add(bar);
  });
  // Minimal horizontal accent bar (top front, white)
  const accentBarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2, emissive: 0x00fff7, emissiveIntensity: 0.08 });
  const accentBar = new THREE.Mesh(barGeomH, accentBarMat);
  accentBar.position.set(0, 3.2, 1.1);
  accentBar.rotation.z = Math.PI / 2;
  group.add(accentBar);
  // Glass roof: lowered, frosted effect, glowing edge
  const roof = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 3.2),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1,
      roughness: 0.18,
      transparent: true,
      opacity: 0.72, // frosted look
      emissive: 0x00fff7,
      emissiveIntensity: 0.22
    })
  );
  roof.position.set(0, 3.25, -0.7); // lowered roof
  roof.rotation.x = Math.PI / 2.2;
  group.add(roof);
    // Stylish glass background wall (behind stall)
  const bgWall = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 2.6),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.8,
      roughness: 0.18,
      transparent: true,
      opacity: 0.38,
      emissive: 0x00fff7,
      emissiveIntensity: 0.09
    })
  );
  bgWall.position.set(0, 1.7, -1.25);
  bgWall.rotation.y = 0;
  group.add(bgWall);
    // Heritage items for cultural richness
  // Mini brass lamp (diya) on left front
  const diyaBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.13, 0.07, 12),
    new THREE.MeshStandardMaterial({ color: 0xc9b037, metalness: 0.8, roughness: 0.3 })
  );
  diyaBase.position.set(-2.2, 0.32, 0.85);
  group.add(diyaBase);
  const diyaFlame = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffe066, emissiveIntensity: 0.7 })
  );
  diyaFlame.position.set(-2.2, 0.39, 0.85);
  group.add(diyaFlame);

  // Decorative plate (thali) with pattern on right front
  const thali = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: 0xe0cda9, metalness: 0.7, roughness: 0.2 })
  );
  thali.position.set(2.2, 0.29, 0.85);
  group.add(thali);
  // Simple pattern: colored dots
  for (let k = 0; k < 6; k++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 8, 8),
      new THREE.MeshStandardMaterial({ color: [0xf43f5e,0x3b82f6,0xf59e42,0x12b981,0xfbbf24,0x6366f1][k] })
    );
    const angle = (k / 6) * Math.PI * 2;
    dot.position.set(2.2 + Math.cos(angle) * 0.09, 0.31, 0.85 + Math.sin(angle) * 0.09);
    group.add(dot);
  }

  // Glowing edge for roof (modern accent)
  const edgeGeom = new THREE.CylinderGeometry(0.04, 0.04, 7.1, 24);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x00fff7, emissive: 0x00fff7, emissiveIntensity: 0.7 });
  const edge = new THREE.Mesh(edgeGeom, edgeMat);
  edge.position.set(0, 3.26, -0.7);
  edge.rotation.z = Math.PI / 2;
  group.add(edge);

  // Hanging pendant lights (subtle, modern)
  for (let i = -2; i <= 2; i += 2) {
    const pendant = new THREE.Group();
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    wire.position.y = 3.0;
    pendant.add(wire);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff7b2, emissive: 0xffe066, emissiveIntensity: 0.8 })
    );
    bulb.position.y = 2.81;
    pendant.add(bulb);
    pendant.position.set(i, 3.25, 0.2);
    group.add(pendant);
  }
  // Add more accent lighting for visibility
  const accentLight1 = new THREE.PointLight(0x3b82f6, 1.2, 12, 2);
  accentLight1.position.set(-2.5, 2.8, 1.2);
  group.add(accentLight1);
  const accentLight2 = new THREE.PointLight(0x00fff7, 1.0, 10, 2);
  accentLight2.position.set(2.5, 2.8, -1.2);
  group.add(accentLight2);
  // Add a glass table for products
  const glassTable = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.32, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.45, emissive: 0x00fff7, emissiveIntensity: 0.08 })
  );
  glassTable.position.set(0, 0.18, 0);
  group.add(glassTable);
  // Symmetrical planters at corners
  [[-2.7, 1.1],[2.7, 1.1],[-2.7, -1.1],[2.7, -1.1]].forEach(([x,z]) => {
    const planter = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.18, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x8fd19e, metalness: 0.5, roughness: 0.2 })
    );
    planter.position.set(x, 0.12, z);
    group.add(planter);
    const plant = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x00fff7, emissiveIntensity: 0.3 })
    );
    plant.position.set(x, 0.28, z);
    group.add(plant);
  });
  // Add bright white/blue point lights
  const blueLight = new THREE.PointLight(0x3b82f6, 1.1, 10, 2);
  blueLight.position.set(0, 3.2, 0);
  group.add(blueLight);
  const whiteLight = new THREE.PointLight(0xffffff, 0.7, 8, 2);
  whiteLight.position.set(0, 2.2, 1.2);
  group.add(whiteLight);
  // Optionally tint
  if (decor && decor.color) {
  group.traverse((obj: Parameters<Group['traverse']>[0]) => {
      if ((obj as Mesh).isMesh && (obj as Mesh).material && (obj as Mesh).material.color) {
        (obj as Mesh).material.color.set(decor.color);
      }
    });
  }
  return group;
}

function createStallStructureFestive(decor?: Record<string, string | number | boolean | null>): Group {
  // Festive: bright, banners, extra umbrellas, gold accent, confetti, streamers, glowing lights
  const group = createStallStructure();
  // Add extra banners (gold, pink, blue)
  const bannerColors = [0xffcc00, 0xe84393, 0x3b82f6];
  for (let i = -3; i <= 3; i++) {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.22), new THREE.MeshStandardMaterial({ color: bannerColors[i % bannerColors.length], emissive: bannerColors[i % bannerColors.length], emissiveIntensity: 0.18 }));
    banner.position.set(i, 3.7, 1.3);
    group.add(banner);
  }
  // Add extra umbrellas
  for (let i = -1; i <= 1; i++) {
    const umb = createDecorUmbrella();
    umb.position.set(i * 2.2, 3.2, 1.5);
    group.add(umb);
  }
  // Add glowing confetti
  const confettiColors = [0xe74c3c, 0xf1c40f, 0x2ecc71, 0x3498db, 0x9b59b6];
  for (let i = 0; i < 18; i++) {
    const confetti = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshStandardMaterial({ color: confettiColors[i % confettiColors.length], emissive: confettiColors[i % confettiColors.length], emissiveIntensity: 0.22 })
    );
    confetti.position.set(Math.random() * 6 - 3, 3.8 + Math.random() * 0.5, Math.random() * 2 - 1);
    group.add(confetti);
  }
  // Add animated glowing streamers
  for (let i = -2; i <= 2; i++) {
    const streamerColor = confettiColors[(i + 2) % confettiColors.length];
    const streamer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: streamerColor, emissive: streamerColor, emissiveIntensity: 0.18 })
    );
    streamer.position.set(i * 1.2, 3.2, 1.7);
    streamer.rotation.z = Math.PI / 2.5;
    group.add(streamer);
  }
  // Add gold point lights
  for (let i = -1; i <= 1; i++) {
    const goldLight = new THREE.PointLight(0xffcc00, 0.7, 7, 2);
    goldLight.position.set(i * 2.2, 3.6, 1.2);
    group.add(goldLight);
  }
  // Add pink and blue accent lights
  const pinkLight = new THREE.PointLight(0xe84393, 0.5, 6, 2);
  pinkLight.position.set(-2.2, 3.2, 1.7);
  group.add(pinkLight);
  const blueLight = new THREE.PointLight(0x3b82f6, 0.5, 6, 2);
  blueLight.position.set(2.2, 3.2, 1.7);
  group.add(blueLight);
  // Optionally tint
  if (decor && decor.color) {
  group.traverse((obj: Parameters<Group['traverse']>[0]) => {
      if ((obj as Mesh).isMesh && (obj as Mesh).material && (obj as Mesh).material.color) {
        (obj as Mesh).material.color.set(decor.color);
      }
    });
  }
  return group;
}

  let raf = 0;
  const onResize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // update minimap overlay size too
    try { updateMinimapSize(); } catch (e) {}
  };

  const animate = () => {
    stalls.forEach((s) => {
      s.billboards.forEach((b) => b.mesh.lookAt(camera.position.x, b.mesh.position.y, camera.position.z));
      // Robust avatar movement: animate all matching children
      const t = performance.now() * 0.002;
      // Animate only meshes marked as avatar parts
      s.group.traverse((obj: Object3D) => {
        if (obj instanceof THREE.Mesh && obj.geometry && obj.userData.isAvatarPart) {
          // Head (SphereGeometry, y > 1)
          if (obj.geometry.type === 'SphereGeometry' && obj.position.y > 1) {
            obj.rotation.z = Math.sin(t * 1.2) * 0.32 + Math.sin(t * 0.5) * 0.18;
            obj.rotation.x = Math.sin(t * 0.7) * 0.18 + Math.cos(t * 0.3) * 0.11;
          }
          // Body (CylinderGeometry, y > 0.4, scale.y > 1)
          if (obj.geometry.type === 'CylinderGeometry' && obj.position.y > 0.4 && obj.scale.y > 1) {
            obj.position.x = Math.sin(t * 0.7) * 0.22 + Math.cos(t * 0.4) * 0.13;
            obj.position.z = Math.sin(t * 0.5) * 0.14;
          }
          // Arms (CylinderGeometry, y ~ 0.7, x < 0 or x > 0)
          if (obj.geometry.type === 'CylinderGeometry' && obj.position.y > 0.7) {
            if (obj.position.x > 0) {
              // Right arm waves slowly with pause, phase offset per avatar
              const waveSpeed = 0.45; // slower
              const phase = avatarPhases[stalls.indexOf(s)] || 0;
              const wave = Math.sin(t * waveSpeed + phase);
              // Only move arm when wave > 0.2 (pause at bottom)
              if (wave > 0.2) {
                obj.rotation.x = wave * 0.85 + 0.5;
              } else {
                obj.rotation.x = 0.5; // hold at bottom
              }
              obj.rotation.z = 0;
            } else {
              // Left arm stays neutral
              obj.rotation.x = 0;
              obj.rotation.z = 0;
            }
          }
        }
      });
    });
    // Animate clouds
    if (cloudGroup && cloudAnimOffsets.length) {
      for (let i = 0; i < cloudGroup.children.length; i++) {
        const cloud = cloudGroup.children[i];
        const { baseX, baseY, baseZ, speed, phase } = cloudAnimOffsets[i];
        const t = performance.now() * 0.0001;
        cloud.position.x = baseX + Math.sin(t * speed + phase) * 8;
        cloud.position.z = baseZ + Math.cos(t * speed + phase) * 6;
        cloud.position.y = baseY + Math.sin(t * speed * 0.5 + phase) * 0.5;
      }
    }
    controls.update();
    // Render main view (without minimap group or clouds)
    if (scene.children.includes(minimapGroup)) {
      scene.remove(minimapGroup);
    }
    renderer.setViewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    renderer.setScissor(0, 0, canvas.clientWidth, canvas.clientHeight);
    renderer.render(scene, camera);

    // Render minimap into the circular overlay canvas using the minimapRenderer
    if (minimap.enabled && minimap.camera) {
      // Always update minimap camera to cover full ground
      try { updateMinimapCamera(); } catch (e) {}
      // Update marker position to camera projection onto ground
      const camPos = camera.position;
      minimap.marker.position.set(camPos.x, 0.2, camPos.z);
      // Adjust marker size relative to minimap frustum so it is visible regardless of map zoom
      try {
        const frustWidth = (minimap.camera!.right - minimap.camera!.left);
        const frac = 0.22; // same fraction for all devices
        const minWorld = 6.0; // same minimum for all devices
        const worldSize = Math.max(minWorld, frustWidth * frac);
        minimap.marker.scale.set(worldSize + 200, worldSize + 200, 1);
      } catch (e) {
        // fallback to fixed size
        minimap.marker.scale.set(8.0, 8.0, 1);
      }

      // Rotate marker to match camera heading (project camera forward onto XZ plane).
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      // Angle between forward vector and +Z (0 means facing +Z/top of minimap)
      const angle = Math.atan2(forward.x, forward.z);
      if (minimap.marker.material) minimap.marker.material.rotation = angle;

      // Add minimap group to scene for minimap rendering only
      if (!scene.children.includes(minimapGroup)) {
        scene.add(minimapGroup);
      }
      // Remove clouds from scene for minimap render
      if (cloudGroup && scene.children.includes(cloudGroup)) {
        scene.remove(cloudGroup);
      }
      // Render using the small renderer into its canvas
      const dibW = minimapRenderer.domElement.width;
      const dibH = minimapRenderer.domElement.height;
      minimapRenderer.setViewport(0, 0, dibW, dibH);
      minimapRenderer.setScissor(0, 0, dibW, dibH);
      minimapRenderer.clear(true, true, true);
      minimapRenderer.render(scene, minimap.camera);
      // Remove minimap group after minimap render
      scene.remove(minimapGroup);
      // Add clouds back after minimap render
      if (cloudGroup && !scene.children.includes(cloudGroup)) {
        scene.add(cloudGroup);
      }
    }
    raf = requestAnimationFrame(animate);
  };

  const start = () => { if (!raf) raf = requestAnimationFrame(animate); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  const dispose = () => {
    stop();
    controls.dispose();
    // disable scissor
    try { renderer.setScissorTest(false); } catch (e) {}
    stalls.forEach((s) => s.billboards.forEach((b) => {
      if ('dispose' in b.mesh.material && typeof b.mesh.material.dispose === 'function') {
        b.mesh.material.dispose();
      }
      if ('dispose' in b.mesh.geometry && typeof b.mesh.geometry.dispose === 'function') {
        b.mesh.geometry.dispose();
      }
    }));
    // dispose minimap resources
    try {
      if (minimap.marker && minimap.marker.material) {
        const mat = minimap.marker.material as InstanceType<typeof THREE.SpriteMaterial>;
        if (mat.map) mat.map.dispose();
        mat.dispose();
      }
      // dispose minimap renderer and remove overlay
      try {
        minimapRenderer.forceContextLoss();
      } catch (e) {}
      try {
        if (minimapOverlay && minimapOverlay.parentElement) minimapOverlay.parentElement.removeChild(minimapOverlay);
      } catch (e) {}
    } catch (e) {}
    renderer.dispose();
  };

  window.addEventListener('resize', onResize);

  return { scene, camera, renderer, controls, stalls, resize: onResize, dispose, start, stop };
}


