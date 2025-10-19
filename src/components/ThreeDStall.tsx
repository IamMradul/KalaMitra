import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { initStallScene, BillboardSpec } from '../utils/stallScene';
import { Product, StallProps } from '../types/product';

export default function ThreeDStall({ sellerId, sellerName, products, onAddToCart, onViewDetails }: StallProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<ReturnType<typeof initStallScene> | null>(null);

  const [selected, setSelected] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const billboardSpecs: BillboardSpec[] = useMemo(() => {
    const positions = [
      new THREE.Vector3(-2.8, 1.4, 0.3),
      new THREE.Vector3(-1.0, 1.45, 0.15),
      new THREE.Vector3(0.8, 1.4, -0.05),
      new THREE.Vector3(2.6, 1.35, 0.1),
    ];
    return products.slice(0, 8).map((p, idx) => ({
      id: p.id,
      imageUrl: p.image_url,
      width: 1.0,
      height: 1.25,
      position: positions[idx % positions.length].clone().add(new THREE.Vector3(0, Math.floor(idx / positions.length) * 0.1, (idx % 2 === 0 ? 1 : -1) * 0.02)),
    }));
  }, [products]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize scene
    sceneRef.current?.dispose();
    sceneRef.current = initStallScene(canvas, billboardSpecs);
    sceneRef.current.start();

    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [billboardSpecs]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const current = sceneRef.current;
    if (!current) return;

    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const pointer = new THREE.Vector2(x, y);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, current.camera);
    const intersects = raycaster.intersectObjects(current.billboards.map((b) => b.mesh));
    if (intersects.length > 0) {
  const hit = intersects[0].object as InstanceType<typeof import('three')['Mesh']>;
      const id = current.billboards.find((b) => b.mesh === hit)?.id;
      if (id) {
        const product = products.find((p) => p.id === id) ?? null;
        setSelected(product);
        setModalOpen(true);
        onViewDetails(id);
      }
    }
  }, [products, onViewDetails]);

  const closeModal = useCallback(() => setModalOpen(false), []);
  const handleAddToCart = useCallback((productId: string) => onAddToCart(productId), [onAddToCart]);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{sellerName}</h2>
          <p className="text-sm text-gray-500">Stall ID: {sellerId}</p>
        </div>
        <div className="text-xs text-gray-500">Click a product to view details</div>
      </div>
      <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden shadow-lg bg-[#f7f2ea]">
        <canvas ref={canvasRef} className="w-full h-full block" onClick={handleCanvasClick} />
      </div>
    </div>
  );
}


