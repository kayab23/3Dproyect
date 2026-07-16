import * as THREE from 'three';
import { ROOM_HEIGHT, COLORS } from '../utils/constants.js';
import { AREA_DEFINITIONS } from '../areas/areaDefinitions.js';

// ============================================================
// ROOM FACTORY — Decora cada área según su tipo
// Añade mobiliario detallado, pantallas de ECG animadas y avatares 2.5D
// ============================================================

// Materiales base compartidos
const MAT_BED = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
const MAT_METAL = new THREE.MeshStandardMaterial({ color: 0xd0daea, roughness: 0.22, metalness: 0.85 });
const MAT_RED = new THREE.MeshStandardMaterial({ color: 0xdd2222, roughness: 0.5 });

export class RoomFactory {
  constructor(scene) {
    this.scene = scene;
    this.avatars = [];
    this._spawned = false;

    this._initECGCanvas();
    this._initAvatars();
  }

  // Inicializar textura dinámica de monitor de signos vitales (ECG)
  _initECGCanvas() {
    this._ecgCanvas = document.createElement('canvas');
    this._ecgCanvas.width = 128;
    this._ecgCanvas.height = 128;
    this._ecgCtx = this._ecgCanvas.getContext('2d');

    this.ecgTexture = new THREE.CanvasTexture(this._ecgCanvas);

    this.matScreen = new THREE.MeshStandardMaterial({
      map: this.ecgTexture,
      roughness: 0.1,
      metalness: 0.1,
      emissiveMap: this.ecgTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.65
    });

    this._ecgPoints = [];
    for (let i = 0; i < 128; i++) {
      this._ecgPoints.push(64); // línea base en medio
    }
  }

  // Actualizar animación ECG (llamar desde el loop de main.js)
  update(dt, elapsed) {
    this._updateECG(elapsed);
  }

  _updateECG(elapsed) {
    const ctx = this._ecgCtx;
    const w = 128;
    const h = 128;

    // Limpiar con fondo oscuro clínico
    ctx.fillStyle = '#020d18';
    ctx.fillRect(0, 0, w, h);

    // Dibujar rejilla médica sutil
    ctx.strokeStyle = 'rgba(0, 180, 216, 0.12)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Calcular ciclo de latido (1 latido cada 0.9 segundos aprox)
    const beatTime = (elapsed * 1.4) % 1.0;
    let val = 64; // punto de partida en el centro

    if (beatTime > 0.1 && beatTime < 0.15) {
      val = 60; // onda P
    } else if (beatTime >= 0.15 && beatTime < 0.18) {
      val = 64;
    } else if (beatTime >= 0.18 && beatTime < 0.21) {
      val = 98; // pico Q (arriba)
    } else if (beatTime >= 0.21 && beatTime < 0.25) {
      val = 22; // pico S (caída)
    } else if (beatTime >= 0.25 && beatTime < 0.32) {
      val = 55; // onda T
    } else if (beatTime >= 0.32 && beatTime < 0.42) {
      val = 64;
    }

    // Agregar leve vibración médica
    val += (Math.random() - 0.5) * 1.2;

    // Desplazar puntos
    this._ecgPoints.push(val);
    if (this._ecgPoints.length > w) {
      this._ecgPoints.shift();
    }

    // Dibujar curva de ECG verde fluorescente con brillo
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, this._ecgPoints[0]);
    for (let i = 1; i < this._ecgPoints.length; i++) {
      ctx.lineTo(i, this._ecgPoints[i]);
    }
    ctx.stroke();

    // Textos de signos en pantalla
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('FC: 74 lpm', 6, 18);
    ctx.fillText('SpO2: 98%', 6, 32);

    this.ecgTexture.needsUpdate = true;
  }

  // Inicializar e instanciar avatares
  _initAvatars() {
    this._loadKeyedAvatar('/images/avatars/doctor_female.png', (tex) => {
      this._texDoctorFemale = tex;
      this._spawnStaticAvatars();
    });

    this._loadKeyedAvatar('/images/avatars/doctor_male.png', (tex) => {
      this._texDoctorMale = tex;
      this._spawnStaticAvatars();
    });

    this._loadKeyedAvatar('/images/avatars/patient.png', (tex) => {
      this._texPatient = tex;
      this._spawnStaticAvatars();
    });
  }

  // Carga imagen, remueve el fondo negro y la convierte a textura de Three.js
  _loadKeyedAvatar(path, onLoad) {
    const loader = new THREE.TextureLoader();
    loader.load(path, (texture) => {
      const image = texture.image;
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      // Procesar píxeles para remover fondo negro
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        if (r < 18 && g < 18 && b < 18) {
          data[i+3] = 0; // Transparencia total
        }
      }
      ctx.putImageData(imgData, 0, 0);

      const keyedTex = new THREE.CanvasTexture(canvas);
      keyedTex.colorSpace = THREE.SRGBColorSpace;
      onLoad(keyedTex);
    });
  }

  _spawnStaticAvatars() {
    if (!this._texDoctorFemale || !this._texDoctorMale || !this._texPatient) return;
    if (this._spawned) return;
    this._spawned = true;

    // 1. Recepcionista de recepción en el lobby
    this._createStandingAvatar(0, 0, -1.3, 1.35, this._texDoctorFemale);

    // 2. Doctor de guardia en Urgencias
    this._createStandingAvatar(-18.5, 0, 3.0, 1.35, this._texDoctorMale);

    // 3. Paciente acostado en camilla de Urgencias
    this._createLyingAvatar(-16.0, 0.76, 4.0, 1.7, 0.78, this._texPatient);

    // 4. Cirujano en el Quirófano
    this._createStandingAvatar(-4.5, 0, 1.8, 1.35, this._texDoctorMale);

    // 5. Enfermera en Terapia Intermedia
    this._createStandingAvatar(14.5, 0, 1.8, 1.35, this._texDoctorFemale);

    // 6. Paciente en UCI (Planta Alta)
    this._createLyingAvatar(4.0, 3.4 + 0.76, 6.4, 1.7, 0.78, this._texPatient);

    // 7. Doctor en Telemedicina (Planta Alta)
    this._createStandingAvatar(8.0, 3.4, -4.0, 1.35, this._texDoctorFemale);
  }

  // Crear avatar parado (siempre mira a la cámara)
  _createStandingAvatar(x, y, z, height, texture) {
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    const aspect = 1.0; // asume imagen cuadrada
    sprite.scale.set(height * aspect, height, 1);
    sprite.position.set(x, y + height / 2, z);
    this.scene.add(sprite);
    this.avatars.push(sprite);
  }

  // Crear avatar acostado horizontalmente sobre la camilla (no rota)
  _createLyingAvatar(x, y, z, width, depth, texture) {
    const geo = new THREE.PlaneGeometry(width, depth);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2; // Acostado
    mesh.rotation.z = Math.PI / 2;  // Orientar a lo largo de la cama
    mesh.position.set(x, y + 0.02, z);
    this.scene.add(mesh);
  }

  // Decorar salas segun tipo
  decorateRoom(areaDef) {
    const { id, cx, cz, w, d, y } = areaDef;
    this._addAreaSign(areaDef);

    switch (id) {
      case 'urgencias':        this._makeUrgencias(cx, y, cz, w, d); break;
      case 'quirofano':        this._makeQuirofano(cx, y, cz, w, d); break;
      case 'uci':              this._makeUCI(cx, y, cz, w, d); break;
      case 'hospitalizacion':  this._makeHospitalizacion(cx, y, cz, w, d); break;
      case 'toco_cirugia':     this._makeToco(cx, y, cz, w, d); break;
      case 'ucin_utip':        this._makeUCIN(cx, y, cz, w, d); break;
      case 'imagenologia':     this._makeImagenologia(cx, y, cz, w, d); break;
      case 'hemodialisis':     this._makeHemodialisis(cx, y, cz, w, d); break;
      case 'endoscopia':       this._makeEndoscopia(cx, y, cz, w, d); break;
      case 'suministro_gas':   this._makeGas(cx, y, cz, w, d); break;
      default:                 this._makeGeneric(cx, y, cz, w, d); break;
    }
  }

  _addAreaSign(area) {
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.5, 0.05),
      new THREE.MeshStandardMaterial({
        color: area.color || COLORS.KEZEL_BLUE,
        emissive: area.color || COLORS.KEZEL_BLUE,
        emissiveIntensity: 0.3,
        roughness: 0.3,
        metalness: 0.5,
      })
    );
    plaque.position.set(area.cx, area.y + 2.6, area.cz - area.d / 2 + 0.08);
    this.scene.add(plaque);
  }

  // 🏥 Camilla Clínica Detallada (Estructura de 3 capas + IV pole + IV suero)
  _addBed(x, y, z, color = MAT_BED) {
    const group = new THREE.Group();

    // 1. Base inferior con ruedas
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 1.8), MAT_METAL);
    base.position.y = 0.15;
    group.add(base);

    // 2. Patas de soporte
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
    for (const [lx, lz] of [[-0.3, -0.7], [0.3, -0.7], [-0.3, 0.7], [0.3, 0.7]]) {
      const leg = new THREE.Mesh(legGeo, MAT_METAL);
      leg.position.set(lx, 0.35, lz);
      group.add(leg);
    }

    // 3. Ruedas en las patas
    const wheelGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    for (const [wx, wz] of [[-0.3, -0.7], [0.3, -0.7], [-0.3, 0.7], [0.3, 0.7]]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.07, wz);
      group.add(wheel);
    }

    // 4. Colchón clínico
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.22, 1.9), color);
    mattress.position.y = 0.61;
    mattress.receiveShadow = true;
    mattress.castShadow = true;
    group.add(mattress);

    // 5. Almohada
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.45), MAT_BED);
    pillow.position.set(0, 0.75, -0.65);
    group.add(pillow);

    // 6. Barandales de seguridad cromados
    const railGeo = new THREE.BoxGeometry(0.02, 0.25, 1.3);
    const leftRail = new THREE.Mesh(railGeo, MAT_METAL);
    leftRail.position.set(-0.44, 0.68, 0);
    const rightRail = leftRail.clone();
    rightRail.position.set(0.44, 0.68, 0);
    group.add(leftRail, rightRail);

    // 7. Riel porta suero vertical
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 8), MAT_METAL);
    pole.position.set(-0.4, 0.9, -0.8);
    group.add(pole);

    // 8. Bolsa de infusión translúcida (Suero)
    const bagGeo = new THREE.CapsuleGeometry(0.07, 0.14, 4, 8);
    const bagMat = new THREE.MeshPhysicalMaterial({
      color: 0xeef8ff,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.5
    });
    const bag = new THREE.Mesh(bagGeo, bagMat);
    bag.position.set(-0.4, 1.5, -0.8);
    group.add(bag);

    group.position.set(x, y, z);
    this.scene.add(group);
  }

  // 📺 Monitor Clínico Premium con ECG Animado
  _addMonitor(x, y, z) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), MAT_METAL);
    stand.position.set(x, y + 0.4, z);

    // Pantalla cargando la textura animada de ECG
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.05), this.matScreen);
    screen.position.set(x, y + 1.1, z);

    stand.castShadow = true;
    screen.castShadow = true;
    this.scene.add(stand, screen);
  }

  _addGasCylinder(x, y, z) {
    const geo = new THREE.CylinderGeometry(0.18, 0.18, 1.4, 12);
    const mesh = new THREE.Mesh(geo, MAT_METAL);
    mesh.position.set(x, y + 0.7, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
  }

  _makeUrgencias(cx, y, cz, w, d) {
    this._addBed(cx - 1.5, y, cz - 1.0, MAT_BED);
    this._addBed(cx + 1.5, y, cz + 1.0, MAT_BED);
    this._addMonitor(cx - 2.2, y, cz - 1.5);

    // Carro rojo
    const carro = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.8), MAT_RED);
    carro.position.set(cx + 2.5, y + 0.5, cz + 2.0);
    carro.castShadow = true;
    this.scene.add(carro);
  }

  _makeQuirofano(cx, y, cz, w, d) {
    // Mesa quirúrgica premium
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 1.9), MAT_METAL);
    table.position.set(cx, y + 1.0, cz);
    table.castShadow = true;
    this.scene.add(table);

    // Lámpara cielítica de quirófano
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffee, emissiveIntensity: 1.5 }));
    lamp.position.set(cx, y + ROOM_HEIGHT - 0.1, cz);
    this.scene.add(lamp);

    // Monitores duales
    this._addMonitor(cx - 2.2, y, cz - 1.0);
    this._addMonitor(cx + 2.2, y, cz + 1.0);
  }

  _makeUCI(cx, y, cz, w, d) {
    const spacing = 2.4;
    for (let i = -1; i <= 1; i++) {
      this._addBed(cx + i * spacing, y, cz, MAT_BED);
      this._addMonitor(cx + i * spacing + 0.8, y, cz - 0.8);
    }
  }

  _makeHospitalizacion(cx, y, cz, w, d) {
    for (let i = 0; i < 3; i++) {
      this._addBed(cx - 1.6 + i * 1.6, y, cz - 0.5, MAT_BED);
    }
    this._addMonitor(cx, y, cz - 1.6);
  }

  _makeToco(cx, y, cz, w, d) {
    this._addBed(cx, y, cz, MAT_BED);
    // Incubadora
    const incub = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0xddeeff, transparent: true, opacity: 0.7 }));
    incub.position.set(cx + 2.2, y + 0.45, cz);
    this.scene.add(incub);
    this._addMonitor(cx - 1.8, y, cz);
  }

  _makeUCIN(cx, y, cz, w, d) {
    for (let i = 0; i < 3; i++) {
      const incub = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0xddeeff, transparent: true, opacity: 0.7 }));
      incub.position.set(cx - 1.6 + i * 1.6, y + 0.45, cz);
      this.scene.add(incub);
    }
  }

  _makeImagenologia(cx, y, cz, w, d) {
    const tomo = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.35, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3, metalness: 0.2 })
    );
    tomo.rotation.y = Math.PI / 2;
    tomo.position.set(cx, y + 1.0, cz);
    this.scene.add(tomo);

    const mesa = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 2.5), MAT_METAL);
    mesa.position.set(cx, y + 0.8, cz);
    this.scene.add(mesa);
    this._addMonitor(cx + 2.2, y, cz);
  }

  _makeHemodialisis(cx, y, cz, w, d) {
    for (let i = -1; i <= 1; i++) {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 1.2), new THREE.MeshStandardMaterial({ color: 0x48cae4, roughness: 0.6 }));
      chair.position.set(cx + i * 2.2, y + 0.5, cz);
      const machine = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 0.55), MAT_METAL);
      machine.position.set(cx + i * 2.2 + 0.8, y + 0.7, cz);
      this.scene.add(chair, machine);
    }
  }

  _makeEndoscopia(cx, y, cz, w, d) {
    this._addMonitor(cx, y, cz);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.4), MAT_METAL);
    tower.position.set(cx + 1.2, y + 0.75, cz);
    this.scene.add(tower);
  }

  _makeGas(cx, y, cz, w, d) {
    for (let i = 0; i < 5; i++) {
      this._addGasCylinder(cx - 2.0 + i * 1.0, y, cz);
    }
  }

  _makeGeneric(cx, y, cz, w, d) {
    this._addMonitor(cx, y, cz);
  }
}
