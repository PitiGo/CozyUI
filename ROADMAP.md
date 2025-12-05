# 🗺️ CozyUI - Roadmap

> Documento de seguimiento del desarrollo y mejoras futuras

---

## 📊 Estado Actual: MVP v0.1.0 ✅

**Fecha de completación:** Diciembre 2024

### ✅ Funcionalidades Implementadas

| Feature | Estado | Descripción |
|---------|--------|-------------|
| Canvas de Nodos | ✅ Completo | React Flow con lienzo infinito, zoom, pan |
| Nodo Text Prompt | ✅ Completo | Input de prompt positivo y negativo |
| Nodo Model Loader | ✅ Completo | Selector de modelos (SD 1.5, SD Turbo, SDXL) |
| Nodo Run Inference | ✅ Completo | Controles de Steps, CFG, dimensiones, seed |
| Nodo Image Output | ✅ Completo | Visualización y descarga de imagen |
| Conexiones Animadas | ✅ Completo | Cables visuales entre nodos |
| Web Worker | ✅ Completo | Inferencia en hilo separado |
| Detección WebGPU | ✅ Completo | Verificación de soporte GPU |
| UI Moderna | ✅ Completo | Tema oscuro, Tailwind CSS |
| Generación de Imágenes | ✅ Completo | Via Pollinations.ai API |

### ⚠️ Limitaciones Actuales

1. **Generación remota**: Usa Pollinations.ai (API externa) en lugar de WebGPU local
2. **Sin persistencia**: Las imágenes se pierden al recargar la página
3. **Sin galería**: No hay historial de imágenes generadas
4. **Modelos limitados**: Solo 3 modelos preconfigurados

---

## 🚀 Fase 2: Experiencia de Usuario (UX)

**Prioridad:** Alta  
**Estimación:** 2-3 semanas

### 📋 Tareas Pendientes

- [ ] **Sistema OPFS (Origin Private File System)**
  - Caché persistente de modelos descargados
  - Gestor visual para ver/eliminar modelos guardados
  - Indicador de espacio utilizado

- [ ] **Galería de Imágenes**
  - Historial de imágenes generadas en la sesión
  - Persistencia en localStorage/IndexedDB
  - Metadatos: prompt, seed, modelo usado
  - Exportar galería como ZIP

- [ ] **Barras de Progreso Mejoradas**
  - Progreso real durante descarga de modelos
  - Estimación de tiempo restante
  - Cancelación de generación

- [ ] **Mejoras de UI**
  - Notificaciones toast para errores/éxitos
  - Modo pantalla completa para el canvas
  - Atajos de teclado (Ctrl+Enter = generar)
  - Temas claros/oscuros

### 🎯 Criterios de Aceptación Fase 2

- [ ] Usuario puede ver qué modelos tiene en caché
- [ ] Usuario puede ver historial de últimas 50 imágenes
- [ ] Progreso de descarga muestra porcentaje real
- [ ] UI responde correctamente en móviles

---

## 🔧 Fase 3: Funcionalidades Avanzadas

**Prioridad:** Media  
**Estimación:** 3-4 semanas

### 📋 Tareas Pendientes

- [ ] **Nuevos Nodos Lógicos**
  - Nodo Seed (generador de semillas)
  - Nodo Scheduler (diferentes samplers)
  - Nodo Image Resize
  - Nodo Batch (múltiples imágenes)

- [ ] **Img2Img**
  - Nodo para subir imagen base
  - Control de "denoising strength"
  - Soporte drag & drop de imágenes

- [ ] **Importación de Modelos**
  - Subir archivos .onnx desde el PC
  - Convertidor de .safetensors (guía/herramienta)
  - Librería curada de modelos convertidos

- [ ] **Presets de Workflows**
  - Guardar configuraciones de nodos
  - Exportar/importar workflows como JSON
  - Plantillas predefinidas

### 🎯 Criterios de Aceptación Fase 3

- [ ] Usuario puede hacer Img2Img básico
- [ ] Usuario puede guardar y cargar workflows
- [ ] Al menos 5 modelos adicionales disponibles

---

## ⚡ Fase 4: Optimización y WebGPU Local

**Prioridad:** Media-Baja (depende de madurez de WebGPU)  
**Estimación:** 4-6 semanas

### 📋 Tareas Pendientes

- [ ] **Migración a WebGPU Local**
  - Implementar Transformers.js con text-to-image cuando esté disponible
  - O usar WebSD/diffusers.js como alternativa
  - Fallback automático a API si WebGPU no disponible

- [ ] **Soporte LoRA**
  - Fusión de LoRAs en modelos base
  - UI para seleccionar múltiples LoRAs
  - Peso ajustable por LoRA

- [ ] **Optimizaciones de Rendimiento**
  - Cuantización de modelos (q4, q8)
  - Streaming de inferencia
  - Caché de embeddings de texto

- [ ] **PWA Completa**
  - Service Worker para offline
  - Instalable como app
  - Sincronización en background

### 🎯 Criterios de Aceptación Fase 4

- [ ] Generación funciona 100% offline con modelos cacheados
- [ ] Tiempo de generación < 30s en GPU moderna
- [ ] App instalable desde Chrome/Edge

---

## 🐛 Bugs Conocidos

| Bug | Severidad | Estado |
|-----|-----------|--------|
| Sliders no muestran valor actual visualmente | Baja | Pendiente |
| MiniMap no actualiza colores al conectar | Baja | Pendiente |
| Warnings de accesibilidad en consola | Baja | Pendiente |

---

## 💡 Ideas Futuras (Backlog)

- [ ] Integración con ComfyUI (importar workflows)
- [ ] Modo colaborativo (múltiples usuarios)
- [ ] Generación de video (AnimateDiff)
- [ ] Upscaling con Real-ESRGAN
- [ ] Inpainting/Outpainting
- [ ] ControlNet (pose, depth, canny)
- [ ] Integración con APIs de pago (Replicate, RunPod)
- [ ] Plugin system para nodos custom

---

## 📝 Notas Técnicas

### Stack Actual
- **Frontend**: React 18 + Vite 5
- **UI**: Tailwind CSS 3
- **Nodos**: @xyflow/react (React Flow)
- **Iconos**: Lucide React
- **IA**: Pollinations.ai API (temporal)

### Dependencias Futuras Posibles
- `@xenova/transformers` - Para WebGPU local
- `idb` - IndexedDB wrapper para galería
- `workbox` - PWA/Service Worker
- `zustand` - Estado global (alternativa a Context)

### Requisitos del Navegador
- Chrome 113+ / Edge 113+ (WebGPU)
- Firefox 118+ (WebGPU experimental)
- Safari 17+ (WebGPU parcial)

---

## 📅 Changelog

### v0.1.0 (Diciembre 2024)
- 🎉 Release inicial del MVP
- ✨ Canvas de nodos con React Flow
- ✨ 4 nodos básicos (Prompt, Model, Inference, Output)
- ✨ Generación de imágenes via Pollinations.ai
- ✨ UI moderna con tema oscuro
- ✨ Detección de WebGPU
- ✨ Web Worker para inferencia no-bloqueante

---

## 🤝 Contribuciones

Para contribuir al proyecto:

1. Fork del repositorio
2. Crear branch: `feature/nombre-feature`
3. Commits descriptivos
4. Pull Request con descripción detallada

### Áreas donde se necesita ayuda:
- Testing en diferentes navegadores/GPUs
- Conversión de modelos a ONNX
- Documentación y tutoriales
- Diseño UI/UX
- Optimización de rendimiento

---

*Última actualización: Diciembre 2024*

