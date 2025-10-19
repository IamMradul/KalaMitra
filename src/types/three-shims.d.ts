declare module 'three';

declare module 'three/examples/jsm/controls/OrbitControls.js' {
  export class OrbitControls {
    constructor(object: any, domElement?: any);
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
    target: any;
    maxPolarAngle: number;
    update(): void;
    dispose(): void;
  }
}


