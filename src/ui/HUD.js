import { EventBus } from '../utils/helpers.js';
import { AREAS_BY_ID } from '../areas/areaDefinitions.js';
import { EquipmentCatalog } from '../equipment/EquipmentCatalog.js';

// ============================================================
// HUD — Heads-up Display
// ============================================================

export class HUD {
  constructor() {
    this._el = document.getElementById('hud');
    this._crosshair = document.getElementById('crosshair');
    this._interactHint = document.getElementById('interact-hint');
    this._catalog = new EquipmentCatalog();
    this._currentArea = null;
    this._render();
    this._bindEvents();
  }

  _render() {
    this._el.innerHTML = `
      <div class="hud-area" id="hud-area-info">
        <span class="hud-area-icon" id="hud-icon">🏥</span>
        <div>
          <div class="hud-area-name" id="hud-area-name">Lobby / Recepción</div>
          <div class="hud-area-floor" id="hud-area-floor">Planta Baja</div>
        </div>
      </div>
      <div class="hud-controls">
        <div class="hud-ctrl"><span class="ctrl-key">WASD</span> Mover</div>
        <div class="hud-ctrl"><span class="ctrl-key">E</span> Interactuar</div>
        <div class="hud-ctrl"><span class="ctrl-key">ESC</span> Pausar</div>
        <div class="hud-ctrl"><span class="ctrl-key">Shift</span> Correr</div>
      </div>
    `;
    // 🔧 Ajuste — al acercar la mira a un equipo: nombre + especificaciones
    // breves en pequeño, no solo el texto genérico "Ver equipo".
    this._interactHint.innerHTML = `
      <div class="interact-hint-row">
        <span class="key-badge">E</span>
        <span id="interact-hint-label">Ver equipo</span>
      </div>
      <div class="interact-hint-specs" id="interact-hint-specs"></div>
    `;
    this._interactLabel = document.getElementById('interact-hint-label');
    this._interactSpecs = document.getElementById('interact-hint-specs');
  }

  _bindEvents() {
    EventBus.on('area:change', ({ area }) => {
      if (!area) return;
      document.getElementById('hud-area-name').textContent = area.name;
      document.getElementById('hud-icon').textContent = area.icon || '🏥';
      document.getElementById('hud-area-floor').textContent =
        area.floor === 'GROUND' ? 'Planta Baja' : 'Planta Alta';
    });

    EventBus.on('hotspot:proximity', ({ active, hotspot }) => {
      if (active) {
        const eq = hotspot ? this._catalog.getEquipmentById(hotspot.equipmentId) : null;
        if (this._interactLabel) {
          this._interactLabel.textContent = eq ? eq.name : 'Ver equipo';
        }
        if (this._interactSpecs) {
          const specs = eq?.features?.slice(0, 2).join(' · ') || '';
          this._interactSpecs.textContent = specs;
          this._interactSpecs.style.display = specs ? 'block' : 'none';
        }
        this._interactHint.classList.add('visible');
        this._interactHint.classList.remove('hidden');
      } else {
        this._interactHint.classList.remove('visible');
      }
    });
  }

  show() {
    this._el.classList.add('visible');
    this._crosshair.classList.remove('hidden');
  }

  hide() {
    this._el.classList.remove('visible');
    this._crosshair.classList.add('hidden');
  }
}
