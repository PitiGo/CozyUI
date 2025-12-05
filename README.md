# 🏠 CozyUI

> **ComfyUI es potente, pero CozyUI es... acogedor** ✨

Un "ComfyUI" que se ejecuta 100% en el navegador - Generación de imágenes con IA sin instalaciones, sin configuración, sin complicaciones.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![WebGPU](https://img.shields.io/badge/WebGPU-Ready-orange)

<p align="center">
  <img src="docs/screenshot.png" alt="CozyUI Screenshot" width="800">
</p>

## ✨ ¿Por qué CozyUI?

**ComfyUI** es increíblemente potente, pero requiere instalación, configuración y una curva de aprendizaje. **CozyUI** mantiene la misma filosofía de nodos visuales, pero:

- 🏠 **Acogedor** - Sin instalaciones, solo abre y usa
- 🌐 **Web-Native** - Funciona en cualquier navegador moderno
- ⚡ **Ligero** - No necesitas GPU local (por ahora)
- 🎨 **Familiar** - Si conoces ComfyUI, ya sabes usar CozyUI

## 🚀 Quick Start

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/CozyUI.git
cd CozyUI

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Abrir http://localhost:5173
```

¡Eso es todo! No necesitas instalar Python, CUDA, o nada más.

## ✨ Características

- 🖼️ **Interfaz Visual de Nodos** - Arrastra, conecta y configura como en ComfyUI
- 🚀 **Sin Instalación** - Solo abre la URL y empieza a crear
- 🔒 **Privacidad Total** - Tu data nunca sale de tu navegador*
- ⚡ **WebGPU Ready** - Preparado para aceleración GPU local
- 📱 **Responsive** - Funciona en desktop y tablets
- 🎨 **Image to Image** - Transforma imágenes existentes
- 🌱 **Seed Control** - Control total sobre la aleatoriedad
- 📦 **Workflow Presets** - Plantillas predefinidas para empezar rápido
- 💾 **Export/Import** - Guarda y comparte tus workflows

> *Actualmente usa Pollinations.ai para generación. WebGPU local coming soon.

## 🎯 Uso

1. **Configura el Prompt** - Escribe lo que quieres generar en el nodo "Text Prompt"
2. **Selecciona Modelo** - Elige entre SD 1.5, SD Turbo o SDXL en "Model Loader"
3. **Ajusta Parámetros** - Steps, CFG Scale, dimensiones en "Run Inference"
4. **Genera** - Click en el botón naranja "Generate"
5. **Descarga** - Tu imagen aparecerá en "Image Output" lista para descargar

### 🖼️ Image to Image

1. Arrastra una imagen desde la galería al nodo "Image to Image"
2. Ajusta el "Denoising Strength" (0 = sutil, 1 = creativo)
3. Conecta el nodo al workflow y genera

## 🧩 Nodos Disponibles

### Básicos
| Nodo | Descripción |
|------|-------------|
| 📝 **Text Prompt** | Entrada de prompt positivo y negativo |
| 📦 **Model Loader** | Selector de modelo de IA |
| ⚙️ **Run Inference** | Configuración y ejecución de generación |
| 🖼️ **Image Output** | Visualización y descarga de resultado |

### Avanzados
| Nodo | Descripción |
|------|-------------|
| 🖼️ **Image to Image** | Transforma imágenes existentes con drag & drop |
| 🎲 **Seed Generator** | Control de semillas para resultados reproducibles |
| 📐 **Image Resize** | Redimensiona imágenes con presets o valores personalizados |

## 🛠️ Stack Tecnológico

- **React 19** + Vite 5 - Framework y build tool
- **@xyflow/react** (React Flow) - Motor de nodos visuales
- **Tailwind CSS** - Estilos modernos
- **Lucide React** - Iconos elegantes
- **Web Workers** - Procesamiento no-bloqueante
- **Zustand** - Estado global ligero
- **Pollinations.ai** - API de generación (temporal)

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── nodes/           # Nodos personalizados
│   │   ├── PromptNode.jsx
│   │   ├── ModelLoaderNode.jsx
│   │   ├── InferenceNode.jsx
│   │   ├── ImageDisplayNode.jsx
│   │   ├── Img2ImgNode.jsx
│   │   ├── SeedNode.jsx
│   │   └── ImageResizeNode.jsx
│   ├── Sidebar.jsx      # Panel lateral
│   ├── Toolbar.jsx      # Barra superior
│   ├── StatusBar.jsx    # Barra de estado
│   └── Gallery.jsx      # Galería de imágenes
├── workers/
│   └── inference.worker.js  # Web Worker para IA
├── store/
│   └── useStore.jsx     # Estado global (Zustand)
├── hooks/
│   ├── useWebGPU.jsx    # Detección WebGPU
│   ├── useGallery.jsx   # Gestión de galería
│   ├── useToast.jsx     # Notificaciones
│   └── useWorkflow.jsx  # Export/Import workflows
├── App.jsx              # Componente principal
└── main.jsx             # Entry point
```

## 🗺️ Roadmap

Ver [ROADMAP.md](./ROADMAP.md) para el plan completo de desarrollo.

### ✅ Completado (MVP + Fase 3)
- [x] Interfaz de nodos visuales
- [x] Text-to-image generation
- [x] Image to Image con drag & drop
- [x] Seed generator
- [x] Image resize
- [x] Workflow export/import
- [x] Presets de workflows
- [x] Galería de imágenes

### 🚧 Próximas Features (Fase 2)
- [ ] Caché de modelos con OPFS
- [ ] Más modelos disponibles
- [ ] Mejoras de UX y animaciones

### 🔮 Futuro (Fase 3-4)
- [ ] Generación 100% local con WebGPU
- [ ] Soporte LoRA
- [ ] PWA instalable
- [ ] ControlNet
- [ ] Inpainting
- [ ] Upscaling

## 🌐 Compatibilidad

| Navegador | Soporte | WebGPU |
|-----------|---------|--------|
| Chrome 113+ | ✅ | ✅ |
| Edge 113+ | ✅ | ✅ |
| Firefox 118+ | ✅ | ⚠️ Experimental |
| Safari 17+ | ✅ | ⚠️ Parcial |

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! 

1. Fork el proyecto
2. Crea tu branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Distribuido bajo la licencia MIT. Ver `LICENSE` para más información.

## 🙏 Agradecimientos

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - La inspiración original
- [React Flow](https://reactflow.dev/) - Motor de nodos
- [Hugging Face](https://huggingface.co/) - Modelos de IA
- [Pollinations.ai](https://pollinations.ai/) - API de generación gratuita
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS

---

<p align="center">
  Hecho con ❤️ para hacer la IA generativa más accesible
</p>

<p align="center">
  <strong>ComfyUI es potente. CozyUI es acogedor. ✨</strong>
</p>
