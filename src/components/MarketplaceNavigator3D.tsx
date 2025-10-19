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
}

export default function MarketplaceNavigator3D({ sellers, onProductClick }: NavigatorProps) {

interface NavigatorProps {
  sellers: { sellerId: string; products: Product[] }[];
  onProductClick: (productId: string) => void;
}

  // Use app theme from ThemeProvider
  const { theme } = useTheme();
  // dayMode: true for light, false for dark
  const isLightTheme = theme !== 'dark';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<null | Awaited<ReturnType<typeof initMarketplaceScene>>>(null);

  const [sellerNameMap, setSellerNameMap] = useState<Record<string, string>>({});
  useEffect(() => {
    const fetchSellerNames = async () => {
      const sellerIds = sellers.map(s => s.sellerId);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', sellerIds);
      if (error) {
        console.warn('Error fetching seller profiles:', error);
        setSellerNameMap({});
        return;
      }
      const map: Record<string, string> = {};
      if (profiles) {
        profiles.forEach((profile: { id: string; name: string }) => {
          map[profile.id] = profile.name;
        });
      }
      setSellerNameMap(map);
    };
    fetchSellerNames();
  }, [sellers]);

  // Add an 'addAvatar' flag to each stall for avatar rendering
  const stalls: StallInput[] = useMemo(() => {
    return sellers.map((s) => {
      const productImages = s.products.map((p) => ({ id: p.id, url: p.image_url || '' }));
      return {
        sellerId: s.sellerId,
        productImages,
        storeName: sellerNameMap[s.sellerId] || undefined,
        addAvatar: true, // signal to scene to render avatar
      };
    });
  }, [sellers, sellerNameMap]);

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
        scene.start();
      }
    })();
    return () => {
      disposed = true;
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
    };
  }, [stalls, isLightTheme]);

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

  return (
    <div className={`relative w-full max-w-6xl h-[70vh] rounded-2xl overflow-hidden shadow-2xl border border-yellow-400/20 ${containerBg}`}>
      <canvas ref={canvasRef} className="w-full h-full block" onClick={onClick} />
      <div className={`pointer-events-none absolute top-2 right-2 ${overlayBg} text-xs px-3 py-1 rounded-xl shadow-lg font-semibold backdrop-blur-md`}>
        <span className="inline-flex items-center gap-1">
          <span role="img" aria-label="rotate">🖱️</span> Left-drag: Rotate
          <span className="mx-1">•</span>
          <span role="img" aria-label="pan">🖱️</span> Right-drag: Pan
          <span className="mx-1">•</span>
          <span role="img" aria-label="zoom">🖱️</span> Wheel: Zoom
        </span>
      </div>
    </div>
  );
}


