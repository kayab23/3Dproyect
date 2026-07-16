import * as THREE from 'three';
import { COLLISION_DISTANCE, PLAYER_RADIUS, HOTSPOT_INTERACT_DIST } from '../utils/constants.js';

// ============================================================
// COLLISION SYSTEM — Raycasting en 4 + 1 direcciones
// ============================================================

export class CollisionSystem {
  constructor(scene) {
    this.scene = scene;
    this._walls = [];    // Objetos sólidos (paredes, muebles)
    this._hotspots = []; // Objetos interactivos

    // Rayos para colisión de movimiento (XZ)
    this._ray = new THREE.Raycaster();
    this._ray.far = COLLISION_DISTANCE;

    // Rayo hacia abajo para suelo
    this._downRay = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 3);
  }

  addWall(mesh) { this._walls.push(mesh); }
  addWalls(meshes) { meshes.forEach(m => this._walls.push(m)); }
  addHotspot(hotspotObj) { this._hotspots.push(hotspotObj); }
  removeHotspot(h) { this._hotspots = this._hotspots.filter(x => x !== h); }

  // Retorna el vector de movimiento corregido (sin colisiones)
  resolveMovement(position, delta) {
    const result = delta.clone();
    const dirs = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];

    const eyePos = position.clone().add(new THREE.Vector3(0, 0, 0)); // a altura de ojos

    for (const dir of dirs) {
      this._ray.set(eyePos, dir);
      const hits = this._ray.intersectObjects(this._walls, false);
      if (hits.length > 0 && hits[0].distance < PLAYER_RADIUS + COLLISION_DISTANCE) {
        // Bloquear el componente en esa dirección
        const dot = delta.dot(dir);
        if (dot > 0) {
          result.addScaledVector(dir, -dot);
        }
      }
    }

    return result;
  }

  // Retorna el hotspot más cercano dentro del rango de interacción
  getNearestInteractable(position) {
    let nearest = null;
    let minDist = HOTSPOT_INTERACT_DIST;

    for (const h of this._hotspots) {
      const dist = position.distanceTo(h.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = h;
      }
    }
    return nearest;
  }

  // Raycast de pantalla para click en hotspot
  raycastClick(position, direction, objects) {
    this._ray.set(position, direction);
    this._ray.far = 10;
    const hits = this._ray.intersectObjects(objects, true);
    return hits.length > 0 ? hits[0] : null;
  }
}
