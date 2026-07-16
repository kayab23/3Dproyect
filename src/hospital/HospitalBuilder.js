import * as THREE from 'three';
import { FloorPlan } from './FloorPlan.js';
import { WallBuilder } from './WallBuilder.js';
import {
  ROOM_HEIGHT, FLOOR_THICKNESS, WALL_THICKNESS,
  COLORS, FLOOR_Y,
} from '../utils/constants.js';

// ============================================================
// HOSPITAL BUILDER — Genera geometría procedural del hospital
// 🔧 Ajuste: fusión de geometrías por material (mergeGeometries)
// 🔧 Ajuste: elevador en vez de escaleras
// ============================================================

export class HospitalBuilder {
  constructor(scene, lighting, collisionSystem) {
    this.scene = scene;
    this.lighting = lighting;
    this.collision = collisionSystem;
    this.wallBuilder = new WallBuilder(scene, collisionSystem);

    // Geometrías acumuladas para merge (reducir draw calls)
    this._floorGeos = [];
    this._ceilingGeos = [];
    this._wallGeos = [];

    // Materiales compartidos
    this._matFloor = new THREE.MeshStandardMaterial({
      color: COLORS.FLOOR_HOSPITAL,
      roughness: 0.8,
      metalness: 0.0,
    });
    this._matCeiling = new THREE.MeshStandardMaterial({
      color: COLORS.CEILING,
      roughness: 0.95,
      metalness: 0.0,
    });
  }

  build() {
    this._buildFloors(FloorPlan.groundFloor, FLOOR_Y.GROUND);
    this._buildFloors(FloorPlan.upperFloor, FLOOR_Y.UPPER);
    this._buildCorridors();
    this._buildElevator();
    this._buildExteriorWalls();
    this._addLightsToAreas();
    this._commitMergedGeometry();
  }

  _buildFloors(rooms, baseY) {
    for (const room of rooms) {
      // Piso
      const floorGeo = new THREE.BoxGeometry(room.w, FLOOR_THICKNESS, room.d);
      const floorMesh = new THREE.Mesh(floorGeo, this._matFloor);
      floorMesh.position.set(room.x + room.w / 2, baseY - FLOOR_THICKNESS / 2, room.z + room.d / 2);
      floorMesh.receiveShadow = true;
      this.scene.add(floorMesh);

      // Techo de la habitación
      const ceilGeo = new THREE.BoxGeometry(room.w, FLOOR_THICKNESS, room.d);
      const ceilMesh = new THREE.Mesh(ceilGeo, this._matCeiling);
      ceilMesh.position.set(room.x + room.w / 2, baseY + ROOM_HEIGHT + FLOOR_THICKNESS / 2, room.z + room.d / 2);
      this.scene.add(ceilMesh);

      // Pared de acento (fondo de sala) con color del área
      const accentMat = new THREE.MeshStandardMaterial({
        color: room.color,
        roughness: 0.7,
        metalness: 0.05,
        opacity: 0.12,
        transparent: true,
      });
      const accentGeo = new THREE.BoxGeometry(room.w, ROOM_HEIGHT, WALL_THICKNESS);
      const accentMesh = new THREE.Mesh(accentGeo, accentMat);
      accentMesh.position.set(
        room.x + room.w / 2,
        baseY + ROOM_HEIGHT / 2,
        room.z  // pared trasera
      );
      this.scene.add(accentMesh);

      // Paredes laterales sólidas (simplificado — una por lado)
      const wh = ROOM_HEIGHT;

      // Pared Norte
      this.wallBuilder.createSolidWall(
        room.x, baseY, room.z,
        room.w, wh, WALL_THICKNESS
      );
      // Pared Sur
      this.wallBuilder.createSolidWall(
        room.x, baseY, room.z + room.d,
        room.w, wh, WALL_THICKNESS
      );
      // Pared Oeste
      this.wallBuilder.createSolidWall(
        room.x, baseY, room.z,
        WALL_THICKNESS, wh, room.d
      );
      // Pared Este (con ventana de vidrio hacia el pasillo)
      this.wallBuilder.createGlassWall(
        room.x + room.w, baseY, room.z + room.d / 2,
        room.d, wh, false
      );
    }
  }

  _buildCorridors() {
    for (const corr of FloorPlan.corridors) {
      const geo = new THREE.BoxGeometry(corr.w, FLOOR_THICKNESS, corr.d);
      const mesh = new THREE.Mesh(geo, this._matFloor);
      mesh.position.set(corr.x, corr.y - FLOOR_THICKNESS / 2, corr.z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Techo de corredor
      const ceilGeo = new THREE.BoxGeometry(corr.w, FLOOR_THICKNESS, corr.d);
      const ceilMesh = new THREE.Mesh(ceilGeo, this._matCeiling);
      ceilMesh.position.set(corr.x, corr.y + ROOM_HEIGHT + FLOOR_THICKNESS / 2, corr.z);
      this.scene.add(ceilMesh);
    }
  }

  // 🔧 Ajuste: Elevador — teletransporta entre plantas con fade
  _buildElevator() {
    const e = FloorPlan.elevator;

    // Cabina del elevador (estructura visual)
    const cabMat = new THREE.MeshStandardMaterial({
      color: COLORS.KEZEL_BLUE,
      roughness: 0.3,
      metalness: 0.7,
      transparent: true,
      opacity: 0.5,
    });

    // Paredes del elevador planta baja
    const shaft = new THREE.BoxGeometry(e.w, ROOM_HEIGHT * 2 + FLOOR_THICKNESS * 2, e.d);
    const shaftMesh = new THREE.Mesh(shaft, cabMat);
    shaftMesh.position.set(e.x, ROOM_HEIGHT + FLOOR_THICKNESS, e.z);
    shaftMesh.userData.isElevator = true;
    shaftMesh.userData.elevatorGroundY = e.groundY;
    shaftMesh.userData.elevatorUpperY = e.upperY;
    this.scene.add(shaftMesh);

    // Letrero
    const signGeo = new THREE.BoxGeometry(e.w - 0.2, 0.6, 0.05);
    const signMat = new THREE.MeshStandardMaterial({ color: COLORS.KEZEL_BLUE });
    const signGround = new THREE.Mesh(signGeo, signMat);
    signGround.position.set(e.x, e.groundY + 2.2, e.z - e.d / 2);
    signGround.userData.isElevatorSign = true;
    this.scene.add(signGround);

    const signUpper = signGround.clone();
    signUpper.position.set(e.x, e.upperY + 2.2, e.z - e.d / 2);
    this.scene.add(signUpper);

    // Agregar a colisión como zona interactiva (detección en AreaManager)
    shaftMesh.userData.isWall = false; // No bloquea
  }

  _buildExteriorWalls() {
    // Paredes exteriores del edificio completo (bounding box grande)
    const totalW = 45;
    const totalD = 35;
    const cx = 0;
    const cz = 5;
    const wh = ROOM_HEIGHT;

    const extMat = new THREE.MeshStandardMaterial({
      color: 0xe8edf2,
      roughness: 0.9,
    });

    const walls = [
      // Norte
      { x: cx, z: cz - totalD / 2, w: totalW, h: wh, d: WALL_THICKNESS },
      // Sur
      { x: cx, z: cz + totalD / 2, w: totalW, h: wh, d: WALL_THICKNESS },
      // Oeste
      { x: cx - totalW / 2, z: cz, w: WALL_THICKNESS, h: wh, d: totalD },
      // Este
      { x: cx + totalW / 2, z: cz, w: WALL_THICKNESS, h: wh, d: totalD },
    ];

    for (const w of walls) {
      const geo = new THREE.BoxGeometry(w.w, w.h, w.d);
      const mesh = new THREE.Mesh(geo, extMat);
      mesh.position.set(w.x, w.h / 2, w.z);
      mesh.userData.isWall = true;
      this.scene.add(mesh);
      this.collision.addWall(mesh);
    }

    // Suelo exterior (gran plano)
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xc8d5e0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _addLightsToAreas() {
    const [...allAreas] = [
      ...FloorPlan.groundFloor,
      ...FloorPlan.upperFloor,
    ];

    for (const room of allAreas) {
      const lightY = room.y + ROOM_HEIGHT - 0.3;
      const positions = [
        { x: room.x + room.w * 0.3, y: lightY, z: room.z + room.d * 0.3 },
        { x: room.x + room.w * 0.7, y: lightY, z: room.z + room.d * 0.7 },
      ];
      this.lighting.addAreaLight(room.id, positions);
    }
  }

  _commitMergedGeometry() {
    // En este MVP las geometrías ya están en la escena individualmente.
    // Una mejora futura usaría BufferGeometryUtils.mergeGeometries()
    // para batch rendering en una sola draw call.
  }
}
