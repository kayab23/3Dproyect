import { EventBus } from '../utils/helpers.js';
import { AREAS_BY_ID } from '../areas/areaDefinitions.js';
import { EquipmentCatalog } from '../equipment/EquipmentCatalog.js';

// ============================================================
// AREA PANEL — Panel lateral deslizante con equipos del área
// ============================================================

const AREA_ICONS = {
  ambulancia: '🚑', urgencias: '🚨', quirofano: '🔬',
  transporte_interior: '🛏️', terapia_intermedia: '🫀', endoscopia: '🔭',
  suministro_gas: '⚗️', concepcion: '📐', toco_cirugia: '👶',
  ucin_utip: '🍼', telemedicina: '📡', hospitalizacion: '🛌',
  hemodialisis: '🩸', imagenologia: '🩻', uci: '💉', lobby: '🏥',
};

const CATEGORY_ICONS = {
  'Cardiología': '🫀', 'Monitoreo': '📊', 'Ventilación': '💨',
  'Mobiliario Clínico': '🛏️', 'Emergencias': '🚨', 'Vía Aérea': '😮‍💨',
  'Cirugía Mínimamente Invasiva': '🔬', 'Anestesiología': '💉',
  'Imagenología': '🩻', 'Neonatología': '🍼', 'Hemodiálisis': '🩸',
  'Endoscopia': '🔭', 'Telemedicina': '📡', 'Gases Médicos': '⚗️',
  'Infusión': '💧', 'Electrocirugia': '⚡', 'Obstetricia': '👶',
  'Diagnóstico por Imagen': '🩻', 'Transporte': '🚑',
  'Gestión Hospitalaria': '📐',
};

export class AreaPanel {
  constructor() {
    this._el = document.getElementById('area-panel');
    this._catalog = new EquipmentCatalog();
    this._currentArea = null;
    this._visible = false;

    EventBus.on('area:change', ({ areaId, area }) => {
      if (areaId !== this._currentArea) {
        this._currentArea = areaId;
        const equipment = this._catalog.getEquipmentByArea(areaId);
        if (equipment.length > 0) {
          this.show(area, equipment);
        } else {
          this.hide();
        }
      }
    });
  }

  show(area, equipment) {
    if (!area) return;
    const icon = AREA_ICONS[area.id] || '🏥';

    this._el.innerHTML = `
      <div class="panel-header">
        <span class="panel-icon">${icon}</span>
        <div>
          <div class="panel-title">${area.name}</div>
          <div class="panel-subtitle">${equipment.length} equipo${equipment.length !== 1 ? 's' : ''} disponible${equipment.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div class="panel-hint">Apunta con la mira a un equipo y presiona <span class="ctrl-key">E</span> para ver detalles</div>
      <div class="panel-grid" id="panel-grid">
        ${equipment.map(eq => this._cardHTML(eq)).join('')}
      </div>
    `;

    // 🔧 Ajuste — las tarjetas son solo referencia visual, no reciben clic:
    // con PointerLockControls activo, los clics reales del navegador quedan
    // fijos en el punto donde se activó el bloqueo del mouse y nunca llegan
    // a este panel lateral (eso causaba que "se trabaran" al hacer clic).
    // La interacción real ocurre vía raycast desde la mira (crosshair) + E,
    // igual que con los hotspots 3D, que sí funciona bajo pointer lock.

    this._el.classList.add('visible');
    this._visible = true;
  }

  _cardHTML(eq) {
    const catIcon = CATEGORY_ICONS[eq.category] || '🔧';
    return `
      <div class="equip-card" data-equip-id="${eq.id}">
        <div class="equip-card-img">
          ${eq.image ? `<img src="${eq.image}" alt="${eq.name}" />` : catIcon}
        </div>
        <div class="equip-card-name">${eq.name}</div>
        <div class="equip-card-cat">${eq.category}</div>
      </div>
    `;
  }

  hide() {
    this._el.classList.remove('visible');
    this._visible = false;
  }
}
