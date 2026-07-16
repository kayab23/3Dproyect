import * as THREE from 'three';

// ============================================================
// ENGINE — Renderer, Scene, Camera, Game Loop
// ============================================================

export class Engine {
  constructor(canvasId = 'hospital-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.deltaTime = 0;
    this.elapsed = 0;
    this._running = false;
    this._updateCallbacks = [];

    this._initRenderer();
    this._initCamera();
    this._initFog();
    this._handleResize();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap a 1.5 para rendimiento
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200  // far plane reducido — hospital no es enorme
    );
    // La posición real la gestiona Controls.js
    this.camera.position.set(0, 1.7, 0);
  }

  _initFog() {
    // Niebla sutil para dar profundidad al corredor
    this.scene.fog = new THREE.FogExp2(0xd8e4f0, 0.015);
    this.scene.background = new THREE.Color(0xd8e4f0);
  }

  _handleResize() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  // Registrar callbacks del game loop
  onUpdate(fn) {
    this._updateCallbacks.push(fn);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this.clock.start();
    this._loop();
  }

  stop() {
    this._running = false;
  }

  _loop() {
    if (!this._running) return;
    requestAnimationFrame(() => this._loop());

    this.deltaTime = Math.min(this.clock.getDelta(), 0.05); // cap a 50 ms
    this.elapsed = this.clock.getElapsedTime();

    for (const fn of this._updateCallbacks) {
      fn(this.deltaTime, this.elapsed);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
