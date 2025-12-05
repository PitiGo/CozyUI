# 🖼️ Image-to-Image Guide

This guide explains how to use the Image-to-Image feature in CozyUI.

---

## 📋 Quick Start

### Step 1: Add the Nodes

1. **Text Prompt Node** - Enter your prompt
2. **Model Loader Node** - Select a model
3. **Image to Image Node** - Upload or drag an image
4. **Run Inference Node** - Configure and generate
5. **Image Display Node** - View the result

### Step 2: Connect the Nodes

```
[Text Prompt] ──┐
                ├──> [Run Inference] ──> [Image Display]
[Model Loader] ─┘
[Image to Image] ──> (automatically detected)
```

**Note**: You don't need to connect the Image to Image node with a wire. The Inference node automatically detects if an Image to Image node exists in your workflow.

### Step 3: Upload Your Image

In the **Image to Image** node, you can:
- **Click** to browse and select an image file
- **Drag & Drop** an image file from your computer
- **Drag from Gallery** - Drag any image from the Gallery panel

### Step 4: Adjust Settings

- **Denoising Strength** (0.0 - 1.0):
  - `0.0 - 0.3`: Subtle changes, preserves original
  - `0.4 - 0.7`: Balanced transformation
  - `0.8 - 1.0`: More creative, significant changes

### Step 5: Generate

Click **Generate** in the Run Inference node. The system will:
1. Detect the image from the Image to Image node
2. Try local WebGPU processing (if available)
3. Fall back to API if local processing fails

---

## 🎯 Use Cases

### 1. Style Transfer
Transform a photo into a different artistic style:
- Upload: Your photo
- Prompt: "cyberpunk style, neon lights, futuristic"
- Strength: 0.6-0.8

### 2. Image Enhancement
Improve or upscale an image:
- Upload: Low-resolution image
- Prompt: "high quality, detailed, 8k"
- Strength: 0.3-0.5

### 3. Creative Variations
Generate variations of an existing image:
- Upload: Original image
- Prompt: "different angle, new perspective"
- Strength: 0.7-0.9

### 4. Background Replacement
Change the background while keeping the subject:
- Upload: Image with subject
- Prompt: "beach background, sunset, ocean"
- Strength: 0.5-0.7

---

## ⚙️ How It Works

### Local Processing (WebGPU)

When WebGPU is available and the image-to-image pipeline is loaded:
- Uses local GPU processing
- Faster (no network delay)
- Private (image stays in your browser)
- Currently supports: Super-resolution and enhancement

### API Fallback

If local processing isn't available:
- Uses Pollinations.ai API
- Works on any device
- Supports full image-to-image transformations with prompts

---

## 🔧 Technical Details

### Supported Image Formats
- JPEG/JPG
- PNG
- WebP
- GIF (first frame)

### Image Size Recommendations
- **Optimal**: 512×512 to 1024×1024 pixels
- **Maximum**: 2048×2048 pixels (may be slower)
- **Minimum**: 256×256 pixels

### Processing Modes

1. **Local WebGPU** (when available):
   - Pipeline: `image-to-image` (super-resolution)
   - Model: `Xenova/swin2SR-classical-sr-x2-64`
   - Speed: Fast (depends on GPU)

2. **API Mode**:
   - Service: Pollinations.ai
   - Supports: Full img2img with prompts
   - Speed: Moderate (depends on network)

---

## 💡 Tips & Tricks

1. **Start with Low Strength**: Begin with 0.3-0.5 to see subtle changes, then increase if needed.

2. **Use Descriptive Prompts**: Be specific about what you want to change:
   - ❌ "make it better"
   - ✅ "add dramatic lighting, cinematic style, high contrast"

3. **Combine with Gallery**: Drag images from the Gallery to quickly reuse previous generations.

4. **Experiment with Models**: Different models respond differently to image-to-image:
   - `sd-turbo`: Fast, good for quick tests
   - `stable-diffusion-v1-5`: More detailed results

5. **Save Your Workflow**: Use "Export Workflow" to save your image-to-image setup for later.

---

## 🐛 Troubleshooting

### Image Not Processing
- **Check**: Is the image loaded in the Image to Image node?
- **Check**: Is the Run Inference node connected to Prompt and Model nodes?
- **Solution**: Make sure all required nodes are present and connected

### Local Processing Not Working
- **Check**: Is WebGPU available? (See status in sidebar)
- **Check**: Browser console for errors
- **Solution**: The system will automatically fall back to API mode

### Results Not as Expected
- **Try**: Adjust the Denoising Strength slider
- **Try**: Modify your prompt to be more specific
- **Try**: Use a different model

### Image Too Large
- **Solution**: Resize the image before uploading (recommended: 512×512 to 1024×1024)

---

## 📚 Examples

### Example 1: Photo to Painting
```
Image: Portrait photo
Prompt: "oil painting, renaissance style, detailed brushstrokes"
Strength: 0.7
Result: Artistic painting version
```

### Example 2: Day to Night
```
Image: Daytime cityscape
Prompt: "nighttime, neon lights, cyberpunk atmosphere, rain"
Strength: 0.8
Result: Night scene transformation
```

### Example 3: Upscale & Enhance
```
Image: Low-res image (256×256)
Prompt: "high resolution, sharp details, professional quality"
Strength: 0.4
Result: Enhanced, upscaled version
```

---

*Last Updated: December 2024*

