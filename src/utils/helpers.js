import * as THREE from 'three';

// --- Clamp ---
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// --- Lerp ---
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// --- Distancia 2D (XZ, ignorando Y) ---
export function dist2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// --- Crear BoxGeometry fusionada (para reducir draw calls) ---
export function createMergedBox(w, h, d, material) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  return mesh;
}

// --- Ease in-out cuadratico ---
export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// --- Tween simple basado en tiempo ---
export function createTween(from, to, duration, onUpdate, onComplete) {
  const start = performance.now();
  function tick() {
    const elapsed = (performance.now() - start) / 1000;
    const t = clamp(elapsed / duration, 0, 1);
    onUpdate(lerp(from, to, easeInOut(t)));
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      if (onComplete) onComplete();
    }
  }
  requestAnimationFrame(tick);
}

// --- Generar color hex string CSS desde THREE color hex ---
export function hexToCSS(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

// --- Crear material estándar optimizado para hospital ---
export function createHospitalMaterial(color, roughness = 0.7, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// --- Evento de emisión simple (mini EventBus) ---
const _listeners = {};
export const EventBus = {
  on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
  },
  off(event, fn) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(f => f !== fn);
  },
  emit(event, data) {
    (_listeners[event] || []).forEach(fn => fn(data));
  },
};
