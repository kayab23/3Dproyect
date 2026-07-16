# 🏥 Hospital 3D Interactivo - Recorrido Virtual

Un recorrido virtual en primera persona desarrollado con **Three.js** y **Vite**, diseñado para mostrar el equipamiento médico que **Kezelmedica** ofrece en diferentes departamentos hospitalarios.

Este proyecto permite a los clientes, médicos y administradores hospitalarios explorar un hospital simulado en 3D interactivo, ingresando a áreas clave para conocer de cerca las especificaciones y características de cada equipo clínico.

---

## 🚀 Características Clave

*   **Navegación en Primera Persona (Walkthrough):** Explora el hospital libremente usando controles estilo videojuego (`W` `A` `S` `D` + movimiento de mouse).
*   **15 Áreas Especializadas:**
    1.  Ambulancia / Transporte Externo
    2.  Sala de Toco Cirugía
    3.  UCIN / UTIP (Cuidados Intensivos Neonatales/Pediátricos)
    4.  Telemedicina
    5.  Hospitalización
    6.  Hemodiálisis
    7.  Imagenología (Rayos X, Ultrasonido, etc.)
    8.  UCI (Unidad de Cuidados Intensivos)
    9.  Transporte Interno
    10. Quirófano
    11. Urgencias
    12. Terapia Intermedia
    13. Endoscopia
    14. Suministro de Gases Medicinales
    15. Concepción & Gestión de Proyectos
*   **Hotspots Interactivos:** Marcadores tridimensionales pulsantes que, al acercarse o hacer clic, despliegan información detallada de cada equipo médico.
*   **Catálogo de Productos:** Fichas técnicas completas con nombre, categoría, descripción detallada y lista de características principales para cada dispositivo.
*   **Minimapa 2D Interactivo:** Visualiza la posición actual del usuario en tiempo real con la capacidad de teletransportarse instantáneamente a cualquier sala al hacer clic en el mapa.
*   **Sistema de Puertas Deslizantes:** Puertas automáticas que detectan la proximidad del usuario y se abren con transiciones fluidas.
*   **Optimización de Rendimiento:** Carga perezosa (lazy-loading) de recursos por área y administración dinámica de iluminación y sombras para garantizar tasas de refresco fluidas (>30 FPS) en computadoras de oficina o portátiles.

---

## 🛠️ Stack Tecnológico

*   **Motor 3D:** [Three.js](https://threejs.org/) (r170+)
*   **Entorno de Desarrollo & Bundler:** [Vite](https://vite.dev/)
*   **Lenguajes:** HTML5, CSS3 nativo (Glassmorphism), JavaScript (ES6+)
*   **Controles:** `PointerLockControls` de Three.js

---

## 📂 Estructura de Directorios

```
3dproyect/
├── public/                 # Recursos estáticos (modelos 3D, texturas, imágenes)
│   ├── models/             # Modelos 3D GLB/GLTF de equipos
│   └── textures/           # Texturas de pisos y paredes
├── src/
│   ├── main.js             # Punto de entrada de la aplicación
│   ├── core/               # Motores lógicos (Cámara, Renderizado, Controles)
│   │   ├── Engine.js       # Game Loop y configuración de WebGL
│   │   ├── Controls.js     # Controles WASD + mouse y head-bobbing
│   │   ├── CollisionSystem.js # Sistema de colisiones por Raycasting
│   │   └── Lighting.js     # Iluminación optimizada y sombras dinámicas
│   ├── hospital/           # Constructores de geometría del hospital
│   │   ├── FloorPlan.js    # Definición de coordenadas y dimensiones del mapa
│   │   ├── HospitalBuilder.js # Generación procedural de pisos, techos y pasillos
│   │   └── DoorSystem.js   # Puertas automáticas interactivas
│   ├── areas/              # Gestión de áreas y zonas interactivas
│   │   ├── AreaManager.js  # Lógica de detección de posición e iluminación de salas
│   │   └── AreaHotspot.js  # Marcadores 3D flotantes interactivos
│   ├── equipment/          # Lógica del catálogo de equipos
│   │   ├── equipmentData.js # Base de datos del catálogo (especificaciones técnicas)
│   │   └── EquipmentLoader.js # Cargador diferido (lazy loader) de modelos 3D
│   ├── ui/                 # Componentes HTML/CSS interactivos en la interfaz
│   │   ├── HUD.js          # Barra de estado y guías de controles
│   │   ├── Minimap.js      # Canvas del mapa interactivo
│   │   ├── WelcomeScreen.js # Pantalla de inicio con logo e instrucciones
│   │   ├── AreaPanel.js    # Menú lateral deslizante con lista de equipos
│   │   └── ProductModal.js # Ficha técnica flotante con botón de cotización
│   └── styles/
│       └── main.css        # Hoja de estilos con efectos de Glassmorphism
```

---

## 💻 Instalación y Desarrollo Local

### Prerrequisitos
Asegúrate de tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior).

### Pasos de Instalación
1. Clona este repositorio o descarga los archivos:
   ```bash
   git clone https://github.com/kayab23/3Dproyect.git
   cd 3Dproyect
   ```

2. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo local:
   ```bash
   npm run dev
   ```

4. Abre tu navegador en la dirección local indicada (usualmente `http://localhost:5173`).

### Creación del Entorno de Producción
Para compilar y optimizar el proyecto para un servidor web de producción:
```bash
npm run build
```
Los archivos optimizados y listos para subir se generarán en la carpeta `/dist`.

---

## 🎮 Instrucciones de Uso

1. **Iniciar el Tour:** Haz clic en el botón "Iniciar Recorrido" en la pantalla de bienvenida. Esto bloqueará el puntero del mouse para navegación 3D.
2. **Explorar:**
   *   Usa **`W` `A` `S` `D`** o las flechas de dirección del teclado para caminar por los pasillos y entrar a las salas.
   *   Mueve el **mouse** para cambiar la dirección de tu mirada.
   *   Presiona **`Shift`** mientras caminas para correr más rápido.
3. **Interactuar con los Equipos:**
   *   Al acercarte a un hotspot (las esferas celestes flotantes), se mostrará una indicación para interactuar.
   *   Presiona la tecla **`E`** o haz clic directamente sobre la esfera para abrir la ficha técnica.
   *   Revisa la descripción y especificaciones en la ventana flotante. Si lo deseas, puedes solicitar una cotización con el botón correspondiente.
4. **Salir de una Ficha o Pausar:**
   *   Presiona la tecla **`ESC`** en cualquier momento para cerrar fichas de producto, desbloquear el mouse y pausar la exploración.
5. **Teletransporte Rápido:**
   *   Haz clic sobre cualquier sala del **Minimapa** en la esquina inferior derecha para moverte instantáneamente a esa área sin necesidad de caminar.
