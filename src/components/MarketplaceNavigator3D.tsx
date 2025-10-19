import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { initMarketplaceScene, StallInput } from '../utils/marketplaceScene';
import { Product } from '../types/product';

interface NavigatorProps {
  sellers: { sellerId: string; products: Product[] }[];
  onProductClick: (productId: string) => void;
}

export default function MarketplaceNavigator3D({ sellers, onProductClick }: NavigatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<ReturnType<typeof initMarketplaceScene> | null>(null);

  const stalls: StallInput[] = useMemo(() => {
    console.log('MarketplaceNavigator3D: Processing sellers:', sellers);
    const result = sellers.map((s) => {
      const productImages = s.products.map((p) => {
        console.log('Product:', p.id, 'image_url:', p.image_url);
        return { id: p.id, url: p.image_url || '' };
      });
      console.log('Stall for seller', s.sellerId, 'has products:', productImages);
      return {
        sellerId: s.sellerId,
        productImages
      };
    });
    console.log('Final stalls data:', result);
    return result;
  }, [sellers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    sceneRef.current?.dispose();
    sceneRef.current = initMarketplaceScene(canvas, stalls);
    sceneRef.current.start();
    return () => { sceneRef.current?.dispose(); sceneRef.current = null; };
  }, [stalls]);

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
      ...current.stalls.flatMap((s) => s.billboards.map((b) => b.mesh)),
      ...current.stalls.map((s) => s.gotoButton).filter(Boolean) as any[],
    ];
    const pick = raycaster.intersectObjects(meshes, true);
    if (pick.length > 0) {
      const hit = pick[0].object as any;
      const id = (hit as any).userData?.productId as string | undefined;
      if (id) {
        onProductClick(id);
        return;
      }
      const action = (hit as any).userData?.action;
      if (action === 'goto-stall') {
        const sellerId = (hit as any).userData?.sellerId as string;
        const stall = current.stalls.find((s) => s.sellerId === sellerId);
        if (stall) {
          // Tween camera and controls target toward this stall
          const target = new THREE.Vector3().setFromMatrixPosition((stall.group as any).matrixWorld);
          const cam = current.camera;
          const controls = current.controls as any;
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

  return (
    <div className="relative w-full max-w-6xl h-[70vh] rounded-xl overflow-hidden shadow-2xl bg-[#111418]">
      <canvas ref={canvasRef} className="w-full h-full block" onClick={onClick} />
      <div className="pointer-events-none absolute top-2 right-2 bg-white/80 text-gray-700 text-xs px-2 py-1 rounded shadow">
        Left-drag: Rotate • Right-drag: Pan • Wheel: Zoom
      </div>
    </div>
  );
}


