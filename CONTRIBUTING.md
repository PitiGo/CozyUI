# Contributing to CozyUI

## Quick Start

```bash
git clone https://github.com/PitiGo/CozyUI.git
cd CozyUI
npm install
npm run dev
# Open http://localhost:5173
```

## Project Structure

```
src/
├── components/
│   ├── nodes/              # React Flow custom nodes
│   ├── StatusBar.jsx       # Memory + status indicators
│   ├── Sidebar.jsx         # Node palette
│   ├── Toolbar.jsx         # Top toolbar (Run Workflow, presets, etc.)
│   ├── Gallery.jsx         # Image gallery with drag-to-node
│   ├── StorageManager.jsx  # Cache management UI
│   └── ErrorBoundary.jsx   # Error recovery
├── services/
│   ├── txt2imgService.js         # web-txt2img wrapper (model loading, generation)
│   ├── memoryGuard.js            # RAM monitoring + safety checks
│   ├── downloadPersistence.js    # Download state + cached models registry
│   ├── modelDownloader.js        # OPFS model downloader
│   └── opfsService.js            # OPFS + Browser Cache helpers
├── workers/
│   └── inference.worker.js       # Web Worker for enhancement + bg removal
├── store/
│   └── useStore.jsx        # Global state (React Context + useReducer)
├── hooks/                  # useWebGPU, useGallery, useToast, useWorkflow
├── utils/
│   └── globalToast.js      # Event-based toast bridge
├── App.jsx
└── main.jsx
```

## Key Areas

### Adding a New Node
1. Create `src/components/nodes/YourNode.jsx`
2. Register in `src/components/nodes/index.jsx`
3. Add to sidebar in `src/components/Sidebar.jsx`
4. Add default data in `App.jsx` `getDefaultNodeData()`

### Changing AI Generation Logic
- **Text-to-image**: `src/services/txt2imgService.js` (wraps `web-txt2img`)
- **Enhancement / BG removal**: `src/workers/inference.worker.js`
- **Model list**: `AVAILABLE_MODELS` in `src/store/useStore.jsx`

### Memory Management
- `src/services/memoryGuard.js` — pre-load checks, RAM estimates
- Blob URL cleanup in reducer (`GENERATION_STARTED`, `GENERATION_COMPLETE`, `RESET_GENERATION`)

## Commands

```bash
npm run dev       # Dev server with HMR
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
```

## Commit Convention

```
feat: new feature
fix: bug fix
refactor: code restructure
docs: documentation only
```

## Vite Notes

The project includes a custom Vite plugin (`serveOnnxruntimeFiles` in `vite.config.js`) that serves ONNX Runtime `.wasm` and `.mjs` files from `node_modules` during development. This is required because ONNX Runtime dynamically imports these files at runtime.

## Requirements

- Node.js 18+
- Chrome 113+ or Edge 113+ (WebGPU required)
- GPU with WebGPU support
