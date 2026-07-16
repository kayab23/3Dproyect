import * as THREE from 'three';

// Core
import { Engine }          from './core/Engine.js';
import { Controls }        from './core/Controls.js';
import { CollisionSystem } from './core/CollisionSystem.js';
import { Lighting }        from './core/Lighting.js';

// Hospital
import { HospitalBuilder } from './hospital/HospitalBuilder.js';
import { RoomFactory }     from './hospital/RoomFactory.js';
import { DoorSystem }      from './hospital/DoorSystem.js';

// Áreas
import { AreaManager }     from './areas/AreaManager.js';
import { AREA_DEFINITIONS, SPAWN_AREA } from './areas/areaDefinitions.js';

// Equipment
import { EquipmentLoader } from './equipment/EquipmentLoader.js';

// UI
import { LoadingScreen }   from './ui/LoadingScreen.js';
import { WelcomeScreen }   from './ui/WelcomeScreen.js';
import { HUD }             from './ui/HUD.js';
import { Minimap }         from './ui/Minimap.js';
import { AreaPanel }       from './ui/AreaPanel.js';
import { ProductModal }    from './ui/ProductModal.js';

// Utilities
import { EventBus, createTween } from './utils/helpers.js';
import { FLOOR_Y, PLAYER_HEIGHT, APP_STATE } from './utils/constants.js';

// ============================================================
// MAIN — Punto de entrada de la aplicación
// ============================================================

let appState = APP_STATE.LOADING;

async function init() {
  // ─── UI Inmediata ───────────────────────────────────────
  const loadingScreen = new LoadingScreen();
  loadingScreen.setProgress(5);

  // ─── Engine ─────────────────────────────────────────────
  const engine = new Engine('hospital-canvas');
  loadingScreen.setProgress(15);

  // ─── Sistemas Core ──────────────────────────────────────
  const collision  = new CollisionSystem(engine.scene);
  const lighting   = new Lighting(engine.scene);
  const controls   = new Controls(engine.camera, document.body);
  loadingScreen.setProgress(25);

  // ─── Construir Hospital ──────────────────────────────────
  const builder = new HospitalBuilder(engine.scene, lighting, collision);
  builder.build();
  loadingScreen.setProgress(50);

  // ─── Decorar Habitaciones ───────────────────────────────
  const roomFactory = new RoomFactory(engine.scene);
  for (const area of AREA_DEFINITIONS) {
    roomFactory.decorateRoom(area);
  }
  loadingScreen.setProgress(65);

  // ─── Puertas ────────────────────────────────────────────
  const doors = new DoorSystem(engine.scene, collision);
  // Puertas en las entradas de cada área (entre pasillo y sala)
  for (const area of AREA_DEFINITIONS) {
    const isX = area.w > area.d;
    doors.createDoor(area.cx, area.y, area.cz - area.d / 2, !isX, area.name);
  }
  loadingScreen.setProgress(75);

  // ─── Hotspots ────────────────────────────────────────────
  const areaManager = new AreaManager(engine.scene, lighting, collision);
  areaManager.buildHotspotsSync(THREE);
  loadingScreen.setProgress(85);

  // ─── Equipment Loader (lazy) ─────────────────────────────
  const eqLoader = new EquipmentLoader();
  loadingScreen.setProgress(90);

  // ─── UI Components ──────────────────────────────────────
  const hud          = new HUD();
  const minimap      = new Minimap();
  const areaPanel    = new AreaPanel();
  const productModal = new ProductModal();
  const welcome      = new WelcomeScreen();
  loadingScreen.setProgress(98);

  // ─── Spawn inicial ───────────────────────────────────────
  const spawnX = SPAWN_AREA?.spawnX ?? 0;
  const spawnZ = SPAWN_AREA?.spawnZ ?? 2;
  engine.camera.position.set(spawnX, PLAYER_HEIGHT, spawnZ);

  // ─── Iluminación inicial ─────────────────────────────────
  lighting.setActiveArea('lobby');

  // ─── Finalizar loading ───────────────────────────────────
  loadingScreen.setProgress(100);
  await sleep(600);
  loadingScreen.hide();
  await sleep(300);

  // ─── Mostrar bienvenida ──────────────────────────────────
  appState = APP_STATE.WELCOME;
  welcome.show();

  // ─── Event: iniciar recorrido ────────────────────────────
  EventBus.on('welcome:start', () => {
    welcome.hide();
    controls.lock();
  });

  // ─── Event: PointerLock ──────────────────────────────────
  EventBus.on('pointerlock', ({ locked }) => {
    if (locked) {
      appState = APP_STATE.PLAYING;
      hud.show();
      minimap.show();
    } else {
      // Si no hay modal abierto, mostrar bienvenida de nuevo
      if (appState !== APP_STATE.MODAL_OPEN) {
        appState = APP_STATE.WELCOME;
        welcome.show();
        hud.hide();
      }
    }
  });

  // ─── Event: Modal ────────────────────────────────────────
  EventBus.on('modal:open', () => {
    appState = APP_STATE.MODAL_OPEN;
    controls.unlock();
  });
  EventBus.on('modal:close', () => {
    appState = APP_STATE.PLAYING;
    controls.lock();
  });

  // ─── Event: Teletransporte por Minimap ───────────────────
  EventBus.on('minimap:teleport', ({ area }) => {
    if (appState !== APP_STATE.PLAYING) return;
    _teleportToArea(area, engine, controls, lighting);
  });

  // ─── Event: Interacción con hotspot ──────────────────────
  EventBus.on('interact', () => {
    if (appState !== APP_STATE.PLAYING) return;
    const nearestHotspot = collision.getNearestInteractable(engine.camera.position);
    if (nearestHotspot) nearestHotspot.interact();
  });

  // ─── Click en canvas para interacción raycast ────────────
  document.addEventListener('click', () => {
    if (appState !== APP_STATE.PLAYING) return;
    const dir = controls.direction;
    const hotspotMeshes = areaManager.hotspots.flatMap(h => [h._inner, h._outer]);
    const hit = collision.raycastClick(engine.camera.position, dir, hotspotMeshes);
    if (hit?.object?.userData?.hotspot) {
      hit.object.userData.hotspot.interact();
    }
  });

  // ─── Game Loop ───────────────────────────────────────────
  engine.onUpdate((dt, elapsed) => {
    if (appState !== APP_STATE.PLAYING) return;

    // Mover al jugador
    controls.update(dt, elapsed, collision);

    // Actualizar puertas
    doors.update(engine.camera.position);

    // Actualizar áreas y hotspots
    areaManager.update(dt, elapsed, engine.camera.position);

    // Actualizar minimap
    minimap.update(engine.camera.position.x, engine.camera.position.z);

    // Lazy load del área actual
    const aId = areaManager.currentAreaId;
    if (aId && !eqLoader.isAreaLoaded(aId)) {
      eqLoader.loadAreaEquipment(aId); // no await — carga en segundo plano
    }
  });

  engine.start();
}

// ─── Teletransporte con fade ─────────────────────────────
function _teleportToArea(area, engine, controls, lighting) {
  const overlay = document.getElementById('elevator-overlay');
  overlay.innerHTML = `
    <div class="elevator-msg">
      <div class="elevator-icon">🏥</div>
      <div class="elevator-text">Navegando a ${area.name}...</div>
    </div>
  `;
  overlay.classList.add('active');

  setTimeout(() => {
    engine.camera.position.set(area.cx, area.y + PLAYER_HEIGHT, area.cz);
    controls.setBaseY(area.y);
    lighting.setActiveArea(area.id);
    setTimeout(() => overlay.classList.remove('active'), 400);
  }, 400);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Arrancar ────────────────────────────────────────────
init().catch(err => {
  console.error('[Main] Error al inicializar:', err);
});
