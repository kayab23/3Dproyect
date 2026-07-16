import * as THREE from 'three';
import { EventBus, createTween } from '../utils/helpers.js';
import { FLOOR_Y, PLAYER_HEIGHT } from '../utils/constants.js';

// ============================================================
// DOOR SYSTEM — Puertas automáticas que se abren al acercarse
// ============================================================

export class DoorSystem {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collision = collisionSystem;
    this._doors = [];

    this._matDoor = new THREE.MeshStandardMaterial({
      color: 0xe0e8f0,
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.85,
    });
  }

  // Crea una puerta entre dos áreas
  createDoor(x, y, z, isXAxis = true, label = '', parentGroup = this.scene) {
    const group = new THREE.Group();
    const doorW = 1.4;
    const doorH = 2.4;
    const doorD = 0.08;

    const geo = new THREE.BoxGeometry(
      isXAxis ? doorW : doorD,
      doorH,
      isXAxis ? doorD : doorW
    );
    const mesh = new THREE.Mesh(geo, this._matDoor.clone());
    mesh.castShadow = true;
    group.add(mesh);
    group.position.set(x, y + doorH / 2, z);
    group.userData._baseY = y + doorH / 2;
    group.userData.isOpen = false;
    group.userData.isXAxis = isXAxis;
    group.userData.doorMesh = mesh;
    group.userData.label = label;

    parentGroup.add(group);
    this.collision.addWall(mesh);

    this._doors.push(group);
    return group;
  }

  // Actualizar estado de puertas según posición del jugador
  update(playerPos) {
    for (const door of this._doors) {
      const dist = playerPos.distanceTo(door.position);
      const shouldOpen = dist < 2.5;

      if (shouldOpen && !door.userData.isOpen) {
        door.userData.isOpen = true;
        this._openDoor(door);
      } else if (!shouldOpen && door.userData.isOpen) {
        door.userData.isOpen = false;
        this._closeDoor(door);
      }
    }
  }

  _openDoor(door) {
    const startY = door.position.y;
    // Deslizar hacia arriba (puerta automática)
    createTween(0, 2.6, 0.4, (v) => {
      door.position.y = startY + v;
      door.userData.doorMesh.material.opacity = Math.max(0.05, 0.85 - v / 2.6 * 0.8);
    });
  }

  _closeDoor(door) {
    const startY = door.position.y;
    createTween(startY - door.userData._baseY || 0, 0, 0.4, (v) => {
      door.position.y = door.userData._baseY + v;
      door.userData.doorMesh.material.opacity = 0.85;
    });
    door.position.y = door.userData._baseY || door.position.y;
  }
}
