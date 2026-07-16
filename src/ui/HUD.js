import * as THREE from 'three';
import { EventBus } from '../utils/helpers.js';
import { AREA_DEFINITIONS, AREAS_BY_ID } from '../areas/areaDefinitions.js';
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
    this._initRoomLabels();
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
      
      <div class="hud-camera-toggle">
        <button class="hud-toggle-btn active" id="btn-mode-global">
          <span class="toggle-icon">🌐</span> Vista Global
        </button>
        <button class="hud-toggle-btn" id="btn-mode-fps">
          <span class="toggle-icon">🚶</span> Explorar a Pie
        </button>
      </div>

      <!-- Guía Interactiva de Misión -->
      <div class="hud-guide-card" id="hud-guide-card">
        <div class="guide-header">
          <span class="guide-badge">🎯 Misión de Exploración</span>
          <span class="guide-points" id="guide-points">0 / 8 salas</span>
        </div>
        <div class="guide-title" id="guide-target-name">Cargando misión...</div>
        <div class="guide-desc" id="guide-target-desc">Sigue el rayo de luz celeste en la sala recomendada.</div>
      </div>

      <div class="hud-controls" id="hud-fps-controls">
        <div class="hud-ctrl"><span class="ctrl-key">WASD</span> Mover</div>
        <div class="hud-ctrl"><span class="ctrl-key">E</span> Interactuar</div>
        <div class="hud-ctrl"><span class="ctrl-key">ESC</span> Salir</div>
        <div class="hud-ctrl"><span class="ctrl-key">Shift</span> Correr</div>
      </div>
      <div class="hud-controls hidden" id="hud-global-controls">
        <div class="hud-ctrl"><span class="ctrl-key">Arrastrar</span> Rotar Vista</div>
        <div class="hud-ctrl"><span class="ctrl-key">Scroll</span> Zoom</div>
        <div class="hud-ctrl"><span class="ctrl-key">Click</span> Seleccionar Sala</div>
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

    this._btnGlobal = document.getElementById('btn-mode-global');
    this._btnFPS = document.getElementById('btn-mode-fps');
    this._fpsControls = document.getElementById('hud-fps-controls');
    this._globalControls = document.getElementById('hud-global-controls');

    this._guideCard = document.getElementById('hud-guide-card');
    this._guideTargetName = document.getElementById('guide-target-name');
    this._guideTargetDesc = document.getElementById('guide-target-desc');
    this._guidePoints = document.getElementById('guide-points');
  }

  _bindEvents() {
    // Escuchar click en botón de Vista Global
    this._btnGlobal.addEventListener('click', () => {
      EventBus.emit('camera:mode:change', { mode: 'global' });
    });

    // Escuchar click en botón de Exploración a Pie
    this._btnFPS.addEventListener('click', () => {
      EventBus.emit('camera:mode:change', { mode: 'fps' });
    });

    // Escuchar cambios de estado externos
    EventBus.on('camera:mode:updated', ({ mode }) => {
      if (mode === 'global') {
        this._btnGlobal.classList.add('active');
        this._btnFPS.classList.remove('active');
        this._fpsControls.classList.add('hidden');
        this._globalControls.classList.remove('hidden');
        this._crosshair.classList.add('hidden');
      } else {
        this._btnGlobal.classList.remove('active');
        this._btnFPS.classList.add('active');
        this._fpsControls.classList.remove('hidden');
        this._globalControls.classList.add('hidden');
        this._crosshair.classList.remove('hidden');
      }
    });

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
    // Escuchar actualizaciones de la guía de misión
    EventBus.on('guide:update', ({ task, desc, progress }) => {
      if (this._guideTargetName) this._guideTargetName.textContent = task;
      if (this._guideTargetDesc) this._guideTargetDesc.textContent = desc;
      if (this._guidePoints) this._guidePoints.textContent = progress;
    });
  }

  _initRoomLabels() {
    this._labelsContainer = document.createElement('div');
    this._labelsContainer.id = 'room-labels-container';
    this._labelsContainer.className = 'room-labels-container hidden';
    document.body.appendChild(this._labelsContainer);

    this._labels = [];

    for (const area of AREA_DEFINITIONS) {
      if (area.id === 'lobby') continue; // Lobby no requiere label
      const el = document.createElement('div');
      el.className = 'room-label-bubble';
      el.dataset.areaId = area.id;
      el.innerHTML = `
        <span class="room-label-icon">${area.icon || '🏥'}</span>
        <span class="room-label-text">${area.name}</span>
      `;

      // Permitir teletransporte al hacer click en la etiqueta
      el.addEventListener('click', () => {
        EventBus.emit('minimap:teleport', { area });
      });

      this._labelsContainer.appendChild(el);
      this._labels.push({ el, area });
    }
  }

  // Actualiza la posición 2D de las etiquetas de sala proyectando sus coordenadas 3D
  updateRoomLabels(camera, mode) {
    if (mode === 'global') {
      this._labelsContainer.classList.remove('hidden');
      const tempV = new THREE.Vector3();

      for (const item of this._labels) {
        const { el, area } = item;

        // Proyectar el centro de la sala
        tempV.set(area.cx, area.y + 2.0, area.cz);
        tempV.project(camera);

        // Si la sala queda detrás de la cámara, ocultar
        if (tempV.z > 1) {
          el.style.display = 'none';
          continue;
        }

        // Convertir coordenadas normalizadas a píxeles
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;

        el.style.display = 'flex';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      }
    } else {
      this._labelsContainer.classList.add('hidden');
    }
  }

  show() {
    this._el.classList.add('visible');
    this._crosshair.classList.remove('hidden');
  }

  hide() {
    this._el.classList.remove('visible');
    this._crosshair.classList.add('hidden');
    this._labelsContainer.classList.add('hidden');
  }
}
