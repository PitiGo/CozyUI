# 🎨 Inpainting & Mask Editor - User Guide

## Overview

The **Inpainting** feature allows you to regenerate specific areas of an existing image by painting a mask over the regions you want to modify. This is one of the most powerful tools in generative AI, enabling precise edits like:

- Removing unwanted objects
- Replacing backgrounds
- Adding new elements to specific areas
- Fixing imperfections

## How to Use the Inpainting Node

### 1. Add the Inpainting Node

1. **Open CozyUI** in your browser
2. **Locate** the "Inpainting" node in the **Advanced** section of the sidebar
3. **Drag** the node onto the canvas

### 2. Load an Image

You have three ways to add an image to the Inpainting node:

#### Option A: Upload from Computer
- **Click** the upload area in the node
- **Select** an image file from your computer

#### Option B: Drag and Drop
- **Drag** an image file directly onto the upload area

#### Option C: From Gallery
- **Generate** or have images in your gallery
- **Drag** an image from the gallery onto the upload area
- The node will automatically load the image with its original metadata

### 3. Expand the Mask Editor

Once an image is loaded:

1. **Click** the **"Expand Mask Editor"** button
2. The node will grow to reveal the full mask editing interface

### 4. Paint Your Mask

The mask editor provides professional tools for precise masking:

#### **Brush Tool** 🖌️
- **Purpose**: Paint white areas to mark regions for inpainting
- **How to use**: Click the brush icon (it's selected by default)
- **Tip**: White areas = regions that will be regenerated

#### **Eraser Tool** 🧹
- **Purpose**: Remove parts of the mask
- **How to use**: Click the eraser icon
- **Tip**: Use this to refine your mask

#### **Brush Size Slider** 📏
- **Range**: 5px to 100px
- **Adjust**: Use the slider or drag to change brush size
- **Shortcut**: The number displays current size

#### **Clear Button** 🔄
- **Purpose**: Reset the entire mask to black (empty)
- **When to use**: Start over if you make mistakes

### 5. View Controls

#### **Eye/Eye-Off Toggle** 👁️
- **Show Mask**: Overlay the mask on the image with transparency
- **Hide Mask**: Hide the overlay to see the original image clearly

#### **Opacity Slider** 
- **Range**: 0% to 100%
- **Purpose**: Control how visible the mask overlay is
- **Tip**: Lower opacity helps see details while painting

#### **Download Mask** 💾
- **Purpose**: Export the mask as a PNG file
- **Use case**: Save masks for reuse or external editing

### 6. Painting Tips

✅ **Best Practices**:
- **Paint inside the boundaries** of objects you want to replace
- **Use larger brush** for broad areas
- **Use smaller brush** for fine details and edges
- **Toggle visibility** frequently to check your work
- **Lower opacity** when painting near edges

❌ **Common Mistakes**:
- Painting too close to edges (can blur surrounding areas)
- Using too small a brush for large areas (time-consuming)
- Not checking the mask before generating

### 7. Connect to Workflow

After creating your mask:

1. **Connect** a **Text Prompt** node to describe what should appear in the masked area
2. **Connect** to **Model Loader** and **Run Inference** nodes
3. **Click Generate** to create the inpainted result

### 8. Example Workflow

```
Text Prompt → ┐
              ├→ Inpainting → Run Inference → Image Output
Model Loader →┘
```

**Prompt Example**:
- Original: Photo of a park with a car
- Mask: Paint over the car
- Prompt: "Beautiful fountain with flowers"
- Result: The car is replaced with a fountain

## Mask Editor Interface

```
┌─────────────────────────────────────────┐
│  🖌️ Brush | 🧹 Eraser | 🔄 Clear       │  ← Tools
│  ━━━━●━━━━ Size: 30px                  │  ← Brush Size
│  👁️ Show | 💾 Download                  │  ← View Controls
├─────────────────────────────────────────┤
│  Opacity: ━━━●━━━ 70%                   │  ← Mask Opacity
├─────────────────────────────────────────┤
│                                         │
│    [Canvas: Image + Mask Overlay]      │  ← Drawing Surface
│                                         │
└─────────────────────────────────────────┘
```

## Technical Details

### Mask Format
- **Color Space**: Grayscale (Black & White)
- **Black (0,0,0)**: Original image (keep)
- **White (255,255,255)**: Masked area (regenerate)

### Canvas Technology
- **Built with**: HTML5 Canvas API
- **Drawing**: Real-time brush strokes with customizable size
- **Performance**: Optimized for smooth painting on high-resolution images

### Supported Image Formats
- PNG
- JPEG
- WebP
- Any format supported by browsers

## Keyboard & Mouse Controls

| Action | Control |
|--------|---------|
| Paint mask | Left Click + Drag (with Brush selected) |
| Erase mask | Left Click + Drag (with Eraser selected) |
| Switch to Brush | Click Brush button |
| Switch to Eraser | Click Eraser button |
| Adjust brush size | Drag brush size slider |
| Toggle mask visibility | Click Eye/Eye-Off button |

## Troubleshooting

### Issue: "No mask yet - Expand to create"
**Solution**: You haven't created a mask yet. Click "Expand Mask Editor" and start painting.

### Issue: Mask not showing after painting
**Solution**: 
1. Check that the **Eye icon** is enabled (showing eye, not eye-off)
2. Increase the **Opacity slider** to make the mask more visible

### Issue: Can't paint on the canvas
**Solution**:
1. Make sure the **Brush tool** is selected (purple background)
2. Try increasing the **brush size**
3. Verify an image is loaded

### Issue: Downloaded mask is all black
**Solution**: This is correct if you haven't painted anything. White areas only appear where you paint.

## Advanced Tips

### Feathered Edges
For softer transitions, paint multiple light strokes near edges rather than one solid stroke.

### Precision Masking
1. Use a **small brush (5-10px)** for initial outline
2. **Fill** the interior with a larger brush
3. **Refine** edges with the eraser

### Reusing Masks
1. **Download** your mask using the download button
2. For future use, you can edit it in external tools (Photoshop, GIMP)
3. Use it as a reference for similar edits

---

## Next Steps

Now that you have the Inpainting node with Mask Editor working:

1. **Try it**: Load an image and experiment with different masks
2. **Combine**: Use with Img2Img for complex transformations
3. **Explore**: Create precise edits that weren't possible before

Happy inpainting! 🎨✨
