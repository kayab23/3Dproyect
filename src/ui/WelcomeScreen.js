import { EventBus } from '../utils/helpers.js';

// ============================================================
// WELCOME SCREEN
// 🔧 Ajuste: imagen WebP comprimida como fondo
// ============================================================

export class WelcomeScreen {
  constructor() {
    this._el = document.getElementById('welcome-screen');
    this._render();
  }

  _render() {
    // 🔧 Usar imagen como variable CSS para el background (se convierte a WebP en build)
    this._el.style.setProperty('--hospital-bg', 'none');

    this._el.innerHTML = `
      <div class="welcome-bg" id="welcome-bg-img"></div>
      <div class="welcome-card">
        <div class="welcome-logo">Kezelmedica</div>
        <h1 class="welcome-title">
          Recorre nuestro<br/>
          <em>Hospital Virtual</em>
        </h1>
        <p class="welcome-subtitle">
          Explora las 15 áreas del hospital en primera persona y descubre
          los equipos médicos de alta tecnología que Kezelmedica ofrece para
          cada especialidad.
        </p>
        <button class="btn-start" id="btn-start-tour">
          <span>Iniciar Recorrido</span>
          <span class="btn-arrow">→</span>
        </button>
        <div class="welcome-controls">
          <div class="ctrl-item">
            <span class="ctrl-key">WASD</span>
            <span>Moverse</span>
          </div>
          <div class="ctrl-item">
            <span class="ctrl-key">Mouse</span>
            <span>Mirar</span>
          </div>
          <div class="ctrl-item">
            <span class="ctrl-key">E</span>
            <span>Interactuar</span>
          </div>
          <div class="ctrl-item">
            <span class="ctrl-key">Shift</span>
            <span>Correr</span>
          </div>
          <div class="ctrl-item">
            <span class="ctrl-key">ESC</span>
            <span>Pausar</span>
          </div>
        </div>
      </div>
    `;

    // Cargar imagen de referencia como fondo (se optimiza con WebP)
    this._loadBackground();

    document.getElementById('btn-start-tour').addEventListener('click', () => {
      EventBus.emit('welcome:start');
    });
  }

  _loadBackground() {
    const img = new Image();
    // 🔧 Usar la imagen existente (en producción reemplazar por .webp comprimido)
    img.src = '/imagen (14).png';
    img.onload = () => {
      const bgEl = document.getElementById('welcome-bg-img');
      if (bgEl) {
        bgEl.style.backgroundImage = `url('${img.src}')`;
        bgEl.style.backgroundSize = 'cover';
        bgEl.style.backgroundPosition = 'center';
        bgEl.style.filter = 'brightness(0.22) saturate(0.5)';
      }
    };
  }

  show() { this._el.classList.remove('hidden'); }

  hide() {
    this._el.classList.add('hidden');
  }
}
