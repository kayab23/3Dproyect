// ============================================================
// LOADING SCREEN
// ============================================================
const TIPS = [
  'Explorando las 15 áreas del hospital...',
  'Cargando equipos de UCI y Quirófano...',
  'Preparando el recorrido virtual...',
  'Kezelmedica — Tecnología médica de primer nivel.',
  'Navegarás con WASD + mouse. ¡Bienvenido!',
];

export class LoadingScreen {
  constructor() {
    this._el = document.getElementById('loading-screen');
    this._bar = null;
    this._tipEl = null;
    this._pctEl = null;
    this._tipIdx = 0;
    this._render();
  }

  _render() {
    this._el.innerHTML = `
      <div class="loading-logo">KEZEL<span>MEDICA</span></div>
      <div style="font-size:13px;color:rgba(200,220,240,0.5);letter-spacing:1px;margin-top:-18px">HOSPITAL VIRTUAL 3D</div>
      <div class="loading-bar-track">
        <div class="loading-bar-fill" id="lb-fill"></div>
      </div>
      <div style="display:flex;justify-content:space-between;width:320px">
        <div class="loading-tip" id="lb-tip">${TIPS[0]}</div>
        <div class="loading-percent" id="lb-pct">0%</div>
      </div>
    `;
    this._bar = document.getElementById('lb-fill');
    this._tipEl = document.getElementById('lb-tip');
    this._pctEl = document.getElementById('lb-pct');

    // Rotar tips cada 1.8 s
    this._tipInterval = setInterval(() => {
      this._tipIdx = (this._tipIdx + 1) % TIPS.length;
      if (this._tipEl) this._tipEl.textContent = TIPS[this._tipIdx];
    }, 1800);
  }

  setProgress(pct) {
    if (this._bar) this._bar.style.width = `${pct}%`;
    if (this._pctEl) this._pctEl.textContent = `${Math.floor(pct)}%`;
  }

  hide() {
    clearInterval(this._tipInterval);
    this.setProgress(100);
    setTimeout(() => {
      this._el.classList.add('hidden');
    }, 400);
  }
}
