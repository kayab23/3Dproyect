import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
    this._initOrbitControls();
    this._initFog();
    this._handleResize();

    // Estado de transición de cámara (Tweening)
    this.isTweening = false;
    this.tweenProgress = 0;
    this.tweenDuration = 0;
    this.tweenStartPos = new THREE.Vector3();
    this.tweenEndPos = new THREE.Vector3();
    this.tweenStartLook = new THREE.Vector3();
    this.tweenEndLook = new THREE.Vector3();
    this.tweenOnComplete = null;
    this.currentLookAt = new THREE.Vector3();
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

  _initOrbitControls() {
    this.orbitControls = new OrbitControls(this.camera, this.canvas);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.enabled = false;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // no ir por debajo del suelo
    this.orbitControls.minDistance = 5;
    this.orbitControls.maxDistance = 60;
  }

  _initFog() {
    // Niebla sutil para dar profundidad
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

  // Iniciar transición suave de la cámara
  tweenCamera(targetPos, targetLook, duration = 1.0, onComplete = null) {
    this.isTweening = true;
    this.tweenProgress = 0;
    this.tweenDuration = duration;

    this.tweenStartPos.copy(this.camera.position);
    this.tweenEndPos.copy(targetPos);

    // Obtener hacia dónde mira la cámara al inicio de la transición
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.tweenStartLook.copy(this.camera.position).addScaledVector(dir, 5); // mirar a 5 metros frente a la cámara
    this.tweenEndLook.copy(targetLook);

    this.tweenOnComplete = onComplete;

    // Desactivar temporalmente OrbitControls durante el tween
    if (this.orbitControls.enabled) {
      this.orbitControls.enabled = false;
    }
  }

  _loop() {
    if (!this._running) return;
    requestAnimationFrame(() => this._loop());

    this.deltaTime = Math.min(this.clock.getDelta(), 0.05); // cap a 50 ms
    this.elapsed = this.clock.getElapsedTime();

    // Actualizar animación de transición (Tweening)
    if (this.isTweening) {
      this.tweenProgress += this.deltaTime / this.tweenDuration;
      const t = Math.min(this.tweenProgress, 1.0);

      // Interpolación suave cúbica (ease-in-out)
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // Interpolar posición de cámara
      this.camera.position.lerpVectors(this.tweenStartPos, this.tweenEndPos, easeT);

      // Interpolar punto de mira
      this.currentLookAt.lerpVectors(this.tweenStartLook, this.tweenEndLook, easeT);
      this.camera.lookAt(this.currentLookAt);

      if (t >= 1.0) {
        this.isTweening = false;
        if (this.tweenOnComplete) {
          this.tweenOnComplete();
        }
      }
    } else if (this.orbitControls.enabled) {
      this.orbitControls.update();
    }

    for (const fn of this._updateCallbacks) {
      fn(this.deltaTime, this.elapsed);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
