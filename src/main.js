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

// --- Lista de objetivos de exploración interactiva ---
const TOUR_MISSIONS = [
  { areaId: 'urgencias', task: 'Explora Urgencias 🚨', desc: 'Sigue el rayo de luz. Conoce el Carro Rojo de reanimación y la camilla eléctrica.' },
  { areaId: 'quirofano', task: 'Ingresa al Quirófano 🔬', desc: 'Entra a la sala. Observa la mesa quirúrgica motorizada QX-500 y la máquina de anestesia.' },
  { areaId: 'uci', task: 'Sube a la UCI en Planta Alta 💉', desc: 'Usa el elevador. Examina el Ventilador Mecánico V-Pro y el monitor multiparamétrico.' },
  { areaId: 'ucin_utip', task: 'Explora UCIN / UTIP 🍼', desc: 'Investiga cuidados neonatales. Descubre la incubadora de cuidado intensivo fija.' },
  { areaId: 'telemedicina', task: 'Visita Telemedicina 📡', desc: 'Explora telesalud. Observa el carrito integrado TeleMed-Pro.' },
  { areaId: 'imagenologia', task: 'Ve a Imagenología 🩻', desc: 'Ve a la esquina derecha. Observa el tomógrafo circular y el sistema de rayos X.' },
  { areaId: 'hemodialisis', task: 'Visita Hemodiálisis 🩸', desc: 'Explora la sala. Revisa las máquinas purificadoras y sillones de diálisis.' },
  { areaId: 'ambulancia', task: 'Inspecciona la Ambulancia 🚑', desc: 'Ve afuera. Descubre la camilla de transporte plegable y el desfibrilador portátil.' }
];

let currentMissionIndex = 0;
const visitedAreas = new Set();
let waypointIndicator = null;

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

  // ─── Waypoint 3D (Rayo de luz guía) ─────────────────────
  const waypointGeo = new THREE.CylinderGeometry(1.5, 1.5, 3.2, 16, 1, true);
  const waypointMat = new THREE.MeshBasicMaterial({
    color: 0x00B4D8,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const shaft = new THREE.Mesh(waypointGeo, waypointMat);
  shaft.position.y = 1.6;

  const ringGeo = new THREE.RingGeometry(1.45, 1.55, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00D4FF,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;

  waypointIndicator = new THREE.Group();
  waypointIndicator.add(shaft, ring);
  engine.scene.add(waypointIndicator);

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

  // ─── Spawn inicial: vista aérea maqueta rotando lentamente ────────
  engine.camera.position.set(28, 22, 28);
  engine.orbitControls.target.set(0, 2, 3);
  engine.orbitControls.enabled = true;
  engine.orbitControls.autoRotate = true;
  engine.orbitControls.autoRotateSpeed = 0.4;

  // Mouse coords para raycast en vista global
  const mouse = new THREE.Vector2();
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

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

  // ─── Event: iniciar recorrido (entra a Vista Global interactiva) ──────
  EventBus.on('welcome:start', () => {
    welcome.hide();
    appState = 'GLOBAL_VIEW';
    engine.orbitControls.autoRotate = false;
    hud.show();
    minimap.show();
    EventBus.emit('camera:mode:updated', { mode: 'global' });
    updateMission(engine);
  });

  // ─── Event: Cambio de modo de cámara desde el HUD ────────
  EventBus.on('camera:mode:change', ({ mode }) => {
    if (mode === 'global' && appState === APP_STATE.PLAYING) {
      _transitionToGlobalView(engine, controls, lighting);
    } else if (mode === 'fps' && appState === 'GLOBAL_VIEW') {
      // Teletransportar al lobby por defecto
      _transitionToAreaFPS(SPAWN_AREA, engine, controls, lighting);
    }
  });

  // ─── Event: PointerLock ──────────────────────────────────
  EventBus.on('pointerlock', ({ locked }) => {
    if (locked) {
      appState = APP_STATE.PLAYING;
      hud.show();
      minimap.show();
      EventBus.emit('camera:mode:updated', { mode: 'fps' });
    } else {
      // Si salimos de PointerLock y no hay modal abierto, volver a Vista Global en vez de Welcome
      if (appState !== APP_STATE.MODAL_OPEN && appState === APP_STATE.PLAYING) {
        _transitionToGlobalView(engine, controls, lighting);
      }
    }
  });

  // ─── Event: Modal ────────────────────────────────────────
  EventBus.on('modal:open', () => {
    this_appState_before_modal = appState;
    appState = APP_STATE.MODAL_OPEN;
    controls.unlock();
  });
  let this_appState_before_modal = 'GLOBAL_VIEW';
  EventBus.on('modal:close', () => {
    if (this_appState_before_modal === 'GLOBAL_VIEW') {
      appState = 'GLOBAL_VIEW';
      engine.orbitControls.enabled = true;
    } else {
      appState = APP_STATE.PLAYING;
      controls.lock();
    }
  });

  // ─── Event: Teletransporte por Minimap ───────────────────
  EventBus.on('minimap:teleport', ({ area }) => {
    if (appState === 'GLOBAL_VIEW') {
      _transitionToAreaFPS(area, engine, controls, lighting);
    } else if (appState === APP_STATE.PLAYING) {
      _teleportToArea(area, engine, controls, lighting);
    }
  });

  // ─── Event: Interacción con hotspot (tecla E) ────────────
  EventBus.on('interact', () => {
    if (appState !== APP_STATE.PLAYING) return;
    const nearestHotspot = collision.getNearestInteractable(engine.camera.position);
    if (nearestHotspot) nearestHotspot.interact();
  });

  // ─── Click en canvas: Raycast de interacción ──────────────
  document.addEventListener('click', (e) => {
    // Si hace click en botones del HUD, ignorar raycast
    if (e.target.closest('.hud-camera-toggle') || e.target.closest('.modal-card')) return;

    if (appState === 'GLOBAL_VIEW') {
      // Click en vista global -> Raycast desde cámara con coordenadas del mouse
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, engine.camera);
      const hotspotMeshes = areaManager.hotspots.flatMap(h => [h._inner, h._outer]);
      const hits = raycaster.intersectObjects(hotspotMeshes);
      
      if (hits.length > 0) {
        const hotspot = hits[0].object.userData.hotspot;
        if (hotspot) {
          const area = AREA_DEFINITIONS.find(a => a.id === hotspot.areaId);
          if (area) {
            _transitionToAreaFPS(area, engine, controls, lighting);
            // Mostrar modal del producto seleccionado tras el zoom
            setTimeout(() => {
              productModal.open(hotspot.equipmentId);
            }, 1300);
          }
        }
      }
    } else if (appState === APP_STATE.PLAYING) {
      // Click en primera persona (FPS) -> Raycast al centro de la mira
      const dir = controls.direction;
      const hotspotMeshes = areaManager.hotspots.flatMap(h => [h._inner, h._outer]);
      const hit = collision.raycastClick(engine.camera.position, dir, hotspotMeshes);
      if (hit?.object?.userData?.hotspot) {
        hit.object.userData.hotspot.interact();
      }
    }
  });

  // ─── Game Loop ───────────────────────────────────────────
  engine.onUpdate((dt, elapsed) => {
    // Actualizar proyección 2D de etiquetas de sala
    const isGlobal = appState === 'GLOBAL_VIEW' || appState === APP_STATE.WELCOME || appState === 'GLOBAL_VIEW_TWEEN';
    hud.updateRoomLabels(engine.camera, isGlobal ? 'global' : 'fps');

    // Animación del rayo de luz guía (3D Waypoint)
    if (waypointIndicator && waypointIndicator.visible) {
      ring.rotation.z += dt * 0.7;
      const pulse = 1.0 + Math.sin(elapsed * 4.5) * 0.08;
      shaft.scale.set(pulse, 1.0, pulse);
    }

    // Si está en bienvenida o vista global, actualizar rotación de cámara
    if (appState === APP_STATE.WELCOME || appState === 'GLOBAL_VIEW') {
      engine.orbitControls.update();
    }

    if (appState !== APP_STATE.PLAYING) return;

    // Mover al jugador
    controls.update(dt, elapsed, collision);

    // Actualizar puertas
    doors.update(engine.camera.position);

    // Actualizar áreas y hotspots
    areaManager.update(dt, elapsed, engine.camera.position);

    // Actualizar minimap
    minimap.update(engine.camera.position.x, engine.camera.position.z);

    // Detección de misiones de exploración
    const aId = areaManager.currentAreaId;
    const currentMission = TOUR_MISSIONS[currentMissionIndex];
    if (currentMission && aId === currentMission.areaId) {
      visitedAreas.add(aId);
      currentMissionIndex++;
      _flashScreenSuccess();
      updateMission(engine);
    }

    // Lazy load del área actual
    if (aId && !eqLoader.isAreaLoaded(aId)) {
      eqLoader.loadAreaEquipment(aId); // carga en segundo plano
    }
  });

  engine.start();
}

// ─── Transición a vista FPS con zoom ───────────────────────
function _transitionToAreaFPS(area, engine, controls, lighting) {
  appState = 'GLOBAL_VIEW_TWEEN';
  controls.resetKeys();
  engine.orbitControls.enabled = false;

  const targetPos = new THREE.Vector3(area.cx, area.y + PLAYER_HEIGHT, area.cz);
  const targetLook = new THREE.Vector3(area.cx, area.y + PLAYER_HEIGHT, area.cz - 2);

  engine.tweenCamera(targetPos, targetLook, 1.2, () => {
    controls.setBaseY(area.y);
    lighting.setActiveArea(area.id);
    controls.lock(); // Esto levantará pointerlock y cambiará estado a PLAYING
  });
}

// ─── Transición a vista global maqueta 3D ───────────────────
function _transitionToGlobalView(engine, controls, lighting) {
  appState = 'GLOBAL_VIEW_TWEEN';
  controls.unlock();
  controls.resetKeys();

  const targetPos = new THREE.Vector3(28, 22, 28);
  const targetLook = new THREE.Vector3(0, 2, 3);

  engine.tweenCamera(targetPos, targetLook, 1.2, () => {
    appState = 'GLOBAL_VIEW';
    engine.orbitControls.enabled = true;
    engine.orbitControls.target.copy(targetLook);
    EventBus.emit('camera:mode:updated', { mode: 'global' });
  });
}

// ─── Teletransporte con fade (Primera Persona a Primera Persona) ─
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

// --- Actualiza el objetivo de misión activo y la posición de la baliza guía ---
function updateMission(engine) {
  const mission = TOUR_MISSIONS[currentMissionIndex];
  if (!mission) {
    // Tour completado!
    EventBus.emit('guide:update', {
      task: '¡Tour Completado! 🎉',
      desc: 'Has visitado todas las áreas recomendadas. ¡Siéntete libre de seguir explorando!',
      progress: '8 / 8 salas'
    });
    if (waypointIndicator) waypointIndicator.visible = false;
    return;
  }

  const area = AREA_DEFINITIONS.find(a => a.id === mission.areaId);
  if (area) {
    if (waypointIndicator) {
      // Posicionar la columna de luz guía en el centro de la sala
      waypointIndicator.position.set(area.cx, area.y, area.cz);
      waypointIndicator.visible = true;
    }

    EventBus.emit('guide:update', {
      task: mission.task,
      desc: mission.desc,
      progress: `${visitedAreas.size} / ${TOUR_MISSIONS.length} salas`
    });
  }
}

// --- Flash visual verde/celeste para celebración de misiones ---
function _flashScreenSuccess() {
  const overlay = document.getElementById('elevator-overlay');
  overlay.innerHTML = `
    <div class="elevator-msg" style="opacity: 1; transform: translate(-50%, -50%) scale(1.1); transition: transform 0.4s;">
      <div style="font-size: 56px; margin-bottom: 12px; filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.6));">🎉</div>
      <div style="font-size: 22px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">¡Objetivo Completado!</div>
    </div>
  `;
  overlay.style.background = 'rgba(0, 180, 216, 0.45)';
  overlay.classList.add('active');

  setTimeout(() => {
    overlay.style.background = 'rgba(0, 85, 164, 0)';
    overlay.classList.remove('active');
    overlay.innerHTML = '';
  }, 1300);
}

// ─── Arrancar ────────────────────────────────────────────
init().catch(err => {
  console.error('[Main] Error al inicializar:', err);
});
