# 🎨 WebDiffusion Studio

> Un "ComfyUI" que se ejecuta 100% en el navegador - Generación de imágenes con IA sin instalaciones.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![WebGPU](https://img.shields.io/badge/WebGPU-Ready-orange)

<p align="center">
  <img src="docs/screenshot.png" alt="WebDiffusion Studio Screenshot" width="800">
</p>

## ✨ Características

- 🖼️ **Interfaz Visual de Nodos** - Arrastra, conecta y configura como en ComfyUI
- 🚀 **Sin Instalación** - Solo abre la URL y empieza a crear
- 🔒 **Privacidad Total** - Tu data nunca sale de tu navegador*
- ⚡ **WebGPU Ready** - Preparado para aceleración GPU local
- 📱 **Responsive** - Funciona en desktop y tablets

> *Actualmente usa Pollinations.ai para generación. WebGPU local coming soon.

## 🚀 Quick Start

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/Web-ComfyUI.git
cd Web-ComfyUI

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Abrir http://localhost:5173
```

## 🎯 Uso

1. **Configura el Prompt** - Escribe lo que quieres generar en el nodo "Text Prompt"
2. **Selecciona Modelo** - Elige entre SD 1.5, SD Turbo o SDXL en "Model Loader"
3. **Ajusta Parámetros** - Steps, CFG Scale, dimensiones en "Run Inference"
4. **Genera** - Click en el botón naranja "Generate"
5. **Descarga** - Tu imagen aparecerá en "Image Output" lista para descargar

## 🧩 Nodos Disponibles

| Nodo | Descripción |
|------|-------------|
| 📝 **Text Prompt** | Entrada de prompt positivo y negativo |
| 📦 **Model Loader** | Selector de modelo de IA |
| ⚙️ **Run Inference** | Configuración y ejecución de generación |
| 🖼️ **Image Output** | Visualización y descarga de resultado |

## 🛠️ Stack Tecnológico

- **React 18** + Vite 5
- **@xyflow/react** (React Flow) - Motor de nodos
- **Tailwind CSS** - Estilos
- **Lucide React** - Iconos
- **Web Workers** - Procesamiento no-bloqueante
- **Pollinations.ai** - API de generación (temporal)

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── nodes/           # Nodos personalizados
│   │   ├── PromptNode.jsx
│   │   ├── ModelLoaderNode.jsx
│   │   ├── InferenceNode.jsx
│   │   └── ImageDisplayNode.jsx
│   ├── Sidebar.jsx      # Panel lateral
│   ├── Toolbar.jsx      # Barra superior
│   └── StatusBar.jsx    # Barra de estado
├── workers/
│   └── inference.worker.js  # Web Worker para IA
├── store/
│   └── useStore.jsx     # Estado global
├── hooks/
│   └── useWebGPU.jsx    # Detección WebGPU
├── App.jsx              # Componente principal
└── main.jsx             # Entry point
```

## 🗺️ Roadmap

Ver [ROADMAP.md](./ROADMAP.md) para el plan completo de desarrollo.

### Próximas Features (Fase 2)
- [ ] Galería de imágenes generadas
- [ ] Caché de modelos con OPFS
- [ ] Img2Img
- [ ] Más modelos

### Futuro (Fase 3-4)
- [ ] Generación 100% local con WebGPU
- [ ] Soporte LoRA
- [ ] PWA instalable
- [ ] ControlNet

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

- [React Flow](https://reactflow.dev/) - Motor de nodos
- [Hugging Face](https://huggingface.co/) - Modelos de IA
- [Pollinations.ai](https://pollinations.ai/) - API de generación gratuita
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS

---

<p align="center">
  Hecho con ❤️ para democratizar la IA generativa
</p>
