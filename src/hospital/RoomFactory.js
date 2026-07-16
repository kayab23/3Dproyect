import * as THREE from 'three';
import { ROOM_HEIGHT, COLORS, WALL_THICKNESS } from '../utils/constants.js';

// ============================================================
// ROOM FACTORY — Decora cada área según su tipo
// Añade mobiliario genérico y señalización
// ============================================================

// Materiales base compartidos
const MAT_BED = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
const MAT_METAL = new THREE.MeshStandardMaterial({ color: 0xaabbcc, roughness: 0.3, metalness: 0.8 });
const MAT_SCREEN = new THREE.MeshStandardMaterial({ color: 0x001122, roughness: 0.1, emissive: 0x003366, emissiveIntensity: 0.5 });
const MAT_RED = new THREE.MeshStandardMaterial({ color: 0xdd2222, roughness: 0.5 });
const MAT_GREEN = new THREE.MeshStandardMaterial({ color: 0x22aa44, roughness: 0.5 });

export class RoomFactory {
  constructor(scene) {
    this.scene = scene;
  }

  // Decorar un área según su ID
  decorateRoom(areaDef) {
    const { id, cx, cz, w, d, y } = areaDef;

    // Señal de área en la pared
    this._addAreaSign(areaDef);

    // Mobiliario genérico por tipo
    switch (id) {
      case 'urgencias':        this._makeUrgencias(cx, y, cz, w, d); break;
      case 'quirofano':        this._makeQuirofano(cx, y, cz, w, d); break;
      case 'uci':              this._makeUCI(cx, y, cz, w, d); break;
      case 'hospitalizacion':  this._makeHospitalizacion(cx, y, cz, w, d); break;
      case 'toco_cirugia':     this._makeToco(cx, y, cz, w, d); break;
      case 'ucin_utip':        this._makeUCIN(cx, y, cz, w, d); break;
      case 'imagenologia':     this._makeImagenologia(cx, y, cz, w, d); break;
      case 'hemodialisis':     this._makeHemodialisis(cx, y, cz, w, d); break;
      case 'endoscopia':       this._makeEndoscopia(cx, y, cz, w, d); break;
      case 'suministro_gas':   this._makeGas(cx, y, cz, w, d); break;
      default:                 this._makeGeneric(cx, y, cz, w, d); break;
    }
  }

  _addAreaSign(area) {
    // Placa de color en la pared con el nombre del área
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.5, 0.05),
      new THREE.MeshStandardMaterial({
        color: area.color || COLORS.KEZEL_BLUE,
        emissive: area.color || COLORS.KEZEL_BLUE,
        emissiveIntensity: 0.3,
        roughness: 0.3,
        metalness: 0.5,
      })
    );
    plaque.position.set(area.cx, area.y + 2.6, area.cz - area.d / 2 + 0.08);
    this.scene.add(plaque);
  }

  _addBed(x, y, z, color = MAT_BED) {
    // Cama genérica (box + almohada)
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 2.0), color);
    base.position.set(x, y + 0.3, z);
    base.castShadow = true;
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.5), MAT_BED);
    pillow.position.set(x, y + 0.65, z - 0.65);
    this.scene.add(base, pillow);
  }

  _addMonitor(x, y, z) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), MAT_METAL);
    stand.position.set(x, y + 0.4, z);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.05), MAT_SCREEN);
    screen.position.set(x, y + 1.1, z);
    stand.castShadow = true;
    screen.castShadow = true;
    this.scene.add(stand, screen);
  }

  _addGasCylinder(x, y, z) {
    const geo = new THREE.CylinderGeometry(0.18, 0.18, 1.4, 12);
    const mesh = new THREE.Mesh(geo, MAT_METAL);
    mesh.position.set(x, y + 0.7, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
  }

  _makeUrgencias(cx, y, cz, w, d) {
    this._addBed(cx - 1.5, y, cz, MAT_BED);
    this._addBed(cx + 1.5, y, cz, MAT_BED);
    this._addMonitor(cx - 2.2, y, cz - 0.5);
    // Carro rojo
    const carro = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.8), MAT_RED);
    carro.position.set(cx + 2.5, y + 0.5, cz + 1);
    carro.castShadow = true;
    this.scene.add(carro);
  }

  _makeQuirofano(cx, y, cz, w, d) {
    // Mesa quirúrgica
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 1.9), MAT_METAL);
    table.position.set(cx, y + 1.0, cz);
    table.castShadow = true;
    this.scene.add(table);
    // Lámpara cielítica
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffee, emissiveIntensity: 1.5 }));
    lamp.position.set(cx, y + ROOM_HEIGHT - 0.1, cz);
    this.scene.add(lamp);
    // Monitores
    this._addMonitor(cx - 2, y, cz - 0.5);
    this._addMonitor(cx + 2, y, cz + 0.5);
  }

  _makeUCI(cx, y, cz, w, d) {
    const spacing = 2.5;
    for (let i = -1; i <= 1; i++) {
      this._addBed(cx + i * spacing, y, cz, MAT_BED);
      this._addMonitor(cx + i * spacing + 0.8, y, cz - 0.8);
    }
  }

  _makeHospitalizacion(cx, y, cz, w, d) {
    for (let i = 0; i < 3; i++) {
      this._addBed(cx - 1.5 + i * 1.5, y, cz, MAT_BED);
    }
    this._addMonitor(cx, y, cz - 1.5);
  }

  _makeToco(cx, y, cz, w, d) {
    // Mesa de parto
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 2.0), MAT_METAL);
    table.position.set(cx, y + 0.9, cz);
    this.scene.add(table);
    // Incubadora
    const incub = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0xddeeff, transparent: true, opacity: 0.7 }));
    incub.position.set(cx + 2, y + 0.45, cz);
    this.scene.add(incub);
    this._addMonitor(cx - 1.5, y, cz);
  }

  _makeUCIN(cx, y, cz, w, d) {
    // Incubadoras en fila
    for (let i = 0; i < 3; i++) {
      const incub = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0xddeeff, transparent: true, opacity: 0.7 }));
      incub.position.set(cx - 1.5 + i * 1.5, y + 0.45, cz);
      this.scene.add(incub);
    }
  }

  _makeImagenologia(cx, y, cz, w, d) {
    // Tomógrafo (cilindro grande)
    const tomo = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.35, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4, metalness: 0.3 })
    );
    tomo.rotation.y = Math.PI / 2;
    tomo.position.set(cx, y + 1.0, cz);
    this.scene.add(tomo);
    // Mesa de paciente
    const mesa = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 2.5), MAT_METAL);
    mesa.position.set(cx, y + 0.8, cz);
    this.scene.add(mesa);
    this._addMonitor(cx + 2, y, cz);
  }

  _makeHemodialisis(cx, y, cz, w, d) {
    for (let i = -1; i <= 1; i++) {
      // Sillón
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 1.2), new THREE.MeshStandardMaterial({ color: 0x5588aa }));
      chair.position.set(cx + i * 2, y + 0.5, cz);
      // Máquina de diálisis
      const machine = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 0.55), MAT_METAL);
      machine.position.set(cx + i * 2 + 0.8, y + 0.7, cz);
      this.scene.add(chair, machine);
    }
  }

  _makeEndoscopia(cx, y, cz, w, d) {
    this._addMonitor(cx, y, cz);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.4), MAT_METAL);
    tower.position.set(cx + 1, y + 0.75, cz);
    this.scene.add(tower);
  }

  _makeGas(cx, y, cz, w, d) {
    for (let i = 0; i < 5; i++) {
      this._addGasCylinder(cx - 2 + i * 1.0, y, cz);
    }
  }

  _makeGeneric(cx, y, cz, w, d) {
    this._addMonitor(cx, y, cz);
  }
}
