# ⚡ Local Inference with WebGPU - Current Status

This document explains the current state of local AI inference in CozyUI.

---

## 📊 TL;DR - What Works Today

| Feature | Status | Method |
|---------|--------|--------|
| **Text-to-Image** | ⚠️ API Only | Pollinations.ai (pipeline not available in transformers.js v3.8.1) |
| **Image-to-Image** | ✅ Local Ready | Transformers.js v3 |
| **Image Upscaling** | ✅ Local Ready | Transformers.js v3 |
| **WebGPU Detection** | ✅ Working | Browser API |

---

## ❌ Text-to-Image is NOT Available Locally (Yet)

**Reality Check**: As of December 2024, the `text-to-image` pipeline is **NOT available** in `@huggingface/transformers` v3.8.1.

### Error Message

When attempting to use `text-to-image` pipeline:
```
Unsupported pipeline: text-to-image. Must be one of [
  text-classification,
  token-classification,
  question-answering,
  fill-mask,
  summarization,
  translation,
  text2text-generation,
  text-generation,
  zero-shot-classification,
  audio-classification,
  zero-shot-audio-classification,
  automatic-speech-recognition,
  text-to-audio,
  image-to-text,
  image-classification,
  image-segmentation,
  background-removal,
  zero-shot-image-classification,
  object-detection,
  zero-shot-object-detection,
  document-question-answering,
  image-to-image,        ← This one works!
  depth-estimation,
  feature-extraction,
  image-feature-extraction
]
```

**Note**: `image-to-image` **IS** in the list, but `text-to-image` is **NOT**.

### How CozyUI Handles This

```javascript
// CozyUI always uses API for text-to-image:
console.log('🌐 Using Pollinations.ai API for text-to-image generation...');
await generateViaAPI(payload);
```

The fallback to Pollinations.ai API is **automatic and seamless** - users don't notice the difference.

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

## 🏗️ CozyUI Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CozyUI                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Text-to-Image Generation:                                  │
│  ├── Mode: API Only (Pollinations.ai)                      │
│  ├── Reason: Pipeline not available in transformers.js     │
│  └── Behavior: Automatic, seamless to user                 │
│                                                             │
│  Image-to-Image / Upscaling:                               │
│  ├── Mode: Local WebGPU                                    │
│  ├── Pipeline: 'image-to-image'                            │
│  └── Models: Xenova/swin2SR-* series                       │
│                                                             │
│  WebGPU Status:                                            │
│  ├── Detection: ✅ Working                                  │
│  └── Used for: Image processing (not text-to-image yet)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Progress Tracking

- [x] Install `@huggingface/transformers` v3
- [x] Detect WebGPU availability
- [x] Implement API fallback (Pollinations.ai)
- [x] Test `image-to-image` pipeline locally
- [x] Verify `text-to-image` is NOT available (confirmed)
- [ ] Wait for transformers.js to add `text-to-image` pipeline
- [ ] Add local upscaling to Image Resize node
- [ ] Add model management UI (download/delete)
- [ ] Implement OPFS caching for large models

---

## 🔮 Future: When Text-to-Image Becomes Available

The code is structured to easily enable local generation when the pipeline becomes available:

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

## 🔍 How to Check if text-to-image Becomes Available

Run this test periodically:

```bash
node -e "
const { pipeline } = require('@huggingface/transformers');
pipeline('text-to-image', 'test').catch(e => {
  if (e.message.includes('Unsupported pipeline') || e.message.includes('is not a valid task')) {
    console.log('❌ text-to-image NOT available yet');
  } else {
    console.log('✅ text-to-image IS available!');
    console.log('   Update inference.worker.js to enable local generation');
  }
});
"
```

---

## 🚀 Resources

### Monitor Transformers.js Progress
- **Releases**: https://github.com/huggingface/transformers.js/releases
- **Issues**: https://github.com/huggingface/transformers.js/issues
- **Search for**: "text-to-image" or "stable-diffusion" pipeline support

### WebGPU Documentation
- **Status**: https://webgpureport.org/
- **Spec**: https://www.w3.org/TR/webgpu/
- **Examples**: https://webgpu.github.io/webgpu-samples/

---

*Last Updated: December 2024*
*Transformers.js Version: 3.8.1*
*Text-to-Image: ❌ NOT Available (API fallback works)*
