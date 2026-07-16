# 🏥 Kezelmedica — Hospital 3D Walkthrough Interactivo

Proyecto web 3D de recorrido virtual en primera persona por un hospital, donde los usuarios pueden explorar cada área/departamento y ver los equipos médicos que Kezelmedica vende.

## Imagen de Referencia

![Referencia del hospital isométrico](./imagen%20(14).png)

---

## Notas Importantes

> **Enfoque Híbrido Recomendado:** Dado que no existen modelos 3D GLB/GLTF del hospital preparados, el enfoque es **procedural + modular** donde el hospital se construye programáticamente con Three.js usando geometrías básicas (paredes, pisos, techos, pasillos) y se complementa con modelos 3D gratuitos de equipos médicos descargados de Sketchfab/TurboSquid.

> **Modelos 3D:** La calidad visual dependerá en gran medida de los modelos 3D de equipos médicos que consigamos. Los modelos gratuitos tienen limitaciones. Si Kezelmedica tiene renders/fotos 3D de sus equipos, podrían convertirse a GLB con Blender para mejor resultado.

> **Alcance del MVP:** Este plan cubre la **Fase 1 (MVP funcional)** — un hospital recorrible con las 15 áreas de la imagen, hotspots interactivos y paneles modales con catálogo de equipos. Fases posteriores podrían incluir modelos 3D detallados de cada equipo, sistema de cotización en línea, etc.

> **⚠️ Licencias de modelos 3D:** Al ser un sitio comercial de Kezelmedica, cada modelo descargado de Sketchfab/TurboSquid debe verificarse individualmente: muchos modelos "gratuitos" son CC BY-NC (uso no comercial) y no se pueden usar legalmente aquí. Priorizar modelos **CC0** o con licencia comercial explícita antes de integrarlos.

---

## ✅ Validación de Viabilidad

El enfoque técnico general (Three.js + generación procedural + PointerLockControls + raycasting para colisiones) **es viable** para un MVP funcional en navegador. Se identificaron 6 ajustes necesarios para que el resultado cumpla la meta de >30 FPS y cargue en tiempos razonables; ya están incorporados en las secciones correspondientes de este documento, marcados con **🔧 Ajuste**:

1. Escaleras reales → sustituidas por elevador/teletransporte entre plantas (no hay físicas de escalón).
2. Geometría por sala individual → debe fusionarse (`mergeGeometries`) o usar `InstancedMesh` para no disparar el conteo de draw calls.
3. Sombras dinámicas en las 15 áreas a la vez → activarlas solo en el área donde está el jugador.
4. Carga de ~50-60 GLBs de una sola vez → carga perezosa por área, no todo en el `LoadingScreen`.
5. Sin compresión de modelos/texturas → agregar `DRACOLoader` + `KTX2Loader`.
6. `imagen (14).png` pesa 3.3MB → comprimir/convertir a WebP antes de usarla como fondo del `WelcomeScreen`.
7. "Responsive tablet" es ambiguo con controles WASD+mouse → aclarado en Fases de Desarrollo.

## Preguntas Abiertas

1. **¿Tienes fotos o imágenes de los equipos médicos reales de Kezelmedica?** Si las tienes, las podemos usar en los paneles de productos. Si no, se generarán imágenes placeholder profesionales.

2. **¿El proyecto debe integrarse al sitio web existente de Kezelmedica o será un sitio independiente?**

3. **¿Quieres que el recorrido inicie con una vista isométrica general del hospital (como la imagen) y luego permita "entrar" al modo primera persona? ¿O directamente en primera persona?**

4. **¿Hay alguna paleta de colores / identidad de marca de Kezelmedica que deba seguir?**

---

## Arquitectura Técnica

### Stack Tecnológico

| Componente | Tecnología | Justificación |
|---|---|---|
| **Framework** | Vite + Vanilla JS | Rendimiento, HMR rápido, sin overhead de React innecesario |
| **Motor 3D** | Three.js (r170+) | Estándar de la industria para 3D web |
| **Controles FPS** | PointerLockControls | Controles primera persona nativos de Three.js |
| **Física/Colisiones** | Raycasting nativo | Detección de colisiones con paredes sin librerías externas |
| **Modelos** | GLTFLoader | Carga de modelos GLB/GLTF de equipos médicos |
| **UI Overlay** | HTML/CSS nativo | Paneles modales, HUD, minimap |
| **Bundler** | Vite | Build optimizado, code splitting |

### Estructura del Proyecto

```
3dproyect/
├── index.html                    # Entry point
├── package.json
├── vite.config.js
├── public/
│   ├── models/                   # Modelos GLB de equipos médicos
│   │   ├── hospital-bed.glb
│   │   ├── ventilator.glb
│   │   ├── monitor.glb
│   │   └── ...
│   ├── textures/                 # Texturas (pisos, paredes, etc.)
│   │   ├── floor-tile.jpg
│   │   ├── wall-clean.jpg
│   │   └── ceiling.jpg
│   └── images/                   # Imágenes de productos para catálogo
│       ├── products/
│       └── areas/
├── src/
│   ├── main.js                   # Entry point de la app
│   ├── styles/
│   │   └── main.css              # Estilos globales + UI overlay
│   ├── core/
│   │   ├── Engine.js             # Renderer, Scene, Camera, Loop
│   │   ├── Controls.js           # PointerLockControls + WASD movement
│   │   ├── CollisionSystem.js    # Raycasting collision detection
│   │   └── Lighting.js           # Iluminación del hospital
│   ├── hospital/
│   │   ├── HospitalBuilder.js    # Generador procedural del edificio
│   │   ├── RoomFactory.js        # Fábrica de habitaciones por tipo
│   │   ├── FloorPlan.js          # Layout/plano del hospital (datos)
│   │   ├── WallBuilder.js        # Construcción de paredes
│   │   └── DoorSystem.js         # Puertas interactivas entre áreas
│   ├── areas/
│   │   ├── AreaManager.js        # Gestión de áreas del hospital
│   │   ├── areaDefinitions.js    # Datos de las 15 áreas
│   │   └── AreaHotspot.js        # Puntos interactivos en cada área
│   ├── equipment/
│   │   ├── EquipmentCatalog.js   # Catálogo de equipos por área
│   │   ├── EquipmentLoader.js    # Carga de modelos 3D de equipos
│   │   └── equipmentData.js      # Base de datos de equipos médicos
│   ├── ui/
│   │   ├── HUD.js                # Heads-up display (área actual, controles)
│   │   ├── ProductModal.js       # Modal de detalle de producto
│   │   ├── AreaPanel.js          # Panel lateral de área con equipos
│   │   ├── Minimap.js            # Mapa del hospital con posición actual
│   │   ├── LoadingScreen.js      # Pantalla de carga animada
│   │   └── WelcomeScreen.js      # Pantalla de bienvenida/instrucciones
│   └── utils/
│       ├── constants.js          # Constantes globales
│       └── helpers.js            # Funciones utilitarias
└── imagen (14).png               # Referencia original
```

---

## Cambios Propuestos

### 1. Core Engine (Motor 3D)

#### [NUEVO] `src/core/Engine.js`
- Inicialización del `WebGLRenderer` con antialiasing, sombras y tone mapping
- `PerspectiveCamera` con FOV 75° (campo de visión natural para caminar)
- Game loop con `requestAnimationFrame` y delta time
- Manejo de resize responsive
- Post-processing: ambient occlusion sutil para realismo

#### [NUEVO] `src/core/Controls.js`
- `PointerLockControls` para rotación de cámara (mirar alrededor)
- Movimiento WASD con velocidad configurable
- Altura de cámara fija a ~1.7m (nivel de ojos de persona)
- Head bobbing sutil para sensación de caminar
- Sprint con Shift

#### [NUEVO] `src/core/CollisionSystem.js`
- Raycasting en 4 direcciones (frente, atrás, izquierda, derecha)
- Prevenir atravesar paredes, puertas cerradas y objetos sólidos
- Detección de proximidad a hotspots interactivos

#### [NUEVO] `src/core/Lighting.js`
- Iluminación tipo hospital: luz ambiental fría + luces fluorescentes
- Luces puntuales por habitación
- Sombras suaves en equipos médicos para profundidad
- Iluminación diferenciada por área (Quirófano = más intensa, Hospitalización = más cálida)
- **🔧 Ajuste — Sombras por proximidad:** con 15 áreas no se pueden tener todas las luces con `castShadow = true` simultáneamente sin destruir el framerate. Solo las luces del área donde está el jugador (y adyacentes) deben tener sombras activas; el resto se apagan/desactivan `castShadow` dinámicamente. El AO general del edificio se resuelve con textura horneada (lightmap/AO map) en piso y paredes, no en tiempo real.

---

### 2. Hospital Builder (Construcción Procedural)

#### [NUEVO] `src/hospital/FloorPlan.js`
Define el layout del hospital en una estructura de datos 2D que replica la distribución de la imagen de referencia:

```
PLANTA BAJA (Ground Floor):
┌─────────────────────────────────────────────────────────┐
│ Concepción &    │ Suministro │            │ Endoscopia  │
│ Gestión de      │ de Gas     │            │             │
│ Proyectos       │            │            │             │
├─────────────────┼────────────┤  Pasillo   ├─────────────┤
│ Urgencias       │ Quirófano  │  Central   │ Terapia     │
│                 │            │            │ Intermedia  │
├─────────────────┼────────────┤            ├─────────────┤
│ Transporte      │ Transporte │            │             │
│ Ambulancia      │ Interior   │            │             │
└─────────────────┴────────────┴────────────┴─────────────┘

PLANTA ALTA (Upper Floor):
┌─────────────────────────────────────────────────────────┐
│ Sala de Toco    │ UCIN/UTIP  │ Telemedicina │ Hospital. │
│ Cirugía         │            │              │           │
├─────────────────┼────────────┤   Pasillo    ├───────────┤
│                 │            │   Superior   │ Hemodial. │
│                 │    UCI     │              │           │
│                 │            │              ├───────────┤
│                 │            │              │ Imagenol. │
└─────────────────┴────────────┴──────────────┴───────────┘
```

#### [NUEVO] `src/hospital/HospitalBuilder.js`
- Genera geometría 3D a partir del `FloorPlan`
- Crea pisos con texturas de baldosa hospitalaria
- Paredes con textura blanca/gris limpia
- Techos con iluminación empotrada
- Pasillos centrales conectando todas las áreas
- **🔧 Ajuste — Elevador en vez de escaleras:** conectar las dos plantas con una zona de elevador interactiva (como una puerta) que teletransporta la cámara al Y de la otra planta con un fundido corto. Escaleras caminables requerirían física de step-offset que no está en el alcance del MVP (raycasting simple no la soporta bien).
- **🔧 Ajuste — Rendimiento de geometría:** las paredes/pisos/techos generados por sala deben fusionarse por material con `BufferGeometryUtils.mergeGeometries` (o usar `InstancedMesh` para elementos repetidos como columnas y marcos de puerta) para evitar cientos de draw calls entre las 15 áreas × 2 plantas y mantener >30 FPS en integrada.

#### [NUEVO] `src/hospital/RoomFactory.js`
- Fábrica que genera habitaciones según el tipo de área
- Cada tipo tiene decoración base diferente (color de piso, signalización)
- Coloca equipos médicos genéricos dentro de cada habitación
- Señalización con nombre del área en las paredes

#### [NUEVO] `src/hospital/WallBuilder.js`
- Sistema modular de paredes con ventanas transparentes (vidrio con shader)
- Paredes exteriores sólidas vs interiores con cristal (como en la imagen de referencia)
- Zócalos y molduras para realismo

#### [NUEVO] `src/hospital/DoorSystem.js`
- Puertas automáticas que se abren al acercarse
- Animación de apertura con tween
- Señalización sobre cada puerta con el nombre del área

---

### 3. Áreas y Equipos Médicos

#### [NUEVO] `src/areas/areaDefinitions.js`
Las 15 áreas del hospital con metadatos:

| # | Área | Piso | Equipos Ejemplo |
|---|------|------|-----------------|
| 1 | Transporte Ambulancia | PB | Ambulancia, camillas de transporte, desfibrilador portátil |
| 2 | Sala de Toco Cirugía | PA | Mesa de parto, monitor fetal, incubadora neonatal |
| 3 | UCIN / UTIP | PA | Incubadoras, ventiladores neonatales, bombas de infusión |
| 4 | Telemedicina | PA | Estación de telemedicina, cámara HD, monitor diagnóstico |
| 5 | Hospitalización | PA | Camas hospitalarias, monitores de signos vitales, bombas IV |
| 6 | Hemodiálisis | PA | Máquinas de hemodiálisis, sillones reclinables, purificador de agua |
| 7 | Imagenología | PA | Rayos X, tomógrafo, ultrasonido, resonancia magnética |
| 8 | UCI | PA | Ventiladores mecánicos, monitores multiparamétricos, desfibriladores |
| 9 | Transporte Interior | PB | Sillas de ruedas, camillas, carritos de medicamentos |
| 10 | Quirófano | PB | Mesa quirúrgica, lámpara cielítica, torre de laparoscopia, anestesia |
| 11 | Urgencias | PB | Camillas de emergencia, carro rojo, desfibrilador, monitor |
| 12 | Terapia Intermedia | PB | Camas eléctricas, monitores, oximetría, ventiladores |
| 13 | Endoscopia | PB | Torre de endoscopia, colonoscopio, monitor HD |
| 14 | Suministro de Gas | PB | Tanques de oxígeno, sistema de vacío, reguladores |
| 15 | Concepción & Gestión de Proyectos | PB | Estación de trabajo, mobiliario clínico |

#### [NUEVO] `src/equipment/EquipmentLoader.js`
- **🔧 Ajuste — Carga perezosa:** no cargar los ~50-60 GLBs de equipos durante el `LoadingScreen` inicial. Solo precargar el shell del hospital (geometría del edificio + texturas) y los equipos del área de inicio; el resto se carga bajo demanda al entrar/acercarse a cada área (evita un loading inicial de varios minutos).
- **🔧 Ajuste — Compresión:** usar `DRACOLoader` para geometría GLB comprimida y `KTX2Loader`/Basis para texturas, ya que los modelos gratuitos de Sketchfab suelen venir sin optimizar.

#### [NUEVO] `src/equipment/equipmentData.js`
Base de datos JSON con ~50-60 equipos médicos ejemplo:
```js
{
  id: "ventilador-mecanico-01",
  name: "Ventilador Mecánico V500",
  brand: "Kezelmedica",
  area: "uci",
  description: "Ventilador de alta gama para UCI...",
  features: ["Modos invasivos y no invasivos", "Pantalla táctil 15\"", ...],
  image: "/images/products/ventilator.jpg",
  model3d: "/models/ventilator.glb"  // opcional
}
```

#### [NUEVO] `src/areas/AreaHotspot.js`
- Esferas brillantes animadas (como los íconos de target azul de la imagen)
- Flotan y pulsan con animación CSS/shader
- Al acercarse: tooltip con nombre del equipo
- Al hacer clic: abre el panel/modal de producto

---

### 4. Interfaz de Usuario (UI Overlay)

#### [NUEVO] `src/styles/main.css`
- Sistema de diseño completo con variables CSS
- Tema médico premium: blancos, azul Kezelmedica, acentos cyan
- Glassmorphism para paneles sobre el canvas 3D
- Animaciones suaves para modales y transiciones
- Fuente: Inter o Outfit de Google Fonts

#### [NUEVO] `src/ui/WelcomeScreen.js`
- Pantalla inicial con logo Kezelmedica
- **🔧 Ajuste:** `imagen (14).png` pesa 3.3MB — comprimir/convertir a WebP (~200-400KB) antes de usarla como fondo para no penalizar el tiempo de carga inicial.
- Renderizado de la imagen isométrica de referencia como fondo
- Botón "Iniciar Recorrido Virtual" premium con animación
- Instrucciones de controles (WASD + Mouse)
- Animación de entrada cinematográfica

#### [NUEVO] `src/ui/LoadingScreen.js`
- Barra de progreso animada durante carga de modelos
- Datos curiosos sobre equipamiento médico mientras carga
- Transición suave al mundo 3D

#### [NUEVO] `src/ui/HUD.js`
- Esquina superior izquierda: Nombre del área actual
- Crosshair central minimalista
- Esquina inferior: controles/teclas disponibles
- Indicador de "Presiona E para interactuar" cuando estás cerca de un hotspot

#### [NUEVO] `src/ui/ProductModal.js`
- Modal glassmorphism que se abre al interactuar con un equipo
- Imagen del producto a la izquierda
- Nombre, marca, descripción a la derecha
- Lista de características con íconos
- Botón "Solicitar Cotización" / "Contactar"
- Animación de entrada/salida suave
- Tecla Escape para cerrar

#### [NUEVO] `src/ui/AreaPanel.js`
- Panel lateral que se desliza al entrar a un área
- Muestra todos los equipos disponibles en esa área
- Grid de tarjetas con imagen miniatura y nombre
- Clic en tarjeta = abre ProductModal

#### [NUEVO] `src/ui/Minimap.js`
- Mini mapa 2D del hospital en esquina inferior derecha
- Muestra posición actual del usuario como punto pulsante
- Áreas coloreadas y etiquetadas
- Click en área del minimap = teletransporte a esa zona

---

### 5. Configuración del Proyecto

#### [NUEVO] `index.html`
- Meta tags SEO optimizados para Kezelmedica
- Open Graph tags para compartir en redes sociales
- Canvas fullscreen para Three.js
- Containers para UI overlay

#### [NUEVO] `package.json`
- Dependencias: `three`, `vite`
- Scripts: `dev`, `build`, `preview`

#### [NUEVO] `vite.config.js`
- Configuración optimizada para assets 3D
- Manejo de archivos GLB/GLTF como assets estáticos

---

## Flujo de Usuario

```
Usuario abre la web
    ↓
Pantalla de Bienvenida (Logo Kezelmedica + Vista isométrica)
    ↓
Click "Iniciar Recorrido"
    ↓
Pantalla de Carga (Carga modelos + texturas)
    ↓
Spawn en Lobby del Hospital (Vista primera persona)
    ↓
Caminar por el hospital (WASD + Mouse)
    ↓
┌──────────────────────────────────┐
│  Entrar a un área (Ej: Quirófano)│
│         ↓                        │
│  Panel lateral aparece           │
│  (Lista de equipos del área)     │
│         ↓                        │
│  Click en hotspot o tarjeta      │
│         ↓                        │
│  Modal de Producto               │
│  (Imagen, descripción, features) │
│         ↓                        │
│  ┌─ Botón Cotizar/Contactar      │
│  └─ Cerrar modal → seguir        │
│     explorando                   │
└──────────────────────────────────┘
    ↓
Click en Minimap → Teletransporte a otra área
    ↓
(Repetir ciclo de exploración)
```

---

## Fases de Desarrollo

### Fase 1 — MVP (Este plan) 🎯
- Hospital procedural con las 15 áreas
- Controles primera persona WASD + mouse
- Colisiones con paredes
- Hotspots interactivos con modales de equipos
- UI premium (HUD, minimap, modales glassmorphism)
- Catálogo de ~50 equipos ejemplo con imágenes generadas
- **🔧 Ajuste — Alcance responsive real:** `PointerLockControls` + WASD es un paradigma de mouse+teclado; no funciona en touch puro (sin teclado, pointer lock se comporta distinto en móvil/tablet). El MVP soporta **desktop y tablet con teclado/mouse externo** (ej. iPad + Magic Keyboard). Controles táctiles (joystick virtual) se dejan para Fase 2 si se requiere soporte táctil real.

### Fase 2 — Mejoras (Futuro)
- Modelos 3D reales de equipos médicos
- Audio ambiental hospitalario
- Sistema de cotización integrado
- Multi-idioma (ES/EN)
- Animaciones de equipos (ventilador girando, monitor con datos)

### Fase 3 — Avanzado (Futuro)
- VR support (WebXR)
- Recorridos guiados automáticos
- Chat en vivo con vendedor
- Integración con CRM Kezelmedica
- Analytics de qué áreas/equipos más visitados

---

## Plan de Verificación

### Tests Automatizados
```bash
npm run dev    # Servidor de desarrollo local
npm run build  # Verificar que el build de producción compile sin errores
```

### Verificación Manual
1. **Navegación:** Verificar que WASD + mouse permite recorrer todo el hospital sin atravesar paredes
2. **Áreas:** Confirmar que las 15 áreas son accesibles y están correctamente etiquetadas
3. **Hotspots:** Verificar que los hotspots brillan, muestran tooltip y abren modal al hacer clic
4. **Modales:** Confirmar que los modales muestran información correcta del equipo por área
5. **Minimap:** Verificar que el minimap refleja posición real y permite teletransporte
6. **Performance:** Mantener >30 FPS en hardware medio (GTX 1060 / integrated graphics)
7. **Responsive:** Verificar en pantallas 1080p, 1440p y tablets

---

> **Tiempo estimado de desarrollo:** ~2-3 sesiones de trabajo intensivo para el MVP funcional. La mayor parte del tiempo se invertirá en la construcción procedural del hospital y la base de datos de equipos.
