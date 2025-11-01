'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
type Mesh = InstanceType<typeof import('three')['Mesh']>;
type Object3D = InstanceType<typeof import('three')['Object3D']>;
import { initMarketplaceScene, StallInput } from '../utils/marketplaceScene';
import { supabase } from '../lib/supabase';
import { Product } from '../types/product';
import { useTheme } from '../components/ThemeProvider';

interface NavigatorProps {
  sellers: { sellerId: string; products: Product[] }[];
  onProductClick: (productId: string) => void;
  focusSellerId?: string;
}

export default function MarketplaceNavigator3D({ sellers, onProductClick, focusSellerId }: NavigatorProps) {

  // List of Indian market names (expandable)
  const marketNames = [
    'Chandni Chowk', 'Lal Bagh Bazaar', 'Johari Bazaar', 'Sarafa Bazaar', 'New Market',
    'Dilli Haat', 'Crawford Market', 'Meena Bazaar', 'MG Road', 'Bapu Bazaar',
    'Hazratganj', 'Palika Bazaar', 'Russell Market', 'Kolkata Haat', 'Sadar Bazaar',
    'Kothi Market', 'Kashmiri Gate', 'Lakkar Bazaar', 'Bara Bazaar', 'Gandhi Market',
    'Ranganathan Street', 'Begum Bazaar', 'Kalan Bazaar', 'Koyambedu Market', 'Bapu Market',
    'Khar Market', 'Kavi Nagar', 'Kota Market', 'Kalan Market', 'Katra Neel',
    'Chor Bazaar', 'Janpath', 'Sarojini Nagar', 'Lajpat Nagar', 'Connaught Place',
    'Zaveri Bazaar', 'Manek Chowk', 'Kashmere Gate', 'Bhendi Bazaar', 'Gariahat Market',
    'Kolkata New Market', 'Banjara Market', 'Shastri Market', 'Gole Market', 'Kothari Market',
    'Bara Bazar', 'Mangalwari Bazaar', 'Sadar Market', 'Bada Bazaar', 'Gandhi Chowk',
    'Bapu Haat', 'Rajwada Market', 'Bapu Chowk', 'Bada Market', 'Bapu Bazaar',
    'Bapu Market', 'Bapu Haat', 'Bapu Chowk', 'Bada Market', 'Bapu Bazaar',
    'Kapda Bazaar', 'Sadar Bazar', 'Naya Bazaar', 'Chandpole Bazaar', 'Johari Bazar'
  ];



  // Get market name for current page

  // Pagination state for stalls
  const STALLS_PER_PAGE = 6;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(sellers.length / STALLS_PER_PAGE);

  // Only show stalls for current page
  const visibleSellers = useMemo(() => {
    const start = page * STALLS_PER_PAGE;
    return sellers.slice(start, start + STALLS_PER_PAGE);
  }, [sellers, page]);

    const marketName = page < marketNames.length
    ? marketNames[page]
    : `Bazaar ${page + 1}`;

interface NavigatorProps {
  sellers: { sellerId: string; products: Product[] }[];
  onProductClick: (productId: string) => void;
}

  // Carousel interface for stall group
  interface StallCarousel {
    carouselPage: number;
    carouselProducts: { id: string; url: string }[];
    carouselUpdate: () => void;
    setFocused: (focused: boolean) => void;
  }

  // Use app theme from ThemeProvider
  const { theme } = useTheme();
  // dayMode: true for light, false for dark
  const isLightTheme = theme !== 'dark';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<null | Awaited<ReturnType<typeof initMarketplaceScene>>>(null);
  // Track max rows for camera/controls adjustment
  const maxRows = Math.ceil(sellers.length / 3);

  const [sellerNameMap, setSellerNameMap] = useState<Record<string, string>>({});
  // Stall customizations: sellerId -> customization object
  interface StallCustomization {
    stall_theme?: string;
    welcome_message?: string;
    decor?: Record<string, string | number | boolean | null>;
    featured_product_ids?: string[];
    [key: string]: unknown;
  }
  const [stallCustomizations, setStallCustomizations] = useState<Record<string, StallCustomization>>({});
  useEffect(() => {
    const fetchSellerNamesAndCustomizations = async () => {
      const sellerIds = sellers.map(s => s.sellerId);
      // Fetch seller names
      const { data: profiles, error: nameError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', sellerIds);
      if (nameError) {
        console.warn('Error fetching seller profiles:', nameError);
        setSellerNameMap({});
      } else {
        const map: Record<string, string> = {};
        if (profiles) {
          profiles.forEach((profile: { id: string; name: string }) => {
            map[profile.id] = profile.name;
          });
        }
        setSellerNameMap(map);
      }

      // Fetch stall customizations
      const { data: customizations, error: customError } = await supabase
        .from('stall_customizations')
        .select('*')
        .in('seller_id', sellerIds);
      if (customError) {
        console.warn('Error fetching stall customizations:', customError);
        setStallCustomizations({});
      } else {
        const map: Record<string, StallCustomization> = {};
        if (customizations) {
          (customizations as Array<StallCustomization & { seller_id: string }>).forEach((c) => {
            map[c.seller_id] = c;
          });
        }
        setStallCustomizations(map);
      }
    };
    fetchSellerNamesAndCustomizations();
  }, [sellers]);

  // Add an 'addAvatar' flag to each stall for avatar rendering
  const stalls: StallInput[] = useMemo(() => {
    return visibleSellers.map((s) => {
      const productImages = s.products.map((p) => ({ id: p.id, url: p.image_url || '' }));
      const customization = stallCustomizations[s.sellerId] || {};
      return {
        sellerId: s.sellerId,
        productImages,
        storeName: sellerNameMap[s.sellerId] || undefined,
        addAvatar: true,
        stallTheme: customization.stall_theme || 'default',
        welcomeMessage: customization.welcome_message || '',
        decor: customization.decor || {},
        featuredProductIds: customization.featured_product_ids || [],
      };
    });
  }, [visibleSellers, sellerNameMap, stallCustomizations]);

  useEffect(() => {
    let disposed = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    (async () => {
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
      // Pass stalls with addAvatar flag to scene, and theme
      const scene = await initMarketplaceScene(canvas, stalls, isLightTheme);
      if (!disposed) {
        sceneRef.current = scene;
        // --- Camera and controls adjustment for paginated stalls ---
        // Use only visible stalls for initial camera position
        if (scene.controls) {
          const visibleRows = Math.ceil(stalls.length / 3);
          scene.controls.maxDistance = Math.max(35, 18 * (visibleRows + 2));
          scene.controls.minDistance = 2;
          scene.controls.enablePan = true;
          scene.controls.enableZoom = true;
          scene.controls.enableRotate = true;
          scene.controls.dampingFactor = 0.18;
          scene.controls.rotateSpeed = 1.1;
          scene.controls.panSpeed = 1.1;
          scene.controls.zoomSpeed = 1.1;
          scene.controls.screenSpacePanning = true;
          // If no focusSellerId, start from last gate (behind last row of visible stalls)
          if (!focusSellerId) {
            const rowSpacing = 14;
            const gateZ = (visibleRows - 0.5) * rowSpacing + rowSpacing * 0.7;
            const insideOffset = -20;
            scene.controls.target.set(0, 1.2, gateZ + insideOffset);
            if (scene.camera) {
              scene.camera.position.set(8, 6, gateZ + 12 + insideOffset);
            }
          } else {
            // Target center row by default (visible stalls)
            scene.controls.target.set(0, 1.2, (visibleRows > 2 ? ((visibleRows - 1) * 7) : 0));
            if (scene.camera) {
              scene.camera.position.set(8, 6 + Math.max(0, visibleRows - 2) * 2, 12 + Math.max(0, visibleRows - 2) * 10);
            }
          }
        }
        scene.start();
        // If focusSellerId is provided, robustly simulate a 'goto-stall' click for the focused seller
        if (focusSellerId) {
          const stall = scene.stalls.find((s) => s.sellerId === focusSellerId);
          if (stall && stall.gotoButton) {
            // Enable carousel arrows for focused stall
            scene.stalls.forEach((s) => {
              const group = s.group as typeof s.group & StallCarousel;
              if (group && typeof group.setFocused === 'function') {
                group.setFocused(false);
              }
            });
            const group = stall.group as typeof stall.group & StallCarousel;
            if (group && typeof group.setFocused === 'function') {
              group.setFocused(true);
            }
            // Tween camera and controls target toward this stall
            const cam = scene.camera;
            const controls = scene.controls;
            const btnWorldPos = new THREE.Vector3();
            stall.gotoButton.getWorldPosition(btnWorldPos);
            const endTarget = btnWorldPos.clone();
            endTarget.y += 1.2;
            const stallCenter = new THREE.Vector3().setFromMatrixPosition(stall.group.matrixWorld);
            const dir = btnWorldPos.clone().sub(stallCenter).normalize();
            const endPos = btnWorldPos.clone().add(dir.multiplyScalar(6 + Math.max(0, maxRows - 2) * 2)).setY(btnWorldPos.y + 3 + Math.max(0, maxRows - 2) * 2);
            const startPos = cam.position.clone();
            const startTarget = controls.target.clone();
            const start = performance.now();
            const duration = 700;
            const animateTween = () => {
              const t = Math.min(1, (performance.now() - start) / duration);
              const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
              cam.position.lerpVectors(startPos, endPos, ease);
              controls.target.lerpVectors(startTarget, endTarget, ease);
              controls.update();
              if (t < 1) requestAnimationFrame(animateTween);
            };
            requestAnimationFrame(animateTween);
            // Trigger welcome message narration if available
            const customization = stallCustomizations[focusSellerId];
            if (customization && customization.welcome_message && typeof window !== 'undefined' && 'speechSynthesis' in window) {
              const utter = new window.SpeechSynthesisUtterance(customization.welcome_message);
              utter.rate = 1.05;
              window.speechSynthesis.speak(utter);
            }
          }
        }
      }
    })();
    return () => {
      disposed = true;
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
    };
  }, [stalls, isLightTheme, focusSellerId]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const current = sceneRef.current;
    if (!current) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ndc = new THREE.Vector2(x, y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, current.camera);
    // Check all billboard meshes
    const meshes = [
      ...current.stalls.flatMap((s: typeof current.stalls[number]) => s.billboards.map((b: typeof s.billboards[number]) => b.mesh)),
      ...current.stalls.map((s: typeof current.stalls[number]) => s.gotoButton).filter((btn): btn is Mesh => !!btn),
      // Add carousel arrows if present
      ...current.stalls.flatMap((s: typeof current.stalls[number]) => {
        const group = s.group as typeof s.group & StallCarousel;
        const arrows: Mesh[] = [];
        if (group && group.children) {
          group.children.forEach((child: Mesh | Object3D) => {
            if (child.userData && (child.userData.action === 'carousel-left' || child.userData.action === 'carousel-right')) {
              arrows.push(child as Mesh);
            }
          });
        }
        return arrows;
      }),
    ];
    const pick = raycaster.intersectObjects(meshes, true);
    if (pick.length > 0) {
      const hit = pick[0].object as Object3D & { userData?: { productId?: string; action?: string; sellerId?: string } };
      const id = hit.userData?.productId as string | undefined;
      if (id) {
        onProductClick(id);
        return;
      }
      const action = hit.userData?.action;
      if (action === 'goto-stall') {
        const sellerId = hit.userData?.sellerId as string;
        const stall = current.stalls.find((s: typeof current.stalls[number]) => s.sellerId === sellerId);
        if (stall) {
          // Hide carousel arrows for all stalls
          current.stalls.forEach((s) => {
            const group = s.group as typeof s.group & StallCarousel;
            if (group && typeof group.setFocused === 'function') {
              group.setFocused(false);
            }
          });
          // Show carousel arrows for the focused stall
          const group = stall.group as typeof stall.group & StallCarousel;
          if (group && typeof group.setFocused === 'function') {
            group.setFocused(true);
          }
          // Tween camera and controls target toward this stall
          const target = new THREE.Vector3().setFromMatrixPosition(stall.group.matrixWorld);
          const cam = current.camera;
          const controls = current.controls;
          const startPos = cam.position.clone();
          const startTarget = controls.target.clone();
          const endTarget = new THREE.Vector3(target.x, target.y + 1.2, target.z);
          const dir = new THREE.Vector3().subVectors(startPos, startTarget).normalize();
          const endPos = endTarget.clone().add(dir.multiplyScalar(8));
          const start = performance.now();
          const duration = 700;
          const animateTween = () => {
            const t = Math.min(1, (performance.now() - start) / duration);
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
            cam.position.lerpVectors(startPos, endPos, ease);
            controls.target.lerpVectors(startTarget, endTarget, ease);
            if (t < 1) requestAnimationFrame(animateTween);
          };
          requestAnimationFrame(animateTween);
          // Trigger welcome message narration if available
          const customization = stallCustomizations[sellerId];
          if (customization && customization.welcome_message && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utter = new window.SpeechSynthesisUtterance(customization.welcome_message);
            utter.rate = 1.05;
            window.speechSynthesis.speak(utter);
          }
        }
      } else if (action === 'carousel-left' || action === 'carousel-right') {
        const sellerId = hit.userData?.sellerId as string;
        const stall = current.stalls.find((s: typeof current.stalls[number]) => s.sellerId === sellerId);
        if (stall && stall.group) {
          const group = stall.group as typeof stall.group & StallCarousel;
          const pageSize = 4;
          const total = group.carouselProducts.length;
          if (action === 'carousel-left' && group.carouselPage > 0) {
            group.carouselPage -= 1;
            group.carouselUpdate();
          } else if (action === 'carousel-right' && (group.carouselPage + 1) * pageSize < total) {
            group.carouselPage += 1;
            group.carouselUpdate();
          }
        }
      }
    }
  };

  // Theme-aware colors and overlay
  const containerBg = isLightTheme
    ? 'bg-gradient-to-br from-blue-100 via-yellow-50 to-pink-100'
    : 'bg-gradient-to-br from-[#18181b] via-[#23233b] to-[#111418]';
  const overlayBg = isLightTheme
    ? 'bg-white/80 text-blue-700'
    : 'bg-yellow-900/80 text-yellow-100';

  // Double-click handler: move camera to ground position
  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const current = sceneRef.current;
    if (!current) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ndc = new THREE.Vector2(x, y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, current.camera);
    // Find all ground meshes (name === 'ground' or userData.ground)
    const groundMeshes = current.scene.children.filter(
      (obj: Mesh | Object3D) => obj.name === 'ground' || (obj.userData && obj.userData.ground)
    );
    if (groundMeshes.length === 0) return;
    // Raycast against all ground meshes
    type Intersection = ReturnType<typeof raycaster.intersectObject>[number];
    let intersects: Intersection[] = [];
    groundMeshes.forEach((mesh: Mesh | Object3D) => {
      intersects = intersects.concat(raycaster.intersectObject(mesh, true));
    });
    if (intersects.length > 0) {
      // Use closest intersection
      const point = intersects[0].point;
      const cam = current.camera;
      const controls = current.controls;
      const startPos = cam.position.clone();
      const startTarget = controls.target.clone();
      const endTarget = new THREE.Vector3(point.x, 1.2, point.z);
      const endPos = new THREE.Vector3(point.x + 8, 6, point.z + 12);
      const start = performance.now();
      const duration = 700;
      const animateTween = () => {
        const t = Math.min(1, (performance.now() - start) / duration);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        cam.position.lerpVectors(startPos, endPos, ease);
        controls.target.lerpVectors(startTarget, endTarget, ease);
        controls.update();
        if (t < 1) requestAnimationFrame(animateTween);
      };
      requestAnimationFrame(animateTween);
    }
  };

  // Keyboard movement: WASD/arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const current = sceneRef.current;
      if (!current || !current.controls || !current.camera) return;
      const controls = current.controls;
      const cam = current.camera;
      // Camera direction vectors
      const forward = new THREE.Vector3();
      cam.getWorldDirection(forward);
      forward.y = 0; // ignore vertical
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, cam.up).normalize();
  const move = new THREE.Vector3();
      const step = 3;
      switch (e.key) {
        case 'w': case 'ArrowUp': move.add(forward); break;
        case 's': case 'ArrowDown': move.add(forward.clone().negate()); break;
        case 'a': case 'ArrowLeft': move.add(right.clone().negate()); break;
        case 'd': case 'ArrowRight': move.add(right); break;
        default: return;
      }
      move.normalize().multiplyScalar(step);
      cam.position.add(move);
      controls.target.add(move);
      controls.update();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Virtual Joystick for Mobile ---
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement | null>(null);

  // Only show joystick on mobile screens
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Joystick movement handler
  useEffect(() => {
    if (!isMobile) return;
    let animationFrameId: number | null = null;
    const moveCamera = () => {
      if (!joystickActive) return;
      const current = sceneRef.current;
      if (!current || !current.controls || !current.camera) return;
      const controls = current.controls;
      const cam = current.camera;
      // Camera direction vectors
      const forward = new THREE.Vector3();
      cam.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, cam.up).normalize();
      // Normalize and scale movement
      const maxDist = 32;
      const dx = Math.max(-maxDist, Math.min(maxDist, joystickPos.x)) / maxDist;
      const dy = Math.max(-maxDist, Math.min(maxDist, joystickPos.y)) / maxDist;
      const speed = 0.22;
      // Move relative to camera angle
      const move = new THREE.Vector3();
  move.add(forward.clone().multiplyScalar(-dy * speed));
  move.add(right.clone().multiplyScalar(dx * speed));
      cam.position.add(move);
      controls.target.add(move);
      controls.update();
      animationFrameId = requestAnimationFrame(moveCamera);
    };
    if (joystickActive) {
      moveCamera();
    }
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [joystickActive, joystickPos.x, joystickPos.y, isMobile]);

  // Joystick drag logic
  const handleJoystickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setJoystickActive(true);
    setJoystickPos({ x: 0, y: 0 });
  };
  const handleJoystickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickActive) return;
    const touch = e.touches[0];
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = touch.clientX - (rect.left + rect.width / 2);
    const y = touch.clientY - (rect.top + rect.height / 2);
    setJoystickPos({ x, y });
  };
  const handleJoystickEnd = () => {
    setJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
  };

  return (
    <div className={`relative w-full max-w-6xl h-[70vh] rounded-2xl overflow-hidden shadow-2xl border border-yellow-400/20 ${containerBg}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />
      {/* Market name and Pagination Controls - avoid overlap with joystick on mobile */}
      <div
        className={
          `absolute left-0 right-0 flex flex-col items-center z-10 ` +
          (isMobile ? 'bottom-28' : 'bottom-4')
        }
      >
        <div className="mb-2 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-400 via-pink-300 to-indigo-300 text-yellow-900 font-bold shadow-lg text-lg tracking-wide">
          {marketName}
        </div>
        <div className="flex justify-center gap-4">
          <button
            className="px-4 py-2 rounded bg-yellow-500 text-white font-bold disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Prev
          </button>
          <span className="px-3 py-2 bg-white/80 rounded text-yellow-900 font-semibold shadow">Page {page + 1} / {totalPages}</span>
          <button
            className="px-4 py-2 rounded bg-yellow-500 text-white font-bold disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </button>
        </div>
      </div>
      {/* Controls overlay: hidden on mobile, smaller on laptop/desktop */}
      <div
        className={`pointer-events-none absolute top-2 right-2 ${overlayBg} text-[0.65rem] px-2 py-0.5 rounded-lg shadow-lg font-semibold backdrop-blur-md hidden sm:flex sm:items-center sm:gap-1 md:text-[0.7rem] md:px-2 md:py-1 md:rounded-xl lg:text-[0.8rem] lg:px-3 lg:py-1 lg:rounded-xl`}
      >
        <span className="inline-flex items-center gap-1">
          <span role="img" aria-label="rotate">🖱️</span> Left-drag: Rotate
          <span className="mx-1">•</span>
          <span role="img" aria-label="pan">🖱️</span> Right-drag: Pan
          <span className="mx-1">•</span>
          <span role="img" aria-label="zoom">🖱️</span> Wheel: Zoom
          <span className="mx-1">•</span>
          <span role="img" aria-label="move">🖱️</span> Double-click: Move to ground
          <span className="mx-1">•</span>
          <span role="img" aria-label="wasd">⌨️</span> WASD/Arrows: Move camera
        </span>
      </div>
      {/* Minimal joystick overlay for mobile */}
      {isMobile && (
        <div
          ref={joystickRef}
          className={`absolute bottom-4 left-4 z-20 w-20 h-20 rounded-full flex items-center justify-center ${isLightTheme ? 'bg-black/15' : 'bg-white/30 border border-white/80'}`}
          style={{ touchAction: 'none' }}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onTouchCancel={handleJoystickEnd}
        >
          <div
            className="w-7 h-7 rounded-full bg-gray-400/50"
            style={{
              transform: `translate(${joystickActive ? joystickPos.x : 0}px, ${joystickActive ? joystickPos.y : 0}px)`,
              transition: joystickActive ? 'none' : 'transform 0.2s',
              boxShadow: '0 0 3px #888',
            }}
          />
        </div>
      )}
    </div>
  );
}


