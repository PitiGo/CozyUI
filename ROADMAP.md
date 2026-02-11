# CozyUI - Roadmap

## Current State: v0.2.0 - 100% Local Generation

**Last updated:** February 2026

### Completed

| Feature | Status | Details |
|---------|--------|---------|
| Visual node canvas | Done | React Flow with infinite canvas, zoom, pan |
| Text Prompt node | Done | Positive and negative prompt input |
| Model Loader node | Done | SD-Turbo, Janus-Pro 1B, Image Enhancer |
| Run Inference node | Done | Steps, CFG, dimensions, seed controls |
| Image Output node | Done | Display, download, real dimensions |
| 100% local text-to-image | Done | web-txt2img + WebGPU (SD-Turbo, Janus-Pro) |
| Model caching | Done | Browser Cache Storage API, survives restarts |
| Download resume | Done | Interrupted downloads resume from where they left off |
| Memory guard | Done | RAM monitoring, pre-load safety checks |
| Image gallery | Done | Auto-save with model name, seed, prompt metadata |
| Image-to-Image | Done | Drag & drop, denoising strength control |
| Inpainting | Done | Canvas mask editor with brush/eraser |
| Background removal | Done | Local RMBG-1.4 via Transformers.js |
| Super-resolution | Done | Local 2x upscale via Transformers.js |
| Seed control | Done | Reproducible results |
| Workflow export/import | Done | Save and share as JSON |
| Workflow presets | Done | Pre-built templates |
| Image resize node | Done | Presets and custom values |
| Toast notifications | Done | Global event-based toast system |
| Error boundary | Done | Graceful error recovery |
| Storage manager | Done | View/clear cached models |

---

## Upcoming

### UX Improvements
- [ ] Keyboard shortcuts (Ctrl+Enter to generate)
- [ ] Light/dark theme toggle
- [ ] Mobile-responsive layout
- [ ] Estimated time remaining during generation
- [ ] Generation cancellation

### More Models
- [ ] SDXL-Turbo (awaiting ONNX conversion for browser)
- [ ] SD 1.5 (awaiting browser-compatible ONNX)
- [ ] Additional Transformers.js models as they become available

### Advanced Features
- [ ] LoRA support (if browser-compatible format emerges)
- [ ] ControlNet helpers (Canny, Depth, Pose)
- [ ] Batch generation (multiple images)
- [ ] Scheduler/sampler selection node

### Infrastructure
- [ ] PWA / Service Worker for full offline support
- [ ] Code splitting for faster initial load
- [ ] Production deployment (Vercel/Netlify)

---

## Known Limitations

- WebGPU required (Chrome/Edge 113+)
- Models are large (1.5-2.4 GB download, cached after first load)
- 8 GB RAM minimum, 16 GB recommended for SD-Turbo
- Generation speed depends on GPU capability
- Image-to-image with text prompts not yet supported locally (enhancement only)

---

## Changelog

### v0.2.0 (February 2026)
- 100% local generation via WebGPU (no APIs)
- SD-Turbo and Janus-Pro 1B models
- Persistent model caching with download resume
- Memory guard with RAM monitoring
- Gallery with model name metadata
- Inpainting with mask editor
- Background removal (RMBG-1.4)
- Error boundary and global toast system

### v0.1.0 (December 2024)
- Initial MVP release
- Node canvas with React Flow
- 4 basic nodes (Prompt, Model, Inference, Output)
- Image generation via Pollinations.ai API
- WebGPU detection
- Web Worker for non-blocking inference
