// Minimal XRSession type for WebXR
interface XRReferenceSpace {
  // Minimal property for reference space
  // You can extend as needed for your use case
  // For now, just a marker type
  readonly type?: string;
}
interface XRSession {
  end?: () => void;
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  requestReferenceSpace?: (type: string) => Promise<XRReferenceSpace>;
  state?: string;
  requestHitTestSource?: (options: { space: XRReferenceSpace }) => Promise<XRHitTestSource>;
}
interface XRHitTestSource {
  // Minimal property for hit test source
  cancel?: () => void;
}

import React, { useEffect, useRef, useState } from 'react';
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  HemisphereLight,
  TextureLoader,
  Vector3
} from 'three';
import { Texture } from 'three';

// ARViewer: Markerless AR using WebXR + Three.js
// Renders a sample cube in AR. Extend to load product models as needed.
export default function ARViewer({ open, onClose, imageUrl, productType }: { open: boolean; onClose: () => void; imageUrl?: string; productType?: 'vertical' | 'horizontal' }) {
  const arRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<InstanceType<typeof WebGLRenderer> | null>(null);
  const sessionRef = useRef<XRSession | null>(null);
  const [verticalPlaced, setVerticalPlaced] = React.useState(false);
  const verticalWorldPos = useRef<InstanceType<typeof Vector3> | null>(null);
  const tapHandlerRef = React.useRef<EventListener | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [arReady, setARReady] = useState(false); // Step 1: Separate state for when the user chooses to start AR
  const [showArStartupModal, setShowArStartupModal] = useState(false); // Modal/spinner state
  const closedRef = useRef(false);

  // Wrapper for onClose that only fires once per close cycle
  const handleClose = () => {
    if (!closedRef.current) {
      closedRef.current = true;
      sessionRef.current = null; // Mark session as ended
      
      onClose();
    }
  };

  // Function to process image with remove.bg API
  const processImageWithRemoveBg = async (imageUrl: string): Promise<string> => {
    try {
      setIsProcessingImage(true);
      
      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create FormData for remove.bg API
      const formData = new FormData();
      formData.append('file', blob, 'product.png');
      
      // Call remove.bg API
      const removeBgResponse = await fetch('/api/removebg', {
        method: 'POST',
        body: formData,
      });
      
      if (!removeBgResponse.ok) {
        throw new Error('Failed to remove background');
      }
      
      // Convert response to blob URL
      const processedBlob = await removeBgResponse.blob();
      const processedUrl = URL.createObjectURL(processedBlob);
      
      return processedUrl;
    } catch (error) {
      console.error('Error processing image:', error);
      // Return original image URL as fallback
      return imageUrl;
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Add useEffect that, upon AR open, shows the image processing modal and resets arReady
  useEffect(() => {
    if (open) {
      closedRef.current = false; // Reset close state for new session
      setARReady(false);
      setShowArStartupModal(true);
    } else {
      setShowArStartupModal(false);
    }
  }, [open]);

  // Effect for image removal (same as before)
  useEffect(() => {
    if (open && imageUrl && !processedImageUrl) {
      processImageWithRemoveBg(imageUrl).then(setProcessedImageUrl);
    }
  }, [open, imageUrl, processedImageUrl]);

  // 1. Reset processedImageUrl to null whenever imageUrl changes
  useEffect(() => {
    setProcessedImageUrl(null);
  }, [imageUrl]);

  // When processedImageUrl becomes available, keep modal, show Start AR button
  // Only trigger AR scene after arReady is true (user clicked Start AR)
  useEffect(() => {
    if (!open || !arRef.current || isProcessingImage || !processedImageUrl || !arReady) return;
  let renderer: InstanceType<typeof WebGLRenderer> | null = null;
  let scene: InstanceType<typeof Scene> | null = null;
  let camera: InstanceType<typeof PerspectiveCamera> | null = null;
  let plane: InstanceType<typeof Mesh> | null = null;
  let xrSession: XRSession | null = null;
  const animationId: number | null = null;

    async function startAR() {
      if (!('xr' in navigator)) {
        alert('WebXR not supported on this device/browser.');
        handleClose();
        return;
      }
      try {
  xrSession = await ((navigator as Navigator & { xr?: { requestSession: (mode: string, options?: object) => Promise<XRSession> } }).xr?.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test', 'local-floor'],
    optionalFeatures: ['plane-detection'] // <-- Add plane detection if available
  }) ?? null);
        sessionRef.current = xrSession;
        // Listen for end event and sync UI state
        if (xrSession && typeof xrSession.addEventListener === 'function') {
          xrSession.addEventListener('end', handleClose);
        }
      } catch (err) {
        alert('Failed to start AR session: ' + err);
        handleClose();
        return;
      }
  renderer = new WebGLRenderer({ alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      if (arRef.current) {
        arRef.current.appendChild(renderer.domElement);
      }
      rendererRef.current = renderer;

  scene = new Scene();
  camera = new PerspectiveCamera();
  scene.add(camera);
      // Add light
      const light = new HemisphereLight(0xffffff, 0xbbbbff, 1);
      light.position.set(0.5, 1, 0.25);
      scene.add(light);
      // Add product image as texture on a plane
  const setPlaneOrientation = (planeObj: InstanceType<typeof Mesh>) => {
        if (productType === 'horizontal') {
          // Flat on ground (XZ plane)
          planeObj.rotation.x = -Math.PI / 2;
        } else {
          // REVERSED LOGIC for vertical categories:
          // If hit-test detects local-floor, treat as wall (vertical placement)
          // If hit-test detects vertical plane, treat as floor (horizontal placement)
          // For now, always rotate as if on wall, but show a message
          planeObj.rotation.x = 0;
          planeObj.rotation.y = -Math.PI / 2;

        }
      };
      if (processedImageUrl) {
        const loader = new TextureLoader();
        loader.load(
          processedImageUrl,
          (texture: InstanceType<typeof Texture>) => {
            plane = new Mesh(
              new BoxGeometry(0.3, 0.3, 0.01),
              new MeshStandardMaterial({ map: texture, transparent: true })
            );
            plane.position.set(0, 0, -0.5);
            setPlaneOrientation(plane);
            scene.add(plane);
          },
          undefined,
          () => {
            // fallback to colored plane if image fails
            plane = new Mesh(
              new BoxGeometry(0.3, 0.3, 0.01),
              new MeshStandardMaterial({ color: 0xff6600, transparent: true })
            );
            plane.position.set(0, 0, -0.5);
            setPlaneOrientation(plane);
            scene.add(plane);
          }
        );
      } else {
        // fallback to colored plane if no image
        plane = new Mesh(
          new BoxGeometry(0.3, 0.3, 0.01),
          new MeshStandardMaterial({ color: 0xff6600, transparent: true })
        );
        plane.position.set(0, 0, -0.5);
        setPlaneOrientation(plane);
        scene.add(plane);
      }

      renderer.xr.setSession(xrSession);
      // --- BEGIN PLANE DETECTION HIT-TEST LOGIC ---
  let hitTestSource: XRHitTestSource | null = null;
    let xrRefSpace: XRReferenceSpace | null = null;
      if (xrSession && typeof xrSession.requestReferenceSpace === 'function') {
        xrRefSpace = await xrSession.requestReferenceSpace('local-floor');
      }
      if (xrSession && typeof xrSession.requestHitTestSource === 'function' && xrRefSpace) {
        try {
          hitTestSource = await xrSession.requestHitTestSource({ space: xrRefSpace });
        } catch (e) {}
      }
      function isVertical(normal: { x: number; y: number; z: number }) {
        // Returns true if the normal is perpendicular-ish to Y axis (for wall)
        // If Y component is small, it's a wall
        return Math.abs(normal.y) < 0.5;
      }
      if (productType === 'vertical') {
        // Place handler supports both touch and mouse/tap
        tapHandlerRef.current = (event: Event) => {
          const e = event as MouseEvent | TouchEvent;
          if (!verticalPlaced && !verticalWorldPos.current && renderer && camera) {
            const cameraDir = new Vector3();
            camera.getWorldDirection(cameraDir);
            const wallDistance = 1.2; // as preview
            const placedPos = camera.position.clone().add(cameraDir.multiplyScalar(wallDistance));
            verticalWorldPos.current = placedPos.clone();
            setVerticalPlaced(true);
            // Optional: feedback
            // console.log('Tap-to-place at', placedPos);
          }
        };
        const elem = renderer.domElement;
        elem.addEventListener('touchend', tapHandlerRef.current);
        elem.addEventListener('mousedown', tapHandlerRef.current);
      }
      // Main render loop
      function animate() {
  renderer.setAnimationLoop((timestamp: number, frame: { getHitTestResults: (source: XRHitTestSource) => unknown[] }) => {
          if (plane && productType === 'vertical') {
            if (!verticalPlaced && !verticalWorldPos.current) {
              // Live preview
              const cameraDir = new Vector3();
              camera.getWorldDirection(cameraDir);
              const wallDistance = 1.2;
              const previewPos = camera.position.clone().add(cameraDir.multiplyScalar(wallDistance));
              plane.position.copy(previewPos);
              plane.lookAt(camera.position);
              plane.rotation.x = 0;
              plane.rotation.z = 0;
              plane.visible = true;
            } else if (verticalWorldPos.current) {
              // Placed and anchored in world
              plane.position.copy(verticalWorldPos.current);
              plane.lookAt(camera.position);
              plane.rotation.x = 0;
              plane.rotation.z = 0;
              plane.visible = true;
            }
          } else if (plane && frame && xrSession && hitTestSource && productType === 'horizontal') {
            // Get hit-test results
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults && hitTestResults.length > 0) {
              interface XRHitTestPose {
                transform?: {
                  orientation?: { y?: number };
                  matrix?: number[];
                };
              }
              const hit = hitTestResults[0] as { createAnchor?: boolean; getPose: (space: XRReferenceSpace | null) => XRHitTestPose };
              if (hit.createAnchor) {
                // Try getting plane orientation via XRPlane (if supported)
                const pose = hit.getPose(xrRefSpace);
                let isWall = false;
                if (pose && pose.transform && pose.transform.orientation) {
                  if (pose.transform.matrix) {
                    const normalY = pose.transform.matrix[5];
                    isWall = Math.abs(normalY) < 0.5;
                  } else {
                    isWall = Math.abs(pose.transform.orientation.y ?? 0) < 0.5;
                  }
                }
                // --- Now apply orientation ---
                if (productType === 'horizontal') {
                  // Default placement for horizontal
                  setPlaneOrientation(plane);
                  plane.position.set(0, 0, -0.5);
                }
              } else {
                setPlaneOrientation(plane);
                plane.position.set(0, 0, -0.5);
              }
            } else {
              setPlaneOrientation(plane);
              plane.position.set(0, 0, -0.5);
            }
          } else if (plane) {
            // fallback (desktop or no AR)
            setPlaneOrientation(plane);
            plane.position.set(0, 0, -0.5);
          }
          renderer.render(scene!, camera!);
        });
      }
      // --- END PLANE DETECTION HIT-TEST LOGIC ---
      animate();
    }
    startAR();

    return () => {
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null);
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }
      // 2. AR cleanup/teardown. Safely end XRSession, ignoring already-ended error.
      if (sessionRef.current) {
        // Remove 'end' event listener if present
        if (typeof sessionRef.current.removeEventListener === 'function') {
          sessionRef.current.removeEventListener('end', handleClose);
        }
        try {
          // Canonical: if session.state exists, check not already 'ended'
          if (
            sessionRef.current.end &&
            (typeof sessionRef.current.state === 'undefined' || sessionRef.current.state !== 'ended')
          ) {
            sessionRef.current.end();
          }
        } catch (e) {
          // Fix for TS: 'name' might not exist on type {}
          const err = e as { name?: string };
          if (!(err && err.name === 'InvalidStateError')) {
            console.warn('ARViewer: XRSession.end() error:', e);
          }
        }
        sessionRef.current = null;
      }
      if (animationId) cancelAnimationFrame(animationId);
      if (tapHandlerRef.current && rendererRef.current) {
        const elem = rendererRef.current.domElement;
        elem.removeEventListener('touchend', tapHandlerRef.current);
        elem.removeEventListener('mousedown', tapHandlerRef.current);
      }
      verticalWorldPos.current = null;
      setVerticalPlaced(false);
      setProcessedImageUrl(null);
      setARReady(false);
    };
  }, [open, onClose, productType, processedImageUrl, isProcessingImage, arReady]);

  // Hook into every AR close
  useEffect(() => {
    if (!open) {
      setProcessedImageUrl(null);
      setARReady(false);
    }
  }, [open]);

  // In startAR, use handleClose instead of raw onClose:
  // xrSession.addEventListener('end', handleClose);
  // If you use handleClose elsewhere for cleanup, do so instead of onClose directly.

  // Modal & loading overlay logic
  // When AR is open but AR is not yet ready, show modal loader
  if (open && showArStartupModal && !arReady) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ background: '#222', padding: 32, borderRadius: 18, color: '#fff', minWidth: 320, textAlign: 'center', boxShadow: '0 4px 32px #0008' }}>
          {isProcessingImage || !processedImageUrl ? (
            <>
              <div style={{ fontSize: 38, marginBottom: 18 }}>🔄</div>
              <div style={{ marginBottom: 8 }}>
                Processing product image for AR...
              </div>
              <div style={{ fontSize: 13, color: '#ccc' }}>This can take a few seconds.</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 16 }}>✅</div>
              <div style={{ marginBottom: 10 }}>Image processed!</div>
              <button
                onClick={() => setARReady(true)}
                style={{ margin: '20px auto 0', background: '#218cf7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, padding: '12px 33px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px #0002' }}
              >
                Start AR
              </button>
              <div style={{ marginTop: 18 }}>
                <button onClick={handleClose} style={{ fontSize: 14, background: 'none', color: '#eee', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!open) return null;
  return (
    <div
      ref={arRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: 'rgba(0,0,0,0.8)',
      }}
    >
      {/* Loading indicator for image processing */}
      {isProcessingImage && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '20px 40px',
            borderRadius: 10,
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: 10 }}>🔄</div>
          <div>Processing image for AR...</div>
        </div>
      )}
      
    </div>
  );
}
