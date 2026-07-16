import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import {
  PLAYER_HEIGHT, MOVE_SPEED, SPRINT_SPEED,
  HEAD_BOB_FREQ, HEAD_BOB_AMP,
} from '../utils/constants.js';
import { EventBus } from '../utils/helpers.js';

// ============================================================
// CONTROLS — PointerLockControls + WASD + Head Bobbing
// ============================================================

export class Controls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.enabled = false;
    this._bobTime = 0;
    this._isMoving = false;
    this._baseY = PLAYER_HEIGHT;

    // Teclas
    this._keys = { w: false, a: false, s: false, d: false, shift: false };

    // PointerLockControls
    this.plc = new PointerLockControls(camera, domElement);

    this._setupKeyListeners();
    this._setupPointerLock();
  }

  _setupPointerLock() {
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement !== null;
      this.enabled = locked;
      EventBus.emit('pointerlock', { locked });
    });

    document.addEventListener('pointerlockerror', () => {
      console.warn('[Controls] PointerLock error');
    });
  }

  _setupKeyListeners() {
    const down = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup')    this._keys.w = true;
      if (k === 'a' || k === 'arrowleft')  this._keys.a = true;
      if (k === 's' || k === 'arrowdown')  this._keys.s = true;
      if (k === 'd' || k === 'arrowright') this._keys.d = true;
      if (k === 'shift') this._keys.shift = true;
      if (k === 'e') EventBus.emit('interact');
    };
    const up = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup')    this._keys.w = false;
      if (k === 'a' || k === 'arrowleft')  this._keys.a = false;
      if (k === 's' || k === 'arrowdown')  this._keys.s = false;
      if (k === 'd' || k === 'arrowright') this._keys.d = false;
      if (k === 'shift') this._keys.shift = false;
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
  }

  lock() { this.plc.lock(); }
  unlock() { this.plc.unlock(); }

  // Llamar desde el game loop, pasando el CollisionSystem
  update(dt, elapsed, collisionSystem) {
    if (!this.enabled) return;

    const speed = this._keys.shift ? SPRINT_SPEED : MOVE_SPEED;
    const moving = this._keys.w || this._keys.a || this._keys.s || this._keys.d;
    this._isMoving = moving;

    // Calcular desplazamiento deseado
    const delta = new THREE.Vector3();
    if (this._keys.w) delta.z -= 1;
    if (this._keys.s) delta.z += 1;
    if (this._keys.a) delta.x -= 1;
    if (this._keys.d) delta.x += 1;

    if (delta.lengthSq() > 0) {
      delta.normalize().multiplyScalar(speed * dt);
      // Rotar al espacio de la cámara (solo en plano XZ)
      delta.applyEuler(new THREE.Euler(0, this.camera.rotation.y, 0, 'YXZ'));
    }

    // Aplicar colisiones
    if (collisionSystem) {
      const safe = collisionSystem.resolveMovement(
        this.camera.position, delta
      );
      this.camera.position.add(safe);
    } else {
      this.camera.position.add(delta);
    }

    // Limitar posición del jugador dentro de la losa del hospital (evitar caer al vacío)
    const minX = -26.0, maxX = 26.0;
    const minZ = -16.5, maxZ = 22.5;
    if (this.camera.position.x < minX) this.camera.position.x = minX;
    if (this.camera.position.x > maxX) this.camera.position.x = maxX;
    if (this.camera.position.z < minZ) this.camera.position.z = minZ;
    if (this.camera.position.z > maxZ) this.camera.position.z = maxZ;

    // Head bobbing
    if (moving) {
      this._bobTime += dt * HEAD_BOB_FREQ * (this._keys.shift ? 1.6 : 1);
      const bob = Math.sin(this._bobTime * Math.PI * 2) * HEAD_BOB_AMP;
      this.camera.position.y = this._baseY + bob;
    } else {
      // Suavizar vuelta al centro
      this.camera.position.y += (this._baseY - this.camera.position.y) * 0.15;
    }
  }

  resetKeys() {
    this._keys.w = false;
    this._keys.a = false;
    this._keys.s = false;
    this._keys.d = false;
    this._keys.shift = false;
    this._isMoving = false;
  }

  setBaseY(y) {
    this._baseY = y + PLAYER_HEIGHT;
    this.camera.position.y = this._baseY;
  }

  get direction() {
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    return d;
  }
}
