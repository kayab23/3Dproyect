import { AREA_DEFINITIONS } from '../areas/areaDefinitions.js';
import { EventBus } from '../utils/helpers.js';

// ============================================================
// MINIMAP — Canvas 2D del hospital con posición del jugador
// Click en área = teletransporte (emite evento)
// ============================================================

const MAP_W = 200;
const MAP_H = 160;
const PAD = 10;

// Bounding box de todo el hospital para normalización
const ALL_AREAS = AREA_DEFINITIONS;
const minX = Math.min(...ALL_AREAS.map(a => a.cx - a.w / 2)) - 2;
const maxX = Math.max(...ALL_AREAS.map(a => a.cx + a.w / 2)) + 2;
const minZ = Math.min(...ALL_AREAS.map(a => a.cz - a.d / 2)) - 2;
const maxZ = Math.max(...ALL_AREAS.map(a => a.cz + a.d / 2)) + 2;

function worldToMap(wx, wz) {
  const nx = (wx - minX) / (maxX - minX);
  const nz = (wz - minZ) / (maxZ - minZ);
  return {
    x: PAD + nx * (MAP_W - PAD * 2),
    y: PAD + nz * (MAP_H - PAD * 2),
  };
}

export class Minimap {
  constructor() {
    this._container = document.getElementById('minimap-container');
    this._canvas = document.createElement('canvas');
    this._canvas.id = 'minimap-canvas';
    this._canvas.width = MAP_W;
    this._canvas.height = MAP_H;
    this._container.innerHTML = '<div class="minimap-label">MAPA</div>';
    this._container.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');
    this._playerX = 0;
    this._playerZ = 0;
    this._currentArea = null;

    this._drawBase();
    this._bindClick();

    EventBus.on('area:change', ({ areaId }) => {
      this._currentArea = areaId;
    });
  }

  _drawBase() {
    const ctx = this._ctx;
    ctx.fillStyle = 'rgba(2, 9, 26, 0.95)';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    for (const area of ALL_AREAS) {
      const { x: ax, y: ay } = worldToMap(area.cx - area.w / 2, area.cz - area.d / 2);
      const { x: bx, y: by } = worldToMap(area.cx + area.w / 2, area.cz + area.d / 2);
      const w = bx - ax;
      const h = by - ay;

      // Fill con color de área
      ctx.fillStyle = `${this._hexToRgba(area.color, 0.25)}`;
      ctx.fillRect(ax, ay, w, h);

      // Border
      ctx.strokeStyle = `${this._hexToRgba(area.color, 0.7)}`;
      ctx.lineWidth = 1;
      ctx.strokeRect(ax, ay, w, h);
    }
  }

  _hexToRgba(hex, alpha) {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  update(playerX, playerZ) {
    this._playerX = playerX;
    this._playerZ = playerZ;
    this._draw();
  }

  _draw() {
    const ctx = this._ctx;
    ctx.clearRect(0, 0, MAP_W, MAP_H);
    this._drawBase();

    // Resaltar área actual
    if (this._currentArea) {
      const area = ALL_AREAS.find(a => a.id === this._currentArea);
      if (area) {
        const { x: ax, y: ay } = worldToMap(area.cx - area.w / 2, area.cz - area.d / 2);
        const { x: bx, y: by } = worldToMap(area.cx + area.w / 2, area.cz + area.d / 2);
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ax, ay, bx - ax, by - ay);
      }
    }

    // Jugador
    const { x: px, y: py } = worldToMap(this._playerX, this._playerZ);
    // Pulso
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 212, 255, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#00D4FF';
    ctx.fill();
  }

  _bindClick() {
    this._canvas.addEventListener('click', (e) => {
      const rect = this._canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (MAP_W / rect.width);
      const my = (e.clientY - rect.top) * (MAP_H / rect.height);

      // Convertir a coordenadas mundo
      const nx = (mx - PAD) / (MAP_W - PAD * 2);
      const nz = (my - PAD) / (MAP_H - PAD * 2);
      const wx = nx * (maxX - minX) + minX;
      const wz = nz * (maxZ - minZ) + minZ;

      // Buscar área clicada
      for (const area of ALL_AREAS) {
        if (
          wx >= area.cx - area.w / 2 && wx <= area.cx + area.w / 2 &&
          wz >= area.cz - area.d / 2 && wz <= area.cz + area.d / 2
        ) {
          EventBus.emit('minimap:teleport', { area });
          break;
        }
      }
    });
  }

  show() { this._container.classList.add('visible'); }
  hide() { this._container.classList.remove('visible'); }
}
