import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface MarketBillboard {
  id: string;
  mesh: THREE.Mesh;
}

export interface MarketStall {
  sellerId: string;
  group: THREE.Group;
  billboards: MarketBillboard[];
  gotoButton?: THREE.Mesh;
}

export interface MarketplaceRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
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
};

function createDecorUmbrella(): THREE.Group {
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

function createLantern(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), new THREE.MeshStandardMaterial({ color: 0xf1c40f, emissive: 0x8a6d1f, emissiveIntensity: 0.2 }));
  g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0xf39c12 }));
  tail.position.y = -0.35;
  g.add(tail);
  return g;
}

function createWheel(): THREE.Mesh {
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 12, 24), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
  wheel.rotation.z = Math.PI / 2;
  wheel.castShadow = true;
  return wheel;
}

function createStallStructure(): THREE.Group {
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

function createBillboard(url: string, w = 1.0, h = 1.25): THREE.Mesh {
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
    (error) => {
      console.warn('Failed to load texture for 3D bazaar:', url, error);
    }
  );
  tex.colorSpace = THREE.SRGBColorSpace as unknown as THREE.ColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const geo = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export function initMarketplaceScene(
  canvas: HTMLCanvasElement,
  stallsInput: StallInput[],
  options?: { background?: number }
): MarketplaceRefs {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f16); // slightly lighter night blue

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

  const ambient = new THREE.AmbientLight(0xffffff, 0.22);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xbfdfff, 0.25); // soft moonlight
  dir.position.set(-30, 25, -10);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  scene.add(dir);

  // Large ground to walk around
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.receiveShadow = true;
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
    const arch1 = arch.clone();
    arch1.position.set(-20, 0, -15);
    const arch2 = arch.clone();
    arch2.position.set(20, 0, 15);
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

  const stalls: MarketStall[] = [];
  const rowSpacing = 14;
  const colSpacing = 18;
  stallsInput.forEach((stall, idx) => {
    const sGroup = createStallStructure();
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    sGroup.position.set((col - 1) * colSpacing, 0, (row - 0.5) * rowSpacing);
    scene.add(sGroup);

    // Street lights near each stall (two warm posts)
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

    // Humans removed as requested

    const billboardPositions = [
      new THREE.Vector3(-2.2, 1.4, 0.2),
      new THREE.Vector3(-0.7, 1.45, 0.1),
      new THREE.Vector3(0.8, 1.4, -0.05),
      new THREE.Vector3(2.1, 1.35, 0.05),
    ];
    const billboards: MarketBillboard[] = [];
    stall.productImages.slice(0, 8).forEach((p, i2) => {
      const mesh = createBillboard(p.url);
      const pos = billboardPositions[i2 % billboardPositions.length].clone();
      mesh.position.copy(pos);
      mesh.renderOrder = 2; // ensure billboards render above nearby decor
      (mesh as any).userData = { ...(mesh as any).userData, productId: p.id };
      sGroup.add(mesh);
      billboards.push({ id: p.id, mesh });
    });

    // Add a "Go" button on the floor in front of the stall
    const btnGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.12, 24);
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x12b981, emissive: 0x0ea371, emissiveIntensity: 0.4 });
    const gotoBtn = new THREE.Mesh(btnGeo, btnMat);
    gotoBtn.position.set(0, 0.08, 2.0);
    gotoBtn.castShadow = true;
    (gotoBtn as any).userData = { action: 'goto-stall', sellerId: stall.sellerId };
    sGroup.add(gotoBtn);

    stalls.push({ sellerId: stall.sellerId, group: sGroup, billboards, gotoButton: gotoBtn });
  });

  let raf = 0;
  const onResize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const animate = () => {
    stalls.forEach((s) => s.billboards.forEach((b) => b.mesh.lookAt(camera.position.x, b.mesh.position.y, camera.position.z)));
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };

  const start = () => { if (!raf) raf = requestAnimationFrame(animate); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  const dispose = () => {
    stop();
    controls.dispose();
    stalls.forEach((s) => s.billboards.forEach((b) => {
      (b.mesh.material as THREE.Material).dispose();
      (b.mesh.geometry as THREE.BufferGeometry).dispose();
    }));
    renderer.dispose();
  };

  window.addEventListener('resize', onResize);

  return { scene, camera, renderer, controls, stalls, resize: onResize, dispose, start, stop };
}


