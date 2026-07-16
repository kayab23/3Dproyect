import { EQUIPMENT_BY_ID, EQUIPMENT_BY_AREA } from './equipmentData.js';
import { AREAS_BY_ID } from '../areas/areaDefinitions.js';

// ============================================================
// EQUIPMENT CATALOG — API de consulta del catálogo
// ============================================================

export class EquipmentCatalog {
  getEquipmentById(id) {
    return EQUIPMENT_BY_ID[id] || null;
  }

  getEquipmentByArea(areaId) {
    // Obtener IDs del área y mapear a datos completos
    const area = AREAS_BY_ID[areaId];
    if (!area) return [];
    return (area.equipmentIds || [])
      .map(id => EQUIPMENT_BY_ID[id])
      .filter(Boolean);
  }

  search(query) {
    const q = query.toLowerCase();
    return Object.values(EQUIPMENT_BY_ID).filter(eq =>
      eq.name.toLowerCase().includes(q) ||
      eq.description.toLowerCase().includes(q) ||
      eq.category.toLowerCase().includes(q)
    );
  }
}
