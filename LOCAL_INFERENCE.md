# ⚡ Local Inference with WebGPU - Current Status

This document explains the current state of local AI inference in CozyUI.

---

## 📊 TL;DR - What Works Today

| Feature | Status | Method |
|---------|--------|--------|
| **Text-to-Image** | ✅ Local + API Fallback | Transformers.js v3 + Pollinations.ai |
| **Image-to-Image** | ✅ Local Ready | Transformers.js v3 |
| **Image Upscaling** | ✅ Local Ready | Transformers.js v3 |
| **WebGPU Detection** | ✅ Working | Browser API |

---

## 🎉 Text-to-Image is NOW Available Locally!

As of December 2024, the `text-to-image` pipeline **IS available** in `@huggingface/transformers` v3.8.1.

### How It Works in CozyUI

```javascript
// CozyUI now attempts local generation first:
if (localTextToImageAvailable && text2imgPipeline) {
  await generateLocally(payload);  // 🚀 WebGPU!
} else {
  await generateViaAPI(payload);   // 🌐 Fallback
}
```

### Supported Models

```javascript
// Current model used for local generation:
const text2imgPipeline = await pipeline(
  'text-to-image', 
  'onnx-community/stable-diffusion-3.5-medium',
  {
    device: 'webgpu',
    dtype: 'fp16'
  }
);
```

### ⚠️ Important Considerations

1. **First Download is Large**: ~2GB+ of model files
2. **Shader Compilation**: First run may freeze browser briefly
3. **Hardware Requirements**: Needs a decent GPU (M1/M2/M3 Mac, NVIDIA RTX, etc.)
4. **Browser Support**: Chrome 113+, Edge 113+

---

## ✅ What DOES Work Locally

### Text-to-Image (NEW!)

```javascript
import { pipeline } from '@huggingface/transformers';

const generator = await pipeline('text-to-image', 'onnx-community/stable-diffusion-3.5-medium', {
  device: 'webgpu',
  dtype: 'fp16'
});

const result = await generator('A cat astronaut on Mars', {
  num_inference_steps: 20,
  guidance_scale: 7.5
});
// result.images[0] is your generated image!
```

### Image-to-Image (Super Resolution)

```javascript
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

## 🏗️ CozyUI Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CozyUI                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Text-to-Image Generation:                                  │
│  ├── Primary: Local WebGPU (when available)                │
│  ├── Model: onnx-community/stable-diffusion-3.5-medium     │
│  ├── Fallback: Pollinations.ai API                         │
│  └── Behavior: Automatic, seamless to user                 │
│                                                             │
│  Image-to-Image / Upscaling:                               │
│  ├── Mode: Local WebGPU                                    │
│  ├── Pipeline: 'image-to-image'                            │
│  └── Models: Xenova/swin2SR-* series                       │
│                                                             │
│  WebGPU Status:                                            │
│  ├── Detection: ✅ Working                                  │
│  └── Used for: Text-to-Image, Image processing             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Progress Tracking

- [x] Install `@huggingface/transformers` v3
- [x] Detect WebGPU availability
- [x] Implement API fallback (Pollinations.ai)
- [x] Test `image-to-image` pipeline locally
- [x] Implement local `text-to-image` pipeline
- [ ] Add local upscaling to Image Resize node
- [ ] Add model management UI (download/delete)
- [ ] Implement OPFS caching for large models

---

## 🔧 Troubleshooting

### Local Generation Not Working?

1. **Check Browser Console**: Look for WebGPU or shader compilation errors
2. **Verify Browser Version**: Chrome 113+ or Edge 113+
3. **Check GPU Memory**: Model requires significant VRAM
4. **Try API Mode**: If local fails, API fallback should work

### Model Download Stuck?

- Large models (~2GB) may take several minutes
- Progress is shown in the model loader
- Models are cached in browser storage after first download

### Generation is Slow?

- First generation compiles shaders (takes longer)
- Subsequent generations are faster
- Reduce image size or steps for faster results

---

## 🚀 Resources

### Monitor Transformers.js Progress
- **Releases**: https://github.com/huggingface/transformers.js/releases
- **Issues**: https://github.com/huggingface/transformers.js/issues
- **Models**: https://huggingface.co/models?library=transformers.js

### WebGPU Documentation
- **Status**: https://webgpureport.org/
- **Spec**: https://www.w3.org/TR/webgpu/
- **Examples**: https://webgpu.github.io/webgpu-samples/

---

*Last Updated: December 2024*
*Transformers.js Version: 3.8.1*
*Text-to-Image: ✅ Available*
