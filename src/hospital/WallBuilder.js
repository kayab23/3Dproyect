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
  createSolidWall(x, y, z, width, height, depth, parentGroup = this.scene) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, this._matWall);
    mesh.position.set(x, y + height / 2, z);
    mesh.receiveShadow = true;
    mesh.castShadow = false; // paredes no necesitan cast shadow
    mesh.userData.isWall = true;
    parentGroup.add(mesh);
    this.collision?.addWall(mesh);
    return mesh;
  }

  // Crear pared interior con ventana de vidrio
  // La ventana ocupa el centro (ancho 60%), el resto son paneles sólidos
  createGlassWall(x, y, z, length, height, isXAxis = true, parentGroup = this.scene) {
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
    parentGroup.add(group);
    group.updateMatrixWorld(true);

    // Colisión de los paneles sólidos — left/right ya heredan la posición
    // del grupo vía la jerarquía de la escena, no hay que sumarla de nuevo
    this.collision?.addWall(left);
    this.collision?.addWall(right);

    return group;
  }

  // Crear pared de vidrio curvo (esquina de cápsula)
  createCurvedGlassWall(x, y, z, radius, angleStart, angleLength, height, parentGroup = this.scene) {
    const group = new THREE.Group();

    // Vidrio curvo
    const glassGeo = new THREE.CylinderGeometry(
      radius, radius, height,
      24, 1, true,
      angleStart, angleLength
    );
    const glass = new THREE.Mesh(glassGeo, this._matGlass);
    group.add(glass);

    // Marcos metálicos curvos en parte superior e inferior
    const frameThickness = 0.05;
    const topFrameGeo = new THREE.CylinderGeometry(
      radius, radius, frameThickness,
      24, 1, true,
      angleStart, angleLength
    );
    
    const topFrame = new THREE.Mesh(topFrameGeo, this._matFrame);
    topFrame.position.y = height / 2 - frameThickness / 2;
    group.add(topFrame);

    const bottomFrame = topFrame.clone();
    bottomFrame.position.y = -height / 2 + frameThickness / 2;
    group.add(bottomFrame);

    group.position.set(x, y + height / 2, z);
    parentGroup.add(group);

    // Registrar para colisión (evitar atravesar el vidrio curvo)
    // El raycast simple funciona con cilindros
    glass.userData.isWall = true;
    this.collision?.addWall(glass);

    return group;
  }
}
