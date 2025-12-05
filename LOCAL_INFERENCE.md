# ⚡ Local Inference with WebGPU - Current Status

This document explains the current state of local AI inference in CozyUI.

---

## 📊 TL;DR - What Works Today

| Feature | Status | Method |
|---------|--------|--------|
| **Text-to-Image** | ⚠️ API Only | Pollinations.ai |
| **Image-to-Image** | ✅ Local Ready | Transformers.js v3 |
| **Image Upscaling** | ✅ Local Ready | Transformers.js v3 |
| **WebGPU Detection** | ✅ Working | Browser API |

---

## 🔍 Why Text-to-Image Isn't Local Yet

### The Technical Reality

We have `@huggingface/transformers@3.8.1` (v3) installed, which **does support WebGPU**. However:

```javascript
// These pipelines EXIST in v3:
'image-to-image'     // ✅ Works locally!
'image-classification'
'depth-estimation'
'background-removal'
// ... many others

// This pipeline DOES NOT EXIST yet:
'text-to-image'      // ❌ Not implemented
'stable-diffusion'   // ❌ Not a pipeline name
```

### Why?

Stable Diffusion requires orchestrating multiple models:
1. **Text Encoder** (CLIP) - Converts prompt to embeddings
2. **UNet** - The actual diffusion model (~1.5GB)
3. **VAE Decoder** - Converts latents to pixels
4. **Scheduler** - Controls the denoising steps

The `transformers.js` team has implemented individual components but hasn't yet wrapped them into a convenient `text-to-image` pipeline for browser use.

---

## ✅ What DOES Work Locally

### Image-to-Image (Super Resolution)

```javascript
import { pipeline } from '@huggingface/transformers';

const upscaler = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64', {
  device: 'webgpu'
});

const result = await upscaler(imageData);
// Returns upscaled image!
```

### Depth Estimation

```javascript
const depth = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf', {
  device: 'webgpu'
});
```

### Background Removal

```javascript
const remover = await pipeline('background-removal', 'briaai/RMBG-1.4', {
  device: 'webgpu'
});
```

---

## 🚀 How to Get Text-to-Image Locally

### Option 1: Wait for Transformers.js Update

The HuggingFace team is actively working on this. Monitor:
- https://github.com/huggingface/transformers.js/issues
- Look for `StableDiffusionPipeline` or `text-to-image` support

### Option 2: Use WebSD / Stable Diffusion WebGPU

There are experimental implementations:
- [WebSD](https://github.com/nickytonline/web-sd) - Community project
- [Stable Diffusion WebGPU Demo](https://nickytonline-web-sd.hf.space/) - HF Space

These require manual integration and aren't as polished as transformers.js.

### Option 3: Use diffusers.js (Experimental)

```javascript
// Note: This is a separate library, not transformers.js
import { DiffusionPipeline } from '@xenova/diffusers';

const pipe = await DiffusionPipeline.fromPretrained('Xenova/stable-diffusion-v1-5-onnx');
const result = await pipe('A cat riding a bicycle');
```

⚠️ This library is less maintained and may have issues.

---

## 🏗️ CozyUI Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CozyUI                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Text-to-Image Generation:                                  │
│  ├── Mode: API (Pollinations.ai)                           │
│  ├── Reason: Pipeline not available in transformers.js     │
│  └── Fallback: Automatic, seamless to user                 │
│                                                             │
│  Image-to-Image / Upscaling:                               │
│  ├── Mode: Local WebGPU (when available)                   │
│  ├── Pipeline: 'image-to-image'                            │
│  └── Models: Xenova/swin2SR-* series                       │
│                                                             │
│  WebGPU Status:                                            │
│  ├── Detection: ✅ Working                                  │
│  └── Used for: Image processing, future SD support         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Progress Tracking

- [x] Install `@huggingface/transformers` v3
- [x] Detect WebGPU availability
- [x] Implement API fallback (Pollinations.ai)
- [x] Test `image-to-image` pipeline locally
- [ ] Add local upscaling to Image Resize node
- [ ] Integrate `text-to-image` when available
- [ ] Add model management UI (download/delete)

---

## 🔮 Future: When Text-to-Image Becomes Available

The code is structured to easily enable local generation:

```javascript
// In inference.worker.js, this will change from:
await generateViaAPI(payload);

// To:
if (textToImagePipeline) {
  await generateLocally(payload);
} else {
  await generateViaAPI(payload);
}
```

The infrastructure (OPFS storage, WebGPU detection, progress callbacks) is ready.

---

*Last Updated: December 2024*
*Transformers.js Version: 3.8.1*
