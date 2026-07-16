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
    this._buildFloorSlabs();
    this._buildLandmarks();
    this._addLightsToAreas();
    this._commitMergedGeometry();
  }

  _buildFloors(rooms, baseY) {
    for (const room of rooms) {
      // Los pisos y techos individuales se eliminan para evitar traslape
      // de cajas y usar en su lugar las placas biseladas unificadas (_buildFloorSlabs).

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

      // 🔧 Ajuste — Esquinas redondeadas de vidrio translúcido para imitar el look de cápsula
      const isCornerRoom = ['quirofano', 'toco_cirugia', 'hospitalizacion', 'urgencias', 'ucin_utip'].includes(room.id);

      if (isCornerRoom) {
        const radius = 1.8; // radio de curvatura
        
        // Esquina curva de vidrio en el extremo Noreste (room.x + room.w, room.z)
        this.wallBuilder.createCurvedGlassWall(
          room.x + room.w - radius, baseY, room.z + radius,
          radius, 0, Math.PI / 2, wh
        );

        // Pared Norte (recortada para dar espacio al arco curvo)
        this.wallBuilder.createGlassWall(
          cx - radius / 2, baseY, room.z,
          room.w - radius, wh, true
        );

        // Pared Este (recortada para dar espacio al arco curvo)
        this.wallBuilder.createGlassWall(
          room.x + room.w, baseY, cz + radius / 2,
          room.d - radius, wh, false
        );
      } else {
        // Paredes de vidrio planas tradicionales para el resto
        this.wallBuilder.createGlassWall(cx, baseY, room.z, room.w, wh, true);
        this.wallBuilder.createGlassWall(room.x + room.w, baseY, cz, room.d, wh, false);
      }
    }
  }

  _buildCorridors() {
    // Los pasillos están integrados en las placas de piso unificadas
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

  // 🔧 Ajuste — Silueta exterior abierta con placas de piso/techo redondeadas de gran espesor
  // tal y como se ve en la maqueta de la imagen de referencia.
  _buildFloorSlabs() {
    const totalW = 54;
    const totalD = 40;
    const cx = 0;
    const cz = 3;
    const radius = 8; // radio de esquina amplio
    const slabThickness = 0.35;

    // Material blanco semibrillante premium para las placas estructurales
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.15,
    });

    // 1. Placa de piso Planta Baja
    const shapeGB = this._roundedRectShape(totalW, totalD, radius);
    const geoGB = new THREE.ExtrudeGeometry(shapeGB, {
      depth: slabThickness,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      curveSegments: 32
    });
    geoGB.rotateX(-Math.PI / 2);
    geoGB.translate(cx, -slabThickness, cz);
    const slabGB = new THREE.Mesh(geoGB, slabMat);
    slabGB.receiveShadow = true;
    this.scene.add(slabGB);

    // 2. Placa de piso Planta Alta (techo Planta Baja)
    // Para lograr el estilo "maqueta cutaway", esta placa tiene bordes biselados hermosos
    const shapePA = this._roundedRectShape(totalW * 0.94, totalD * 0.94, radius);
    const geoPA = new THREE.ExtrudeGeometry(shapePA, {
      depth: slabThickness,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      curveSegments: 32
    });
    geoPA.rotateX(-Math.PI / 2);
    geoPA.translate(cx, FLOOR_Y.UPPER - slabThickness, cz);
    const slabPA = new THREE.Mesh(geoPA, slabMat);
    slabPA.receiveShadow = true;
    slabPA.castShadow = true;
    this.scene.add(slabPA);

    // 3. Placa de techo Planta Alta
    const geoTecho = new THREE.ExtrudeGeometry(shapePA, {
      depth: slabThickness,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      curveSegments: 32
    });
    geoTecho.rotateX(-Math.PI / 2);
    geoTecho.translate(cx, FLOOR_Y.UPPER + ROOM_HEIGHT, cz);
    const slabTecho = new THREE.Mesh(geoTecho, slabMat);
    slabTecho.castShadow = true;
    this.scene.add(slabTecho);

    // Suelo exterior (gran plano)
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xd8e4f0, // combina con la niebla para horizonte infinito
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -slabThickness - 0.02;
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
