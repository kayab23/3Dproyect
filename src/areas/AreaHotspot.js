import * as THREE from 'three';
import { HOTSPOT_RADIUS, HOTSPOT_HOVER_SPEED, HOTSPOT_HOVER_AMP, COLORS } from '../utils/constants.js';
import { EventBus } from '../utils/helpers.js';

// ============================================================
// AREA HOTSPOT — Esferas brillantes pulsantes interactivas
// Equivalente a los iconos azules de target de la imagen
// ============================================================

export class AreaHotspot {
  constructor(scene, collisionSystem, equipmentId, areaId, position, parentGroup = scene) {
    this.scene = scene;
    this.parentGroup = parentGroup;
    this.equipmentId = equipmentId;
    this.areaId = areaId;
    this.position = position.clone();
    this._baseY = position.y;
    this._active = false;
    this._time = Math.random() * Math.PI * 2; // fase aleatoria para que no floaten en sincronía

    this._buildMesh();
    collisionSystem.addHotspot(this);
  }

  _buildMesh() {
    // Esfera interior brillante
    const innerGeo = new THREE.SphereGeometry(HOTSPOT_RADIUS * 0.55, 16, 16);
    const innerMat = new THREE.MeshStandardMaterial({
      color: COLORS.HOTSPOT,
      emissive: COLORS.HOTSPOT_GLOW,
      emissiveIntensity: 1.8,
      roughness: 0.1,
      metalness: 0.2,
    });
    this._inner = new THREE.Mesh(innerGeo, innerMat);

    // Esfera exterior semitransparente (glow)
    const outerGeo = new THREE.SphereGeometry(HOTSPOT_RADIUS, 16, 16);
    const outerMat = new THREE.MeshStandardMaterial({
      color: COLORS.HOTSPOT,
      transparent: true,
      opacity: 0.25,
      emissive: COLORS.HOTSPOT_GLOW,
      emissiveIntensity: 0.5,
      side: THREE.FrontSide,
    });
    this._outer = new THREE.Mesh(outerGeo, outerMat);

    // Anillo (como el target de la imagen)
    const ringGeo = new THREE.TorusGeometry(HOTSPOT_RADIUS * 1.2, 0.025, 8, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: COLORS.HOTSPOT,
      emissive: COLORS.HOTSPOT_GLOW,
      emissiveIntensity: 2.0,
    });
    this._ring = new THREE.Mesh(ringGeo, ringMat);
    this._ring.rotation.x = Math.PI / 2;

    // Grupo principal
    this.group = new THREE.Group();
    this.group.add(this._inner, this._outer, this._ring);
    this.group.position.copy(this.position);

    // userData para raycast
    this.group.userData.hotspot = this;
    this._inner.userData.hotspot = this;
    this._outer.userData.hotspot = this;

    this.parentGroup.add(this.group);
  }

  // Llamar desde el game loop
  update(dt, elapsed) {
    this._time += dt;

    // Flotación
    this.group.position.y = this._baseY + Math.sin(this._time * HOTSPOT_HOVER_SPEED) * HOTSPOT_HOVER_AMP;

    // Rotación del anillo
    this._ring.rotation.z += dt * 0.8;

    // Pulso de escala
    const pulse = 1.0 + Math.sin(this._time * 3) * 0.08;
    this._outer.scale.setScalar(pulse);

    // Intensidad emissive según si está activo (cerca del jugador)
    const targetIntensity = this._active ? 3.5 : 1.8;
    const curr = this._inner.material.emissiveIntensity;
    this._inner.material.emissiveIntensity += (targetIntensity - curr) * 0.1;
  }

  setActive(active) {
    this._active = active;
  }

  interact() {
    EventBus.emit('hotspot:interact', {
      equipmentId: this.equipmentId,
      areaId: this.areaId,
    });
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
