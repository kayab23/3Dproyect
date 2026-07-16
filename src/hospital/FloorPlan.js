import { AREA_DEFINITIONS, AREAS_BY_ID } from '../areas/areaDefinitions.js';
import { FLOOR_Y, ROOM_HEIGHT } from '../utils/constants.js';

// ============================================================
// FLOOR PLAN — Layout 2D del hospital
// Define habitaciones y pasillos para HospitalBuilder
// ============================================================

// Escala: 1 unit = 1 metro aprox en Three.js
// Las áreas ya tienen cx, cz, w, d definidos en areaDefinitions.js

// Genera la lista de "celdas" a construir
export const FloorPlan = {
  // Planta Baja
  groundFloor: AREA_DEFINITIONS
    .filter(a => a.floor === 'GROUND')
    .map(a => ({
      id: a.id,
      name: a.name,
      x: a.cx - a.w / 2,
      z: a.cz - a.d / 2,
      w: a.w,
      d: a.d,
      y: FLOOR_Y.GROUND,
      color: a.color,
    })),

  // Planta Alta
  upperFloor: AREA_DEFINITIONS
    .filter(a => a.floor === 'UPPER')
    .map(a => ({
      id: a.id,
      name: a.name,
      x: a.cx - a.w / 2,
      z: a.cz - a.d / 2,
      w: a.w,
      d: a.d,
      y: FLOOR_Y.UPPER,
      color: a.color,
    })),

  // Pasillos centrales (conectan las áreas)
  corridors: [
    // Pasillo central planta baja (eje Z)
    { x: -1.5, z: -6, w: 3, d: 20, y: FLOOR_Y.GROUND, id: 'corridor-pb-central' },
    // Pasillo horizontal planta baja
    { x: -20, z: -1, w: 40, d: 3, y: FLOOR_Y.GROUND, id: 'corridor-pb-h' },
    // Pasillo central planta alta
    { x: -1.5, z: -6, w: 3, d: 20, y: FLOOR_Y.UPPER, id: 'corridor-pa-central' },
    // Pasillo horizontal planta alta
    { x: -20, z: -1, w: 40, d: 3, y: FLOOR_Y.UPPER, id: 'corridor-pa-h' },
  ],

  // Posición del elevador (conexión entre plantas)
  elevator: {
    x: 0, z: -3,
    w: 2.5, d: 2.5,
    groundY: FLOOR_Y.GROUND,
    upperY: FLOOR_Y.UPPER,
    id: 'elevator',
  },
};

export function getRoomBounds(areaId) {
  const a = AREAS_BY_ID[areaId];
  if (!a) return null;
  return {
    minX: a.cx - a.w / 2,
    maxX: a.cx + a.w / 2,
    minZ: a.cz - a.d / 2,
    maxZ: a.cz + a.d / 2,
    y: a.y,
  };
}
