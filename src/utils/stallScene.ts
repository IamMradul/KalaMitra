import * as THREE from 'three';

type Mesh = InstanceType<typeof import('three')['Mesh']>;
type Group = InstanceType<typeof import('three')['Group']>;
type Scene = InstanceType<typeof import('three')['Scene']>;
type PerspectiveCamera = InstanceType<typeof import('three')['PerspectiveCamera']>;
type WebGLRenderer = InstanceType<typeof import('three')['WebGLRenderer']>;

export interface BillboardItem {
  id: string;
  mesh: Mesh;
}

export interface StallSceneRefs {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  billboards: BillboardItem[];
  resize: () => void;
  dispose: () => void;
  start: () => void;
  stop: () => void;
}

export type BillboardSpec = {
  id: string;
  imageUrl: string;
  width?: number;
  height?: number;
  position: InstanceType<typeof import('three')['Vector3']>;
};

function createStallStructure(): Group {
  const group = new THREE.Group();

  // Ground
  const groundGeom = new THREE.PlaneGeometry(20, 20);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xbfa27a }); // earthy tone
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Table
  const tableGeom = new THREE.BoxGeometry(8, 0.6, 2.5);
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
  const table = new THREE.Mesh(tableGeom, tableMat);
  table.position.set(0, 0.3, 0);
  table.castShadow = true;
  table.receiveShadow = true;
  group.add(table);

  // Canopy posts
  const postGeom = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 12);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5a4633 });
  const offsets = [
    new THREE.Vector3(-4, 1.6, -1.2),
    new THREE.Vector3(4, 1.6, -1.2),
    new THREE.Vector3(-4, 1.6, 1.2),
    new THREE.Vector3(4, 1.6, 1.2),
  ];
  offsets.forEach((pos) => {
    const post = new THREE.Mesh(postGeom, postMat);
    post.position.copy(pos);
    post.castShadow = true;
    group.add(post);
  });

  // Canopy cloth (simple plane)
  const canopyGeom = new THREE.PlaneGeometry(9, 3.2, 1, 1);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xd04a02, side: THREE.DoubleSide }); // saffron-ish
  const canopy = new THREE.Mesh(canopyGeom, canopyMat);
  canopy.rotation.x = Math.PI / 2.2;
  canopy.position.set(0, 3.2, 0);
  canopy.castShadow = true;
  group.add(canopy);

  // Decorative bunting (triangles as thin boxes for simplicity)
  const buntingMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f });
  for (let i = -4; i <= 4; i += 1) {
    const tri = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.02), buntingMat);
    tri.position.set(i, 2.1 + Math.random() * 0.2, 1.25);
    tri.rotation.z = (Math.random() - 0.5) * 0.2;
    group.add(tri);
  }

  return group;
}

function createBillboardMesh(texture: InstanceType<typeof import('three')['Texture']>, width = 1, height = 1.2): Mesh {
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

export function initStallScene(
  canvas: HTMLCanvasElement,
  billboardSpecs: BillboardSpec[],
  opts?: { background?: number; devicePixelRatio?: number }
): StallSceneRefs {
  const scene: Scene = new THREE.Scene();
  scene.background = new THREE.Color(opts?.background ?? 0xf5efe6);

  const renderer: WebGLRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(opts?.devicePixelRatio ?? Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera: PerspectiveCamera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(6, 4.5, 8);
  camera.lookAt(0, 1.2, 0);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  scene.add(dir);

  // Stall
  const stall = createStallStructure();
  scene.add(stall);

  // Load billboards
  const textureLoader = new THREE.TextureLoader();
  const billboards: BillboardItem[] = [];
  billboardSpecs.forEach((spec, index) => {
  const texture = textureLoader.load(spec.imageUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = createBillboardMesh(texture, spec.width ?? 1.1, spec.height ?? 1.4);
    mesh.position.copy(spec.position);
    // Slight vertical variance
    mesh.position.y = Math.max(1.1, mesh.position.y + (index % 2 === 0 ? 0.05 : -0.05));
    scene.add(mesh);
    billboards.push({ id: spec.id, mesh });
  });

  let rafId = 0;
  const onResize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const animate = () => {
    billboards.forEach((b) => {
      b.mesh.lookAt(camera.position.x, b.mesh.position.y, camera.position.z);
    });
    renderer.render(scene, camera);
    rafId = window.requestAnimationFrame(animate);
  };

  const start = () => {
    if (!rafId) rafId = window.requestAnimationFrame(animate);
  };

  const stop = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const dispose = () => {
    stop();
    billboards.forEach((b) => {
      if ('dispose' in b.mesh.material && typeof b.mesh.material.dispose === 'function') {
        b.mesh.material.dispose();
      }
      if ('dispose' in b.mesh.geometry && typeof b.mesh.geometry.dispose === 'function') {
        b.mesh.geometry.dispose();
      }
    });
    renderer.dispose();
  };

  window.addEventListener('resize', onResize);

  return { scene, camera, renderer, billboards, resize: onResize, dispose, start, stop };
}


