import { EventBus } from '../utils/helpers.js';
import { AREAS_BY_ID } from '../areas/areaDefinitions.js';

// ============================================================
// HUD — Heads-up Display
// ============================================================

export class HUD {
  constructor() {
    this._el = document.getElementById('hud');
    this._crosshair = document.getElementById('crosshair');
    this._interactHint = document.getElementById('interact-hint');
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
  }

  _bindEvents() {
    EventBus.on('area:change', ({ area }) => {
      if (!area) return;
      document.getElementById('hud-area-name').textContent = area.name;
      document.getElementById('hud-icon').textContent = area.icon || '🏥';
      document.getElementById('hud-area-floor').textContent =
        area.floor === 'GROUND' ? 'Planta Baja' : 'Planta Alta';
    });

    EventBus.on('hotspot:proximity', ({ active }) => {
      if (active) {
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
