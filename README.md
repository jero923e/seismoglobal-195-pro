# SeismoGlobal 195 Pro: 24/7 Early Warning & GIS System 🌍⚡

**Sistema Sismológico Institucional de Alta Precisión, Motor Cartográfico Estilo Google Maps con Carto Voyager, Capa de Fallas Geológicas Activas, Explorador Territorial Multinivel (195 Países, Departamentos, Municipios, Veredas y Casas), Gestor de 4 Ubicaciones Favoritas (Casa, Colegio, Trabajo, Finca), Monitoreo 24/7 en Segundo Plano con Web Worker y Notificación Persistente, Simulacro Sísmico Interactivo y Centro de Supervivencia y Protección Civil de 5 Funciones.**

Listo para producción en **Google Play Store (Android / Capacitor)** y repositorio en **GitHub**.

---

## 🚫 Reglas de Ejecución Estrictas (Zero-Failure Architecture)

1. **CERO DOCKER**:
   - La aplicación se ejecuta de forma 100% nativa con **Node.js**, **Vite**, **React** y **Tailwind CSS**.
   - No requiere ni genera `Dockerfile` ni `docker-compose.yml`. Solo se requiere `npm install` y `npm run dev`.
2. **CERO CÓDIGO INCOMPLETO**:
   - Todos los módulos, servicios, bases de datos y workers están completamente implementados, sin funciones vacías ni `// TODO`.
3. **GARANTÍA DE RENDERIZADO DEL MAPA ESTILO GOOGLE MAPS**:
   - `leaflet/dist/leaflet.css` y `maplibre-gl/dist/maplibre-gl.css` importados en `main.tsx` y `main.jsx`.
   - Dimensiones fijas garantizadas: `h-[680px] w-full relative z-10 rounded-xl overflow-hidden shadow-2xl`.
   - Incorpora invalidación de tamaño automática (`map.invalidateSize()`) tras el montaje y en cada redimensionamiento para evitar cuadros grises o teselas en blanco.

---

## 🏗️ Especificación Técnica de los 7 Módulos

### MÓDULO 1: Motor Nativo de Google Maps + Carto Voyager
**Archivos:** `src/components/GoogleSeismicMap.jsx`, `src/components/GoogleSeismicMap.tsx`, `src/components/GoogleStyleMap.tsx`, `src/config/mapConfig.js`

* **Capas Oficiales de Google Maps (Activas por defecto sin bloqueos):**
  * **Google Maps Calles (Estándar):** `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=es`
  * **Google Maps Satélite Híbrido:** `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=es` (Casas, techos, caminos veredales y nombres de calles).
  * **Google Maps Terreno y Relieve Topográfico:** `https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=es`
* **Capas Carto Voyager:**
  * **Carto Voyager Raster:** `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?clave=${clave}`
  * **Carto Voyager Vectorial GL:** `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json?clave=${clave}`
  * **Modo Táctico Nocturno:** CartoDB Dark Matter para vigilancia nocturna.
* **Profundidad de Zoom y Cinemática:**
  * Zoom profundo desde nivel mundial (zoom 1) hasta nivel de vereda, calle y casa individual (zoom 20).
  * Vuelos cinemáticos suaves (`flyTo`) con animación de acercamiento hacia sismos, fallas o favoritos.
* **Integración con Google Street View y Google Maps:**
  * Cada sismo y cada ubicación favorita incorpora un botón directo para abrir **Google Street View 360°** en el punto exacto:
    `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lng}`
  * Enlace complementario para abrir en **Google Maps** directo para indicaciones y rutas de evacuación.
* **Selector Visual de Capas en Miniatura:**
  * Selector flotante en la esquina inferior izquierda con miniaturas fotorrealistas de cada capa cartográfica.

---

### MÓDULO 2: Ubicaciones Precargadas Listas para Usar: 195 Países, Ciudades, Municipios, Veredas y Favoritos
**Archivos:** `src/data/countries195.js`, `src/data/countries195.ts`, `src/data/preloadedLocations.js`, `src/data/preloadedLocations.ts`, `src/components/FavoriteLocations.jsx`, `src/components/FavoriteLocations.tsx`

* **Catálogo Completo de los 195 Países Soberanos:**
  * Todos los 195 países reconocidos por la ONU con código ISO, bandera, capital, coordenadas geocéntricas (`lat`, `lng`), radio de cobertura en km (`maxradiuskm`), placas tectónicas en contacto, nivel de riesgo sísmico, agencia sismológica oficial y teléfonos de emergencia reales (Policía, Bomberos, Ambulancias, Cruz Roja, Protección Civil).
* **Base Precargada de Departamentos, Municipios y Veredas:**
  * **Colombia:** Antioquia (Medellín, La Estrella con veredas: *Miraflores*, *San José*, *Pueblo Viejo*, *La Tablaza*; Envigado, Rionegro, Murindó), Bogotá D.C. (Sabana y localidades), Santander (*Mesa de Los Santos* - Nido Sísmico de Bucaramanga), Valle del Cauca (Cali), Caldas (Manizales - Volcán Ruiz), Nariño (Pasto - Galeras).
  * **México:** CDMX (Cuauhtémoc, Roma/Condesa), Oaxaca, Guerrero (Acapulco - Brecha de Guerrero), Michoacán, Chiapas.
  * **Chile:** Santiago (Falla de San Ramón), Valparaíso, Concepción (27F), Antofagasta, Coquimbo.
  * **Perú:** Lima (Miraflores / Costa Verde - Silencio sísmico), Arequipa, Cusco, Ica.
  * **Japón:** Tokio (Shinjuku, Chiyoda), Sendai (Miyagi - Tohoku), Kioto, Osaka.
  * **Estados Unidos:** California (San Francisco - Falla San Andrés, Los Ángeles - Northridge), Seattle (Cascadia), Alaska.
  * **España:** Murcia (Lorca - Falla de Alhama), Granada (Andalucía), Madrid.
  * **Buscador Infinito Híbrido:** Búsqueda instantánea en catálogo precargado + búsqueda en tiempo real vía Photon Komoot y Nominatim OpenStreetMap (`zoom=18`) para encontrar cualquier barrio, vereda o casa del mundo.
* **4 Ubicaciones Favoritas Precargadas por Defecto (`isSet: true`):**
  * 🏠 **Mi Casa:** Precargada en La Estrella, Antioquia (Vereda Miraflores, lat: 6.1585, lng: -75.6432).
  * 🎓 **Colegio / Universidad:** Precargada en Medellín, Antioquia (El Poblado / Campus Universitario, lat: 6.2005, lng: -75.5785).
  * 💼 **Trabajo / Oficina:** Precargada en Medellín, Antioquia (Centro Financiero & Alpujarra, lat: 6.2442, lng: -75.5736).
  * 🌿 **Finca / Refugio Rural:** Precargada en La Estrella / Caldas (Vereda Pueblo Viejo / Tablaza, lat: 6.1472, lng: -75.6515).
  * **Cálculo Simultáneo:** Cada una calcula al mismo tiempo la distancia exacta en km al último sismo, la distancia a la falla geológica activa más cercana y el tiempo estimado de llegada (**ETA en segundos**) de la Onda P y Onda S destructiva.

---

### MÓDULO 3: Sistema de Monitoreo Activo 24/7 en Segundo Plano y Barra de Acceso Rápido
**Archivos:** `src/workers/seismicDaemon.js`, `public/sw.js`, `src/components/BackgroundStatusBanner.jsx`, `src/components/BackgroundStatusBanner.tsx`

* **Web Worker Sísmico 24/7 (`seismicDaemon.js`):**
  * Hilo independiente en segundo plano que consulta cada 30 segundos el feed oficial en tiempo real de USGS (`all_hour.geojson`).
  * Compara automáticamente las coordenadas de cada nuevo evento sísmico contra Casa, Colegio, Trabajo y Finca sin congelar la interfaz ni afectar la fluidez de 60 FPS del mapa.
  * Envía mensajes de alerta sísmica temprana de alta prioridad con sonido de sirena.
* **Service Worker Persistente (`public/sw.js`):**
  * Notificación fija de acceso rápido en la barra de estado de Android y PC:
    `🟢 SeismoGlobal 24/7 Activo | Vigilando Casa, Colegio, Trabajo y Finca`
  * Botones de acción rápida dentro de la notificación para no tener que buscar el icono de la app:
    * `🚨 Alarma SOS` -> Abre de inmediato el Centro de Supervivencia y silbato.
    * `🗺️ Ver Epicentro` -> Abre directamente el mapa Google Maps centrado en el sismo.
* **Modo Centinela Nocturno (`navigator.wakeLock`):**
  * Mantiene la pantalla y los sensores del acelerómetro activos durante toda la noche mientras el celular se carga en la mesa de noche, convirtiendo el dispositivo en una estación sismográfica continua.
* **Banner Institucional 24/7 (`BackgroundStatusBanner.jsx`):**
  * Indicador de pulso verde en vivo, hora del último escaneo USGS, botón para fijar la notificación en la barra de estado, interruptor del Modo Centinela y botón de prueba sonora de la sirena sísmica.

---

### MÓDULO 4: Mapa de Fallas Geológicas Activas por Municipio y Vereda
**Archivos:** `src/services/faultsService.js`, `src/services/faultsService.ts`

* **Trazados Georreferenciados:**
  * **Sistema de Fallas de Romeral** (Colombia).
  * **Sistema de Fallas Cauca-Almaguer** (Colombia).
  * **Falla Activa de Murindó - Atrato** (Antioquia / Chocó).
  * **Falla Frontal de la Cordillera Oriental** (Colombia / Venezuela).
  * **Falla de Boconó** (Venezuela).
  * **Falla de San Andrés** (California, EE. UU.).
  * **Zona de Subducción Megathrust Nazca - Sudamérica** (Chile, Perú, Ecuador, Colombia).
  * **Zona de Subducción Cascadia** (Pacífico Noroeste).
  * **Fosa Mesoamericana** (México y Centroamérica).
  * **Fosa de Japón y Nankai** (Japón).
  * **Falla del Norte de Anatolia** (Turquía).
  * **Falla de Alhama de Murcia y Fallas Béticas** (España).
  * **Cinturón de Fuego del Pacífico** (*Ring of Fire*).
* **Interacción Geodésica:**
  * Al pulsar cualquier falla geológica en el mapa o seleccionar una vereda/municipio, se despliega la ficha técnica con:
    * Nombre de la falla y región.
    * Tipo de movimiento tectónico (Inversa/Cabalgamiento, Rumbo Dextral/Sinistral, Subducción).
    * Potencial de magnitud máxima esperada (Mw).
    * Tasa de desplazamiento anual en mm/año.
    * **Distancias exactas en km** calculadas simultáneamente a Casa, Colegio, Trabajo y Finca.

---

### MÓDULO 5: Clasificador de Magnitud, Sismos Principales, Réplicas y Exportación a Excel/CSV
**Archivos:** `src/utils/seismicClassifier.js`, `src/utils/seismicClassifier.ts`, `src/utils/excelExporter.js`, `src/utils/excelExporter.ts`

* **Clasificador Espacio-Temporal:**
  * Algoritmo sismológico que analiza la ventana espacio-temporal (radio de 100 km y ventana de 14 días) para distinguir con precisión matemática cada **Sismo Principal (Mainshock)** de sus **Réplicas (Aftershocks)**.
  * Cálculo de Intensidad Mercalli Modificada (MMI I a XII) basada en la ley de atenuación de aceleración pico del terreno (PGA).
  * Desglose geográfico detallado: país, municipio, vereda y profundidad (superficial < 70 km, intermedio 70-300 km, profundo > 300 km).
* **Exportador Oficial a Excel / CSV:**
  * Descarga instantánea con codificación **UTF-8 BOM (`\uFEFF`)** y separador `;` para apertura directa y limpia en **Microsoft Excel** sin errores de caracteres con tildes o eñes.
  * Incluye todas las columnas: ID de evento, clasificación sísmica, número de réplicas, fecha UTC y hora local, lugar, magnitud, profundidad, intensidad Mercalli, coordenadas del epicentro, distancia a capital, distancia a **Mi Casa**, distancia a **Colegio**, distancia a **Trabajo**, distancia a **Finca**, falla geológica más cercana y enlace oficial al USGS.

---

### MÓDULO 6: Botón de "Simulacro Sísmico" + Las 5 Funciones de Emergencia y Recomendaciones
**Archivos:** `src/components/SeismicDrillModal.jsx`, `src/components/SeismicDrillModal.tsx`, `src/components/EmergencyCenter.jsx`, `src/components/EmergencyCenter.tsx`

* **Botón Destacado "🚨 SIMULACRO SÍSMICO":**
  * Dispara una simulación hiperrealista en la falla geológica más próxima a la Casa o Colegio del usuario.
  * Sirena acústica oficial de alerta sísmica sintetizada con **Web Audio API**.
  * Visualización cartográfica en Google Maps de los anillos de propagación en tiempo real:
    * **Onda P (amarillo, $\approx 6.0\text{ km/s}$)**: Onda primaria no destructiva.
    * **Onda S destructiva (rojo, $\approx 3.5\text{ km/s}$)**: Onda secundaria de corte.
  * Cuenta regresiva en segundos (ETA) antes del arribo del tren de ondas destructivas al objetivo.
  * Checklist interactivo de protección civil durante el simulacro y evaluación final con puntaje.
* **Las 5 Funciones de Supervivencia y Protección Civil:**
  1. **Función 1 (Protocolo Paso a Paso y Asistente de Voz en Vivo):** Guía táctica para ANTES, DURANTE y DESPUÉS en 5 contextos (Casa, Edificio, Colegio/Trabajo, Finca/Sector Rural, Calle) con lectura automática por voz (`window.speechSynthesis`) que transmite calma y dicta las acciones de resguardo.
  2. **Función 2 (Kit SOS de Rescate):**
     * **Silbato ultrasónico de alta penetración a 3000 Hz** (frecuencia óptima para atravesar losas de concreto y escombros sin desgastar las cuerdas vocales).
     * **Luz estroboscópica SOS** en código Morse internacional (`... --- ...`).
     * **Botón "Estoy a Salvo"** que redacta y comparte por WhatsApp o SMS el reporte con las coordenadas exactas, país, municipio, vereda y enlace de Google Maps a los contactos de emergencia.
  3. **Función 3 (Radar de Ondas P y S con ETA en Vivo):** Radar geofísico que calcula la llegada de ondas hacia Casa, Colegio, Trabajo y Finca.
  4. **Función 4 (Evaluador de Daño Estructural Post-Sismo):** Test de ingeniería civil de 6 puntos críticos (columnas, muros de carga, grietas a 45°, losas, fugas de gas) con diagnóstico semafórico de habitabilidad (Verde: Habitable, Amarillo: Precaución ante réplicas, Rojo: Evacuación inmediata).
  5. **Función 5 (Mochila de Emergencia 72 Horas + Directorio Telefónico de los 195 Países):** Checklist persistente en dispositivo con 18 insumos vitales y directorio telefónico con botones de marcado directo (`tel:...`) para los cuerpos de rescate del país activo.

---

### MÓDULO 7: Las 6 Nuevas Funciones Avanzadas de Prevención & Emergencias (v2.0)
**Archivos:** `src/components/CommunityReports.tsx` (`.jsx`), `src/components/EvacuationRoutes.tsx` (`.jsx`), `src/components/VulnerabilityCalculator.tsx` (`.jsx`), `src/components/SecondaryHazards.tsx` (`.jsx`), `src/components/FamilySafetyCircle.tsx` (`.jsx`), `src/components/SurvivalTrainer.tsx` (`.jsx`)

1. **📢 Módulo "¿Sentiste un Temblor?" y Mapa de Intensidad Comunitaria (`CommunityReports`):**
   * Formulario interactivo rápido para reportar sismos percibidos por País, Municipio y Vereda/Barrio.
   * Escala de Intensidad de Mercalli Modificada (MMI): II (Débil), IV (Moderado), VI (Fuerte), VIII (Severo).
   * Efectos observados seleccionables (lámparas, ventanas, corte de energía, caída de objetos, grietas, animales).
   * Almacenamiento local persistente (`localStorage`) y visor de reportes ciudadanos en tiempo real.
2. **🌳 Puntos de Encuentro y Rutas Seguras (`EvacuationRoutes`):**
   * Asignación de puntos de encuentro seguros (parques, canchas abiertas, potreros) para cada ubicación favorita (Casa, Colegio, Trabajo, Finca).
   * Cálculo geodésico exacto de distancia en metros y tiempo estimado de evacuación caminando y corriendo.
   * Editor interactivo de coordenadas y nombres de puntos seguros con persistencia local.
3. **🏗️ Calculadora de Vulnerabilidad Sísmica de Edificaciones (`VulnerabilityCalculator`):**
   * Evaluación estructural preventiva en 5 parámetros técnicos: época de construcción (pre-1984, 1984-1998, 1998-2010, post-2010), tipo de estructura (concreto, mampostería confinada, adobe/bahareque, metálica), topografía y suelo (plano, ladera, blando), niveles e irregularidades (piso blando) y distancia a falla geológica activa.
   * Cálculo del Índice de Riesgo Estructural (0% a 100%) con barra visual graduada y recomendaciones específicas de reforzamiento antisísmico.
4. **⚠️ Monitor de Amenazas Secundarias (`SecondaryHazards`):**
   * **Riesgo de Deslizamiento / Remoción en Masa:** Clasificación heurística (Bajo, Moderado, Alto, Crítico) basada en magnitud, profundidad y geografía montañosa.
   * **Evaluador de Alerta de Tsunami:** Diagnóstico basado en epicentro oceánico, profundidad superficial (< 70 km) y magnitud (Mw ≥ 6.5) según protocolos PTWC / NOAA.
   * **Catálogo de 14 Volcanes Activos:** Semáforo de alerta volcánica oficial (Verde, Amarillo, Naranja, Rojo) y estado de actividad de volcanes mundiales (Nevado del Ruiz, Popocatépetl, Villarrica, Cotopaxi, Etna, Kilauea, etc.).
5. **👨‍👩‍👧‍👦 Red Familiar "Círculo Seguro" (`FamilySafetyCircle`):**
   * Directorio familiar de emergencia con nombre, parentesco, teléfono y ubicación habitual.
   * Actualización de estado en 1 clic: 🟢 A Salvo, 🟡 En camino al punto de encuentro, 🔴 Necesita asistencia.
   * Botón directo para compartir el consolidado familiar por WhatsApp con un solo toque.
6. **🧠 Entrenador Interactivo de Decisiones Rápidas (`SurvivalTrainer`):**
   * 6 escenarios sísmicos de la vida real (laboratorio de colegio con mecheros, ascensor bloqueado, vereda con riesgo de derrumbe, cama a medianoche, centro comercial concurrido, carretera a alta velocidad).
   * Opciones múltiples con explicaciones científicas de protección civil basadas en manuales oficiales.
   * Sistema de puntuación, medallas e insignias ("Experto en Supervivencia Sísmica", "Ciudadano Preparado").

---

### MÓDULO 8: Preparación para Google Play Store (Android/PWA) y Repositorio GitHub
**Archivos:** `public/manifest.json`, `capacitor.config.json`, `.gitignore`, `README.md`

---

## 💻 Instalación y Ejecución Local Nativa (Sin Docker)

### Requisitos
* **Node.js**: v18.0.0 o superior (compatible con Node 20 y Node 22).
* **npm**: v9.0.0 o superior.

### Paso 1: Clonar o abrir el proyecto
```bash
cd SMO
```

### Paso 2: Instalar dependencias
```bash
npm install
```

### Paso 3: Iniciar servidor de desarrollo
```bash
npm run dev
```
La aplicación iniciará en segundos en `http://localhost:5173/`.

### Paso 4: Validar compilación de producción
```bash
npm run build
```
Generará el bundle optimizado en la carpeta `dist/` con cero errores de TypeScript.

---

## 🐙 Guía Paso a Paso: Subir el Proyecto a GitHub

Sigue estos comandos en tu terminal (PowerShell o Git Bash) desde la carpeta del proyecto:

### 1. Inicializar el repositorio Git local
```bash
git init
```

### 2. Configurar tu identidad en Git (si no lo has hecho antes)
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
```

### 3. Agregar todos los archivos al área de preparación (staging)
```bash
git add .
```

### 4. Crear el commit inicial
```bash
git commit -m "feat: SeismoGlobal 195 Pro - Sistema Sismológico 24/7 & GIS listo para Play Store"
```

### 5. Crear el repositorio en GitHub
1. Ingresa a [github.com](https://github.com/) e inicia sesión.
2. Haz clic en **New repository** (Nuevo repositorio).
3. Nómbralo: `seismoglobal-195-pro`.
4. Elige si será **Public** (Público) o **Private** (Privado).
5. **No marques** "Initialize this repository with a README" (ya lo tenemos creado).
6. Haz clic en **Create repository**.

### 6. Vincular el repositorio remoto y subir el código
Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub:
```bash
git branch -M main
git remote add origin https://github.com/TU_USUARIO/seismoglobal-195-pro.git
git push -u origin main
```
¡Listo! Todo tu proyecto estará publicado en GitHub con su documentación completa.

---

## 📱 Guía Paso a Paso: Compilar `.aab` / `.apk` y Publicar en Google Play Store

La aplicación está completamente arquitecturada para ser empaquetada como una app nativa Android mediante **Capacitor** o como una **PWA / TWA** con PWABuilder.

### Método A: Compilación Nativa con Capacitor & Android Studio (Recomendado)

#### 1. Instalar dependencias de Capacitor
Ejecuta en la raíz del proyecto:
```bash
npm install @capacitor/core @capacitor/android @capacitor/cli @capacitor/local-notifications @capacitor/geolocation
```

#### 2. Compilar el bundle web
```bash
npm run build
```

#### 3. Inicializar y agregar la plataforma Android
```bash
npx cap add android
```
Esto creará el directorio nativo `android/` con todo el proyecto Gradle y el `AndroidManifest.xml`.

#### 4. Copiar los archivos compilados y sincronizar plugins
```bash
npx cap copy
npx cap sync
```

#### 5. Verificar los Permisos en `android/app/src/main/AndroidManifest.xml`
Asegúrate de que incluya los siguientes permisos para garantizar la ejecución 24/7 en segundo plano y el GPS:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

#### 6. Abrir en Android Studio
```bash
npx cap open android
```

#### 7. Generar el paquete firmado (`.aab`) para Google Play Store
1. En Android Studio, espera a que termine la sincronización de Gradle.
2. Ve al menú superior: **Build > Generate Signed Bundle / APK...**
3. Selecciona **Android App Bundle (.aab)** y pulsa **Next**.
4. Selecciona tu almacén de claves (*Key store path*) o pulsa **Create new...** para crear una nueva clave de firma `.jks` (guarda muy bien la contraseña).
5. Selecciona la variante de compilación: **release**.
6. Haz clic en **Finish**.
7. Android Studio compilará el archivo final en:
   `android/app/release/app-release.aab`.

#### 8. Subir a Google Play Console
1. Ingresa a [play.google.com/console](https://play.google.com/console).
2. Crea tu aplicación con el nombre **SeismoGlobal 195 Pro**.
3. En la sección **Producción** (o Pruebas Internas/Cerradas), crea una nueva versión y sube el archivo `app-release.aab`.
4. Completa la ficha de la tienda (descripción, capturas de pantalla, icono, política de privacidad).
5. Envía la aplicación a revisión de Google.

---

### Método B: Generación Exprés vía PWABuilder (TWA)
Si prefieres no usar Android Studio:
1. Despliega la aplicación web en un hosting HTTPS gratuito como Vercel o Netlify (`npm run build`).
2. Ingresa a [PWABuilder.com](https://www.pwabuilder.com/).
3. Ingresa la URL de tu aplicación desplegada.
4. PWABuilder validará el `manifest.json` y el `sw.js` (ambos ya están al 100% compatibles).
5. Haz clic en **Package for Android** para descargar directamente el paquete `.aab` firmado listo para subir a Google Play Store.

---

## 🏛️ Fuentes de Datos Oficiales y Licencias
* **Sismología Global:** United States Geological Survey (USGS) Earthquake Hazards Program — FDSN Event Web Service (Open Access).
* **Cartografía Oficial:** Google Maps Tiles / Carto Voyager Open Basemaps / Esri World Imagery / OpenStreetMap.
* **Geocodificación Granular:** Komoot Photon Geocoder & OpenStreetMap Nominatim.
* **Normativas de Protección Civil:** FEMA, Cruz Roja Internacional, guías sismológicas de INPRES, SGC, SSN y JMA.

Desarrollado para proteger vidas en los 195 países del planeta las 24 horas del día, los 7 días de la semana.
