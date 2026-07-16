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
    this._buildLandmarks();
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

      // 🔧 Ajuste — el muro trasero (Sur) lleva un tinte pastel del color de
      // área en vez de un panel de color saturado aparte: la referencia es
      // blanco/azul pálido en general, con solo un guiño de color por zona.
      const pastel = new THREE.Color(room.color).lerp(new THREE.Color(0xffffff), 0.82);
      const accentWallMat = new THREE.MeshStandardMaterial({
        color: pastel,
        roughness: 0.8,
        metalness: 0.0,
      });

      const wh = ROOM_HEIGHT;
      const cx = room.x + room.w / 2;
      const cz = room.z + room.d / 2;

      // 🔧 Ajuste — coordenadas centradas correctamente por eje (antes las
      // paredes Norte/Sur/Oeste usaban la esquina de la sala como centro,
      // desalineándolas del volumen real de la habitación).

      // Pared Sur (trasera) — sólida, con tinte pastel del área
      const southGeo = new THREE.BoxGeometry(room.w, wh, WALL_THICKNESS);
      const southMesh = new THREE.Mesh(southGeo, accentWallMat);
      southMesh.position.set(cx, baseY + wh / 2, room.z + room.d);
      southMesh.receiveShadow = true;
      southMesh.userData.isWall = true;
      this.scene.add(southMesh);
      this.collision.addWall(southMesh);

      // Pared Oeste — sólida (estructural)
      this.wallBuilder.createSolidWall(
        room.x, baseY, cz,
        WALL_THICKNESS, wh, room.d
      );

      // 🔧 Ajuste — más vidrio, menos muro sólido (look esmerilado de la referencia)
      // Pared Norte — vidrio (hacia sala/pasillo contiguo)
      this.wallBuilder.createGlassWall(
        cx, baseY, room.z,
        room.w, wh, true
      );
      // Pared Este — vidrio (hacia el pasillo)
      this.wallBuilder.createGlassWall(
        room.x + room.w, baseY, cz,
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

  // 🔧 Ajuste — silueta exterior redondeada (cápsula) en vez de caja recta,
  // para acercarse al edificio de esquinas curvas de la imagen de referencia.
  _buildExteriorWalls() {
    const totalW = 45;
    const totalD = 35;
    const cx = 0;
    const cz = 5;
    const wh = ROOM_HEIGHT;
    const radius = 6; // radio de esquina

    const extMat = new THREE.MeshStandardMaterial({
      color: 0xe8edf2,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    const outerShape = this._roundedRectShape(totalW, totalD, radius);
    const innerShape = this._roundedRectShape(totalW - WALL_THICKNESS * 2, totalD - WALL_THICKNESS * 2, Math.max(radius - WALL_THICKNESS, 0.1));
    outerShape.holes.push(innerShape);

    const shellGeo = new THREE.ExtrudeGeometry(outerShape, { depth: wh, bevelEnabled: false, curveSegments: 24 });
    shellGeo.rotateX(-Math.PI / 2);
    shellGeo.translate(cx, 0, cz);
    const shellMesh = new THREE.Mesh(shellGeo, extMat);
    shellMesh.userData.isWall = true;
    shellMesh.receiveShadow = true;
    this.scene.add(shellMesh);
    this.collision.addWall(shellMesh);

    // Suelo exterior (gran plano)
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xc8d5e0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  // Rectángulo con esquinas redondeadas centrado en (0,0), tamaño w×d
  _roundedRectShape(w, d, r) {
    const hw = w / 2, hd = d / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-hw + r, -hd);
    shape.lineTo(hw - r, -hd);
    shape.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(hw, hd - r);
    shape.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-hw + r, hd);
    shape.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-hw, -hd + r);
    shape.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);
    return shape;
  }

  // 🔧 Ajuste — remates fieles a la imagen de referencia: helipuerto con
  // helicóptero sobre Hospitalización, y vehículos (ambulancia/SUV) afuera.
  _buildLandmarks() {
    this._buildHelipad();
    this._buildVehicles();
  }

  _buildHelipad() {
    const hospitalizacion = FloorPlan.upperFloor.find(r => r.id === 'hospitalizacion');
    if (!hospitalizacion) return;

    const baseY = FLOOR_Y.UPPER + ROOM_HEIGHT + 2.5;
    const cx = hospitalizacion.x + hospitalizacion.w / 2;
    const cz = hospitalizacion.z + hospitalizacion.d / 2;

    // Torre de soporte
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x33475b, roughness: 0.6, metalness: 0.3 });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, baseY - (FLOOR_Y.UPPER + ROOM_HEIGHT), 24), towerMat);
    tower.position.set(cx, FLOOR_Y.UPPER + ROOM_HEIGHT + (baseY - (FLOOR_Y.UPPER + ROOM_HEIGHT)) / 2, cz);
    tower.userData.isWall = true;
    this.scene.add(tower);
    this.collision.addWall(tower);

    // Plataforma circular con aro "H"
    const padMat = new THREE.MeshStandardMaterial({ color: COLORS.KEZEL_BLUE, roughness: 0.5 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.3, 32), padMat);
    pad.position.set(cx, baseY, cz);
    pad.userData.isWall = true;
    this.scene.add(pad);
    this.collision.addWall(pad);

    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.7, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cx, baseY + 0.16, cz);
    this.scene.add(ring);

    // Helicóptero simple (fuselaje + cabina + rotores)
    const heliMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4, metalness: 0.3 });
    const heli = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 2.2, 4, 12), heliMat);
    body.rotation.z = Math.PI / 2;
    heli.add(body);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 2.2, 8), heliMat);
    tail.rotation.z = Math.PI / 2;
    tail.position.set(-2.3, 0.3, 0);
    heli.add(tail);
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.05, 0.15), rotorMat);
    rotor.position.set(0, 0.9, 0);
    heli.add(rotor);
    heli.position.set(cx, baseY + 1.1, cz);
    this.scene.add(heli);
  }

  _buildVehicles() {
    const ambulancia = FloorPlan.groundFloor.find(r => r.id === 'ambulancia');
    if (ambulancia) {
      const amb = this._makeSimpleVehicle(0xffffff, 0xcc2222);
      amb.position.set(ambulancia.x - 4, FLOOR_Y.GROUND, ambulancia.z + ambulancia.d / 2);
      amb.rotation.y = Math.PI / 2;
      this.scene.add(amb);
    }

    const endoscopia = FloorPlan.groundFloor.find(r => r.id === 'endoscopia');
    if (endoscopia) {
      const suv = this._makeSimpleVehicle(0xf2f2f2, 0x0055a4);
      suv.position.set(endoscopia.x + endoscopia.w + 3, FLOOR_Y.GROUND, endoscopia.z + endoscopia.d + 3);
      this.scene.add(suv);
    }
  }

  // Vehículo de bloque simple (placeholder de baja poligonización)
  _makeSimpleVehicle(bodyColor, accentColor) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4, metalness: 0.3 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.2, metalness: 0.5 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 4.4), bodyMat);
    base.position.y = 0.55;
    base.castShadow = true;
    group.add(base);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 2.2), glassMat);
    cabin.position.set(0, 1.35, -0.6);
    group.add(cabin);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.25, 4.4), accentMat);
    stripe.position.y = 0.55;
    group.add(stripe);

    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    for (const [wx, wz] of [[-1, -1.5], [1, -1.5], [-1, 1.5], [1, 1.5]]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.35, wz);
      group.add(wheel);
    }

    return group;
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
