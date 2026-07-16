import * as THREE from 'three';
import { WALL_THICKNESS, ROOM_HEIGHT, COLORS } from '../utils/constants.js';

// ============================================================
// WALL BUILDER — Construye paredes individuales y ventanas de vidrio
// Paredes exteriores sólidas, interiores con panel de vidrio
// ============================================================

export class WallBuilder {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collision = collisionSystem;

    // Materiales compartidos — creados una vez, reutilizados
    this._matWall = new THREE.MeshStandardMaterial({
      color: COLORS.WALL_HOSPITAL,
      roughness: 0.85,
      metalness: 0.0,
    });
    // Vidrio esmerilado — como los paneles translúcidos de la referencia
    this._matGlass = new THREE.MeshPhysicalMaterial({
      color: 0xdcecff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.55,
      metalness: 0.0,
      transmission: 0.55,
      thickness: 0.4,
      side: THREE.DoubleSide,
    });
    this._matFrame = new THREE.MeshStandardMaterial({
      color: 0xd0daea,
      roughness: 0.5,
      metalness: 0.2,
    });
  }

  // Crear pared sólida
  // axis: 'x' o 'z', pos: {x,y,z}, length, height
  createSolidWall(x, y, z, width, height, depth) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, this._matWall);
    mesh.position.set(x, y + height / 2, z);
    mesh.receiveShadow = true;
    mesh.castShadow = false; // paredes no necesitan cast shadow
    mesh.userData.isWall = true;
    this.scene.add(mesh);
    this.collision?.addWall(mesh);
    return mesh;
  }

  // Crear pared interior con ventana de vidrio
  // La ventana ocupa el centro (ancho 60%), el resto son paneles sólidos
  createGlassWall(x, y, z, length, height, isXAxis = true) {
    const group = new THREE.Group();

    const solidW = length * 0.12;
    const glassW = length * 0.76;
    const frameH = 0.15;

    // Panel izquierdo sólido
    const leftGeo = new THREE.BoxGeometry(
      isXAxis ? solidW : WALL_THICKNESS,
      height,
      isXAxis ? WALL_THICKNESS : solidW
    );
    const left = new THREE.Mesh(leftGeo, this._matWall);
    left.position.set(isXAxis ? -(glassW / 2 + solidW / 2) : 0, 0, isXAxis ? 0 : -(glassW / 2 + solidW / 2));

    // Panel derecho sólido
    const right = left.clone();
    right.position.set(isXAxis ? (glassW / 2 + solidW / 2) : 0, 0, isXAxis ? 0 : (glassW / 2 + solidW / 2));

    // Marco superior
    const topGeo = new THREE.BoxGeometry(
      isXAxis ? glassW : WALL_THICKNESS,
      frameH,
      isXAxis ? WALL_THICKNESS : glassW
    );
    const top = new THREE.Mesh(topGeo, this._matFrame);
    top.position.set(0, height / 2 - frameH / 2, 0);

    // Marco inferior
    const bottom = top.clone();
    bottom.position.set(0, -height / 2 + frameH / 2, 0);

    // Panel de vidrio
    const glassGeo = new THREE.BoxGeometry(
      isXAxis ? glassW : WALL_THICKNESS * 0.5,
      height - frameH * 2,
      isXAxis ? WALL_THICKNESS * 0.5 : glassW
    );
    const glass = new THREE.Mesh(glassGeo, this._matGlass);

    group.add(left, right, top, bottom, glass);
    group.position.set(x, y + height / 2, z);
    this.scene.add(group);
    group.updateMatrixWorld(true);

    // Colisión de los paneles sólidos — left/right ya heredan la posición
    // del grupo vía la jerarquía de la escena, no hay que sumarla de nuevo
    // (sumarla aquí duplicaba el offset y generaba cajas de colisión
    // flotando lejos de la pared visible, bloqueando el paso al azar).
    this.collision?.addWall(left);
    this.collision?.addWall(right);

    return group;
  }
}
