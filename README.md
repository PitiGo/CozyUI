# CozyUI

> **ComfyUI is powerful, but CozyUI is... cozy**

A node-based AI image generation studio that runs **100% in the browser** — no servers, no APIs, no installations. Models run locally on your GPU via WebGPU.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![WebGPU](https://img.shields.io/badge/WebGPU-100%25_Local-orange)

## Why CozyUI?

**ComfyUI** is incredibly powerful, but it requires Python, CUDA, and configuration. **CozyUI** maintains the same visual node philosophy, but:

- **100% Local** — All inference runs in your browser via WebGPU. No data leaves your machine.
- **Zero Installation** — `npm install && npm run dev`. That's it.
- **Web-Native** — Works in Chrome/Edge 113+. No Python, no CUDA, no Docker.
- **Familiar** — If you know ComfyUI, you already know CozyUI.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/PitiGo/CozyUI.git
cd CozyUI

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### Requirements

- **Browser**: Chrome 113+ or Edge 113+ (WebGPU required)
- **GPU**: Any GPU with WebGPU support (integrated GPUs work, dedicated recommended)
- **RAM**: 8 GB minimum (16 GB recommended for SD-Turbo)
- **Disk**: ~2-3 GB free for model cache (persisted in Browser Cache Storage)

## Available Models

| Model | Size | Type | Backend |
|-------|------|------|---------|
| **SD-Turbo** | ~1.7 GB | Text-to-Image (1-step diffusion) | ONNX Runtime Web + WebGPU |
| **Janus-Pro 1B** | ~1.5 GB | Text-to-Image (multimodal) | Transformers.js + WebGPU |
| **Image Enhancer 2x** | ~50 MB | Super-Resolution | Transformers.js + WebGPU |

Models are downloaded once and cached in the browser's Cache Storage API. Subsequent loads are instant.

## Features

### Core
- **Visual Node Interface** — Drag, connect, and configure nodes just like ComfyUI
- **100% Local Generation** — SD-Turbo and Janus-Pro run entirely in your browser
- **WebGPU Acceleration** — GPU-accelerated inference with no server needed
- **Complete Privacy** — Your prompts and images never leave your machine

### Smart Download System
- **Persistent Cache** — Models cached in Browser Cache Storage survive tab/browser restarts
- **Resume Downloads** — Close the tab mid-download? Reopen and resume from where you left off
- **Auto-Retry** — Transient network errors trigger automatic retry with exponential backoff
- **Instant Model Switch** — Switch between cached models without re-downloading

### Memory Management
- **Memory Guard** — Checks available memory before loading; blocks if insufficient, warns if tight
- **Live RAM Indicator** — Real-time memory usage bar in the status bar and model node
- **Auto-Unload** — Previous model is unloaded and memory released before loading a new one
- **Purge Controls** — Clear individual model caches or all caches to free disk space

### Image Pipeline
- **Image to Image** — Transform existing images with drag & drop
- **Inpainting** — Edit specific areas with brush/eraser mask editor
- **Background Removal** — Local background removal via RMBG-1.4
- **Image Resize** — Presets and custom resize options
- **Seed Control** — Reproducible results with seed management

### Workflow
- **Export/Import** — Save and share workflows as JSON
- **Presets** — Pre-built workflow templates
- **Gallery** — Auto-saved image gallery with metadata

## Node Reference

### Basic
| Node | Description |
|------|-------------|
| **Text Prompt** | Positive and negative prompt input |
| **Model Loader** | Model selector with download/cache status |
| **Run Inference** | Generation config (steps, CFG, dimensions) and execute |
| **Image Output** | Result visualization, metadata, and download |

### Advanced
| Node | Description |
|------|-------------|
| **Image to Image** | Transform images with adjustable denoising |
| **Inpainting** | Mask editor with brush/eraser tools |
| **Seed Generator** | Seed control for reproducibility |
| **Remove Background** | Local RMBG-1.4 background removal |
| **Image Resize** | Resize with presets or custom values |

## Architecture

```
src/
├── components/
│   ├── nodes/              # Custom React Flow nodes
│   │   ├── ModelLoaderNode.jsx   # Model selection + download UI
│   │   ├── PromptNode.jsx        # Text input
│   │   ├── InferenceNode.jsx     # Generation controls
│   │   ├── ImageDisplayNode.jsx  # Output display
│   │   ├── InpaintingNode.jsx    # Mask editor
│   │   ├── Img2ImgNode.jsx       # Image-to-image
│   │   └── ...
│   ├── StatusBar.jsx       # Memory + status indicators
│   ├── Sidebar.jsx         # Navigation sidebar
│   ├── StorageManager.jsx  # Cache management UI
│   └── ErrorBoundary.jsx   # Graceful error handling
├── services/
│   ├── txt2imgService.js         # web-txt2img wrapper (load, generate, retry)
│   ├── memoryGuard.js            # RAM monitoring + pre-load safety checks
│   ├── downloadPersistence.js    # localStorage state for resume + cache registry
│   ├── modelDownloader.js        # OPFS model downloader
│   └── opfsService.js            # Origin Private File System + Browser Cache helpers
├── workers/
│   └── inference.worker.js       # Web Worker for enhancement + bg removal
├── store/
│   └── useStore.jsx        # Global state (React Context + useReducer)
├── hooks/
│   ├── useWebGPU.jsx       # WebGPU capability detection
│   ├── useGallery.jsx      # Gallery persistence (IndexedDB)
│   ├── useToast.jsx        # Toast notifications
│   └── useWorkflow.jsx     # Workflow export/import
├── utils/
│   └── globalToast.js      # Event-based toast bridge
├── App.jsx                 # Main app with React Flow canvas
└── main.jsx                # Entry point
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + Vite 5 |
| **Node Canvas** | @xyflow/react (React Flow) |
| **Styling** | Tailwind CSS |
| **Icons** | Lucide React |
| **Text-to-Image** | [web-txt2img](https://github.com/nicolegoebel/web-txt2img) (SD-Turbo, Janus-Pro) |
| **ONNX Runtime** | onnxruntime-web (WebGPU backend) |
| **Transformers** | @huggingface/transformers v3.8+ |
| **Model Cache** | Browser Cache Storage API |
| **Download State** | localStorage |
| **Gallery** | IndexedDB |

## Browser Compatibility

| Browser | Support | WebGPU |
|---------|---------|--------|
| Chrome 113+ | Full | Full |
| Edge 113+ | Full | Full |
| Firefox 118+ | Partial | Experimental (behind flag) |
| Safari 17+ | Partial | Limited WebGPU support |

> WebGPU is required for model inference. Chrome or Edge is strongly recommended.

## Development

```bash
# Development server with HMR
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

### Vite Configuration Notes

The project includes a custom Vite plugin (`serveOnnxruntimeFiles`) that serves ONNX Runtime's `.wasm` and `.mjs` worker files from `node_modules` during development. This is necessary because ONNX Runtime dynamically imports these files at runtime and Vite's default handling doesn't support this pattern.

## Contributing

Contributions are welcome!

1. Fork the project
2. Create your branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add: amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) — The original inspiration
- [web-txt2img](https://github.com/nicolegoebel/web-txt2img) — Browser-native text-to-image
- [React Flow](https://reactflow.dev/) — Node engine
- [Hugging Face](https://huggingface.co/) — AI models and Transformers.js
- [ONNX Runtime Web](https://onnxruntime.ai/) — WebGPU inference runtime
- [Tailwind CSS](https://tailwindcss.com/) — CSS framework

---

<p align="center">
  <strong>ComfyUI is powerful. CozyUI is cozy.</strong>
</p>
