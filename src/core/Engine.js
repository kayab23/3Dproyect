import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================================
// CORE ENGINE — Configuración de Three.js y bucle de renderizado
// Soporta alternar entre cámara perspectiva (FPS) y ortográfica (Isométrica)
// ============================================================

export class Engine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.deltaTime = 0;
    this.elapsed = 0;
    this._running = false;
    this._updateCallbacks = [];

    // Lógica para interpolación de cámara (Tweens)
    this.isTweening = false;
    this.tweenProgress = 0;
    this.tweenDuration = 1.0;
    this.tweenStartPos = new THREE.Vector3();
    this.tweenEndPos = new THREE.Vector3();
    this.tweenStartLook = new THREE.Vector3();
    this.tweenEndLook = new THREE.Vector3();
    this.tweenOnComplete = null;
    this.currentLookAt = new THREE.Vector3();

    this._initRenderer();
    this._initCamera();
    this._initOrbitControls();
    this._initFog();
    this._handleResize();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _initCamera() {
    // 1. Cámara de Perspectiva (Exploración a pie)
    this.perspCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.perspCamera.position.set(0, 1.7, 0);

    // 2. Cámara Ortográfica (Vista Maqueta Isométrica)
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 30;
    this.orthoCamera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    // Configurar posición en el ángulo isométrico estándar (45° rotación, 35.264° inclinación)
    this.orthoCamera.position.set(38, 28, 38);
    this.orthoCamera.lookAt(0, 0, 0);

    // La cámara activa por defecto es la perspectiva
    this.camera = this.perspCamera;
  }

  _initOrbitControls() {
    // El OrbitControls está vinculado a la cámara ortográfica para la vista isométrica
    this.orbitControls = new OrbitControls(this.orthoCamera, this.canvas);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.enabled = false;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // No descender del suelo
    this.orbitControls.minZoom = 0.5;
    this.orbitControls.maxZoom = 3.0;
  }

  _initFog() {
    // Niebla suave
    this.scene.fog = new THREE.FogExp2(0xd8e4f0, 0.012);
    this.scene.background = new THREE.Color(0xd8e4f0);
  }

  _handleResize() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const aspect = w / h;

      // Redimensionar perspectiva
      this.perspCamera.aspect = aspect;
      this.perspCamera.updateProjectionMatrix();

      // Redimensionar ortográfica
      const frustumSize = 30;
      this.orthoCamera.left = -frustumSize * aspect / 2;
      this.orthoCamera.right = frustumSize * aspect / 2;
      this.orthoCamera.top = frustumSize / 2;
      this.orthoCamera.bottom = -frustumSize / 2;
      this.orthoCamera.updateProjectionMatrix();

      this.renderer.setSize(w, h);
    });
  }

  // Alternar el tipo de cámara activa
  setCameraMode(mode) {
    if (mode === 'global') {
      this.camera = this.orthoCamera;
      this.orbitControls.enabled = true;
      // Posicionar la cámara ortográfica para que mantenga un ángulo isométrico limpio
      this.orthoCamera.position.set(38, 28, 38);
      this.orbitControls.target.set(0, 0, 0);
      this.orthoCamera.lookAt(0, 0, 0);
    } else {
      this.camera = this.perspCamera;
      this.orbitControls.enabled = false;
    }
  }

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

  // Iniciar transición suave de la cámara (siempre se realiza usando la perspectiva para que sea fluida)
  tweenCamera(targetPos, targetLook, duration = 1.0, onComplete = null) {
    this.isTweening = true;
    this.tweenProgress = 0;
    this.tweenDuration = duration;

    // Si estábamos en modo ortográfico, copiar la posición y el foco a la perspectiva
    if (this.camera === this.orthoCamera) {
      this.perspCamera.position.copy(this.orthoCamera.position);
      this.perspCamera.lookAt(this.orbitControls.target);
    }

    // Asegurar que use la cámara de perspectiva para la cinemática de viaje
    this.camera = this.perspCamera;
    this.orbitControls.enabled = false;

    this.tweenStartPos.copy(this.perspCamera.position);
    this.tweenEndPos.copy(targetPos);

    const dir = new THREE.Vector3();
    this.perspCamera.getWorldDirection(dir);
    this.tweenStartLook.copy(this.perspCamera.position).addScaledVector(dir, 5);
    this.tweenEndLook.copy(targetLook);

    this.tweenOnComplete = onComplete;
  }

  _loop() {
    if (!this._running) return;
    requestAnimationFrame(() => this._loop());

    this.deltaTime = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed = this.clock.getElapsedTime();

    // Animación de transición (Tweening)
    if (this.isTweening) {
      this.tweenProgress += this.deltaTime / this.tweenDuration;
      const t = Math.min(this.tweenProgress, 1.0);

      // Interpolación cúbica
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.perspCamera.position.lerpVectors(this.tweenStartPos, this.tweenEndPos, easeT);
      this.currentLookAt.lerpVectors(this.tweenStartLook, this.tweenEndLook, easeT);
      this.perspCamera.lookAt(this.currentLookAt);

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
