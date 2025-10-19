declare module 'three';

declare module 'three/examples/jsm/controls/OrbitControls.js' {
  export class OrbitControls {
    constructor(object: import('three').Camera, domElement?: HTMLElement);
    enableDamping: boolean;
    dampingFactor: number;
    enablePan: boolean;
    enableRotate: boolean;
    enableZoom: boolean;
    minDistance: number;
    maxDistance: number;
    rotateSpeed: number;
    panSpeed: number;
    zoomSpeed: number;
    screenSpacePanning: boolean;
  target: import('three').Vector3;
    maxPolarAngle: number;
    update(): void;
    dispose(): void;
  }
}


