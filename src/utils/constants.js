// ============================================================
// CONSTANTES GLOBALES — Kezelmedica Hospital 3D
// ============================================================

// --- Dimensiones del mundo (en unidades Three.js = metros) ---
export const ROOM_HEIGHT = 3.2;          // altura de techo estándar
export const FLOOR_THICKNESS = 0.2;
export const WALL_THICKNESS = 0.15;
export const DOOR_WIDTH = 1.4;
export const DOOR_HEIGHT = 2.4;
export const CORRIDOR_WIDTH = 3.0;

// --- Plantas ---
export const FLOOR_Y = {
  GROUND: 0,
  UPPER: ROOM_HEIGHT + FLOOR_THICKNESS,   // ~3.4
};

// --- Cámara / Player ---
export const PLAYER_HEIGHT = 1.7;         // ojos a 1.7m del suelo
export const PLAYER_RADIUS = 0.35;        // radio de colisión
export const MOVE_SPEED = 4.5;            // m/s caminando
export const SPRINT_SPEED = 8.0;          // m/s corriendo
export const HEAD_BOB_FREQ = 2.5;         // Hz del head bobbing
export const HEAD_BOB_AMP = 0.04;         // amplitud en metros
export const COLLISION_DISTANCE = 0.5;    // distancia mínima a paredes

// --- Hotspots ---
export const HOTSPOT_INTERACT_DIST = 3.5; // distancia para mostrar "E"
export const HOTSPOT_RADIUS = 0.25;
export const HOTSPOT_HOVER_SPEED = 1.2;   // velocidad de flotación
export const HOTSPOT_HOVER_AMP = 0.12;

// --- Iluminación ---
export const AMBIENT_INTENSITY = 0.35;
export const ROOM_LIGHT_INTENSITY = 1.8;
export const SHADOW_MAP_SIZE = 512;       // reducido para rendimiento

// --- Colores de marca Kezelmedica ---
export const COLORS = {
  KEZEL_BLUE: 0x0055A4,
  KEZEL_CYAN: 0x00B4D8,
  KEZEL_WHITE: 0xF8FAFF,
  HOTSPOT: 0x00D4FF,
  HOTSPOT_GLOW: 0x0088FF,
  FLOOR_HOSPITAL: 0xEEF2F7,
  WALL_HOSPITAL: 0xF5F7FA,
  CEILING: 0xFFFFFF,
  GLASS: 0x88CCFF,
  ACCENT_TEAL: 0x00B4A0,
};

// --- Áreas IDs ---
export const AREA_IDS = {
  LOBBY: 'lobby',
  AMBULANCIA: 'ambulancia',
  URGENCIAS: 'urgencias',
  QUIROFANO: 'quirofano',
  TRANSPORTE_INT: 'transporte_interior',
  TERAPIA_INT: 'terapia_intermedia',
  ENDOSCOPIA: 'endoscopia',
  SUMINISTRO_GAS: 'suministro_gas',
  CONCEPCION: 'concepcion',
  TOCO_CIRUGIA: 'toco_cirugia',
  UCIN_UTIP: 'ucin_utip',
  TELEMEDICINA: 'telemedicina',
  HOSPITALIZACION: 'hospitalizacion',
  HEMODIALISIS: 'hemodialisis',
  IMAGENOLOGIA: 'imagenologia',
  UCI: 'uci',
};

// --- Estados de la app ---
export const APP_STATE = {
  LOADING: 'loading',
  WELCOME: 'welcome',
  PLAYING: 'playing',
  MODAL_OPEN: 'modal_open',
  ELEVATOR: 'elevator',
};
