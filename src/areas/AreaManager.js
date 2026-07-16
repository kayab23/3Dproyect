import { AREA_DEFINITIONS, AREAS_BY_ID } from './areaDefinitions.js';
import { AreaHotspot } from './AreaHotspot.js';
import { EQUIPMENT_BY_AREA } from '../equipment/equipmentData.js';
import { FLOOR_Y, PLAYER_HEIGHT } from '../utils/constants.js';
import { EventBus } from '../utils/helpers.js';

// ============================================================
// AREA MANAGER — Detecta en qué área está el jugador
// Gestiona hotspots y llama al lighting.setActiveArea()
// ============================================================

export class AreaManager {
  constructor(scene, lighting, collisionSystem) {
    this.scene = scene;
    this.lighting = lighting;
    this.collision = collisionSystem;
    this._currentAreaId = null;
    this._hotspots = [];
    this._areas = AREA_DEFINITIONS;
  }

  // Crear hotspots de todas las áreas (llamar con THREE ya importado)
  buildHotspotsSync(THREE, groundGroup, upperGroup) {
    for (const area of this._areas) {
      if (!area.equipmentIds || area.equipmentIds.length === 0) continue;

      const parentGroup = area.y > 0 ? upperGroup : groundGroup;

      for (let i = 0; i < area.equipmentIds.length; i++) {
        const eqId = area.equipmentIds[i];
        const angle = (i / area.equipmentIds.length) * Math.PI * 2;
        const r = Math.min(area.w, area.d) * 0.28;

        const hx = area.cx + Math.cos(angle) * r;
        const hz = area.cz + Math.sin(angle) * r;
        const hy = area.y + 1.4;

        const hotspot = new AreaHotspot(
          this.scene,
          this.collision,
          eqId,
          area.id,
          new THREE.Vector3(hx, hy, hz),
          parentGroup
        );
        this._hotspots.push(hotspot);
      }
    }
  }

  // Detectar área actual según posición XZ del jugador
  detectArea(playerPos) {
    for (const area of this._areas) {
      const inX = playerPos.x >= area.cx - area.w / 2 && playerPos.x <= area.cx + area.w / 2;
      const inZ = playerPos.z >= area.cz - area.d / 2 && playerPos.z <= area.cz + area.d / 2;

      // Detectar planta por Y
      const onGround = Math.abs(playerPos.y - FLOOR_Y.GROUND - PLAYER_HEIGHT) < 1.5;
      const onUpper = Math.abs(playerPos.y - FLOOR_Y.UPPER - PLAYER_HEIGHT) < 1.5;
      const correctFloor = (area.floor === 'GROUND' && onGround) || (area.floor === 'UPPER' && onUpper);

      if (inX && inZ && correctFloor) {
        return area.id;
      }
    }
    return 'lobby';
  }

  // Llamar en el game loop
  update(dt, elapsed, playerPos) {
    const areaId = this.detectArea(playerPos);

    if (areaId !== this._currentAreaId) {
      this._currentAreaId = areaId;
      this.lighting.setActiveArea(areaId);
      EventBus.emit('area:change', { areaId, area: AREAS_BY_ID[areaId] });
    }

    // Actualizar hotspots
    const nearestHotspot = this.collision.getNearestInteractable(playerPos);
    for (const h of this._hotspots) {
      h.setActive(h === nearestHotspot);
      h.update(dt, elapsed);
    }

    // Mostrar/ocultar hint de interacción
    EventBus.emit('hotspot:proximity', { active: nearestHotspot !== null, hotspot: nearestHotspot });
  }

  get currentAreaId() { return this._currentAreaId; }
  get hotspots() { return this._hotspots; }
}
