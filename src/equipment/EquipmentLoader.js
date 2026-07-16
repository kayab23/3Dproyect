import { EQUIPMENT_BY_ID } from './equipmentData.js';

// ============================================================
// EQUIPMENT LOADER — Carga perezosa de modelos por área
// 🔧 Ajuste: lazy loading + DRACOLoader cuando hay GLBs reales
// ============================================================

export class EquipmentLoader {
  constructor() {
    this._loadedAreas = new Set();
    this._cache = new Map(); // equipmentId -> modelo cargado
    this._pendingLoads = new Map(); // areaId -> Promise
  }

  // Precargar los equipos de un área específica (cuando el jugador se acerca)
  async loadAreaEquipment(areaId) {
    if (this._loadedAreas.has(areaId)) return; // ya cargada

    const area = await import('../areas/areaDefinitions.js');
    const areaDef = area.AREAS_BY_ID[areaId];
    if (!areaDef) return;

    this._loadedAreas.add(areaId);
    const equipmentIds = areaDef.equipmentIds || [];

    for (const eqId of equipmentIds) {
      if (this._cache.has(eqId)) continue;
      const eqData = EQUIPMENT_BY_ID[eqId];
      if (!eqData || !eqData.model3d) continue;

      // Cuando haya modelos GLB reales, cargar aquí:
      // const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      // const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
      // const loader = new GLTFLoader();
      // const draco = new DRACOLoader();
      // draco.setDecoderPath('/draco/');
      // loader.setDRACOLoader(draco);
      // const gltf = await loader.loadAsync(eqData.model3d);
      // this._cache.set(eqId, gltf.scene);
    }
  }

  getModel(equipmentId) {
    return this._cache.get(equipmentId) || null;
  }

  isAreaLoaded(areaId) {
    return this._loadedAreas.has(areaId);
  }
}
