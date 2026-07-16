import * as THREE from 'three';
import { AMBIENT_INTENSITY, ROOM_LIGHT_INTENSITY, SHADOW_MAP_SIZE, COLORS } from '../utils/constants.js';

// ============================================================
// LIGHTING — Iluminación hospitalaria dinámica por área
// 🔧 Ajuste: sombras solo activas en área actual + adyacentes
// ============================================================

export class Lighting {
  constructor(scene) {
    this.scene = scene;
    this._areaLights = new Map(); // areaId -> THREE.PointLight[]
    this._shadowLights = [];      // luces con sombras actualmente activas

    this._addAmbient();
    this._addHemisphere();
  }

  _addAmbient() {
    // Luz ambiental fría — tipo fluorescente hospitalario
    this.ambient = new THREE.AmbientLight(0xd0dff0, AMBIENT_INTENSITY);
    this.scene.add(this.ambient);
  }

  _addHemisphere() {
    // Cielo frío, suelo ligeramente más cálido
    this.hemi = new THREE.HemisphereLight(0xd0e8ff, 0xb0c4d8, 0.4);
    this.scene.add(this.hemi);
  }

  // Añadir luz para un área con posición y color específicos
  addAreaLight(areaId, positions, color = 0xffffff, intensity = ROOM_LIGHT_INTENSITY) {
    const lights = [];
    for (const pos of positions) {
      const light = new THREE.PointLight(color, intensity, 12, 1.5);
      light.position.set(pos.x, pos.y, pos.z);
      light.castShadow = false; // comienzan desactivadas
      light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = 15;
      light.shadow.bias = -0.001;
      this.scene.add(light);
      lights.push(light);
    }
    this._areaLights.set(areaId, lights);
    return lights;
  }

  // Llamar cuando el jugador cambia de área
  // Activa sombras solo en el área actual; desactiva las demás
  setActiveArea(areaId) {
    // Desactivar todas las sombras
    for (const [, lights] of this._areaLights) {
      for (const l of lights) {
        l.castShadow = false;
        l.intensity = ROOM_LIGHT_INTENSITY * 0.5; // atenuar áreas inactivas
      }
    }
    // Activar sombras del área actual
    const activeLights = this._areaLights.get(areaId);
    if (activeLights) {
      for (const l of activeLights) {
        l.castShadow = true;
        l.intensity = ROOM_LIGHT_INTENSITY;
      }
    }
  }

  // Luz techo fluorescente procedural
  createCeilingLight(x, y, z, color = 0xeef2ff) {
    const light = new THREE.RectAreaLight(color, 3, 1.2, 0.3);
    light.position.set(x, y, z);
    light.lookAt(x, 0, z);
    this.scene.add(light);
    return light;
  }
}
