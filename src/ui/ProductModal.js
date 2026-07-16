import { EquipmentCatalog } from '../equipment/EquipmentCatalog.js';
import { EventBus } from '../utils/helpers.js';

// ============================================================
// PRODUCT MODAL — Modal glassmorphism de detalle de equipo
// ============================================================

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

export class ProductModal {
  constructor() {
    this._el = document.getElementById('product-modal');
    this._catalog = new EquipmentCatalog();
    this._isOpen = false;

    EventBus.on('hotspot:interact', ({ equipmentId }) => {
      this.open(equipmentId);
    });

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isOpen) this.close();
    });
  }

  open(equipmentId) {
    const eq = this._catalog.getEquipmentById(equipmentId);
    if (!eq) return;

    const catIcon = CATEGORY_ICONS[eq.category] || '🔧';
    const featuresHTML = (eq.features || [])
      .map(f => `<li>${f}</li>`)
      .join('');

    this._el.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-brand">${eq.brand} · ${eq.category}</div>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-img">
            ${eq.image
              ? `<img src="${eq.image}" alt="${eq.name}" />`
              : `<span style="font-size:72px">${catIcon}</span>`
            }
          </div>
          <div class="modal-info">
            <div class="modal-name">${eq.name}</div>
            <span class="modal-category">${eq.category}</span>
            <p class="modal-desc">${eq.description}</p>
            <div class="modal-features-title">Características</div>
            <ul class="modal-features">${featuresHTML}</ul>
            <button class="btn-quote" id="btn-quote">
              📞 Solicitar Cotización
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modal-close-btn').addEventListener('click', () => this.close());
    document.getElementById('btn-quote').addEventListener('click', () => {
      // En producción: abrir formulario de cotización o enlace de WhatsApp
      alert(`Solicitud de cotización para:\n${eq.name}\n\nContacta a Kezelmedica para más información.`);
    });

    // Click fuera cierra
    this._el.addEventListener('click', (e) => {
      if (e.target === this._el) this.close();
    }, { once: true });

    this._el.classList.add('visible');
    this._isOpen = true;
    EventBus.emit('modal:open');
  }

  close() {
    this._el.classList.remove('visible');
    this._isOpen = false;
    EventBus.emit('modal:close');
  }

  get isOpen() { return this._isOpen; }
}
