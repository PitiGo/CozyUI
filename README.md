# 🏠 CozyUI

> **ComfyUI is powerful, but CozyUI is... cozy** ✨

A "ComfyUI" that runs 100% in the browser - AI image generation with no installations, no configuration, no hassle.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![WebGPU](https://img.shields.io/badge/WebGPU-Ready-orange)

<p align="center">
  <img src="docs/screenshot.png" alt="CozyUI Screenshot" width="800">
</p>

## ✨ Why CozyUI?

**ComfyUI** is incredibly powerful, but it requires installation, configuration, and a learning curve. **CozyUI** maintains the same visual node philosophy, but:

- 🏠 **Cozy** - No installations, just open and use
- 🌐 **Web-Native** - Works in any modern browser
- ⚡ **Lightweight** - No local GPU needed (for now)
- 🎨 **Familiar** - If you know ComfyUI, you already know CozyUI

## 🚀 Quick Start

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

That's it! No need to install Python, CUDA, or anything else.

## ✨ Features

- 🖼️ **Visual Node Interface** - Drag, connect, and configure just like ComfyUI
- 🚀 **Zero Installation** - Just open the URL and start creating
- 🔒 **Complete Privacy** - Your data never leaves your browser*
- ⚡ **WebGPU Ready** - Prepared for local GPU acceleration
- 📱 **Responsive** - Works on desktop and tablets
- 🎨 **Image to Image** - Transform existing images
- 🌱 **Seed Control** - Full control over randomness
- 📦 **Workflow Presets** - Pre-built templates to get started quickly
- 💾 **Export/Import** - Save and share your workflows

> *Currently uses Pollinations.ai for generation. Local WebGPU coming soon.

## 🎯 Usage

1. **Set up the Prompt** - Write what you want to generate in the "Text Prompt" node
2. **Select Model** - Choose between SD 1.5, SD Turbo, or SDXL in "Model Loader"
3. **Adjust Parameters** - Steps, CFG Scale, dimensions in "Run Inference"
4. **Generate** - Click the orange "Generate" button
5. **Download** - Your image will appear in "Image Output" ready to download

### 🖼️ Image to Image

1. Drag an image from the gallery to the "Image to Image" node
2. Adjust the "Denoising Strength" (0 = subtle, 1 = creative)
3. Connect the node to the workflow and generate

## 🧩 Available Nodes

### Basic
| Node | Description |
|------|-------------|
| 📝 **Text Prompt** | Positive and negative prompt input |
| 📦 **Model Loader** | AI model selector |
| ⚙️ **Run Inference** | Generation configuration and execution |
| 🖼️ **Image Output** | Result visualization and download |

### Advanced
| Node | Description |
|------|-------------|
| 🖼️ **Image to Image** | Transform existing images with drag & drop |
| 🎲 **Seed Generator** | Seed control for reproducible results |
| 📐 **Image Resize** | Resize images with presets or custom values |

## 🛠️ Tech Stack

- **React 19** + Vite 5 - Framework and build tool
- **@xyflow/react** (React Flow) - Visual node engine
- **Tailwind CSS** - Modern styling
- **Lucide React** - Elegant icons
- **Web Workers** - Non-blocking processing
- **Zustand** - Lightweight global state
- **Pollinations.ai** - Generation API (temporary)

## 📁 Project Structure

```
src/
├── components/
│   ├── nodes/           # Custom nodes
│   │   ├── PromptNode.jsx
│   │   ├── ModelLoaderNode.jsx
│   │   ├── InferenceNode.jsx
│   │   ├── ImageDisplayNode.jsx
│   │   ├── Img2ImgNode.jsx
│   │   ├── SeedNode.jsx
│   │   └── ImageResizeNode.jsx
│   ├── Sidebar.jsx      # Side panel
│   ├── Toolbar.jsx      # Top bar
│   ├── StatusBar.jsx    # Status bar
│   └── Gallery.jsx      # Image gallery
├── workers/
│   └── inference.worker.js  # AI Web Worker
├── store/
│   └── useStore.jsx     # Global state (Zustand)
├── hooks/
│   ├── useWebGPU.jsx    # WebGPU detection
│   ├── useGallery.jsx   # Gallery management
│   ├── useToast.jsx     # Notifications
│   └── useWorkflow.jsx  # Export/Import workflows
├── App.jsx              # Main component
└── main.jsx             # Entry point
```

## 🗺️ Roadmap

See [ROADMAP.md](./ROADMAP.md) for the complete development plan.

### ✅ Completed (MVP + Phase 3)
- [x] Visual node interface
- [x] Text-to-image generation
- [x] Image to Image with drag & drop
- [x] Seed generator
- [x] Image resize
- [x] Workflow export/import
- [x] Workflow presets
- [x] Image gallery

### 🚧 Upcoming Features (Phase 2)
- [ ] Model caching with OPFS
- [ ] More available models
- [ ] UX improvements and animations

### 🔮 Future (Phase 3-4)
- [ ] 100% local generation with WebGPU
- [ ] LoRA support
- [ ] Installable PWA
- [ ] ControlNet
- [ ] Inpainting
- [ ] Upscaling

## 🌐 Browser Compatibility

| Browser | Support | WebGPU |
|---------|---------|--------|
| Chrome 113+ | ✅ | ✅ |
| Edge 113+ | ✅ | ✅ |
| Firefox 118+ | ✅ | ⚠️ Experimental |
| Safari 17+ | ✅ | ⚠️ Partial |

## 🤝 Contributing

Contributions are welcome! 

1. Fork the project
2. Create your branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add: AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - The original inspiration
- [React Flow](https://reactflow.dev/) - Node engine
- [Hugging Face](https://huggingface.co/) - AI models
- [Pollinations.ai](https://pollinations.ai/) - Free generation API
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

<p align="center">
  Made with ❤️ to make generative AI more accessible
</p>

<p align="center">
  <strong>ComfyUI is powerful. CozyUI is cozy. ✨</strong>
</p>
