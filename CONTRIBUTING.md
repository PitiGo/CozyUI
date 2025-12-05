# 🛠️ Contributing & Maintenance Guide

This guide explains how to maintain and update CozyUI for future development.

---

## 📦 Updating Dependencies

### Check for Updates

```bash
# See outdated packages
npm outdated

# Update all to latest compatible versions
npm update

# Update a specific package
npm install @huggingface/transformers@latest
```

### Important: Transformers.js Updates

The `text-to-image` pipeline **IS NOW AVAILABLE** in transformers.js v3.8.1! ✅

Check current version:
```bash
npm list @huggingface/transformers
```

**Current Implementation** in `src/workers/inference.worker.js`:
- Attempts local WebGPU generation first
- Falls back to Pollinations.ai API if local fails
- Uses model: `onnx-community/stable-diffusion-3.5-medium` (or similar)

**To test if text-to-image is working**:
```bash
node -e "
const { pipeline } = require('@huggingface/transformers');
pipeline('text-to-image', 'test').catch(e => {
  if (e.message.includes('Unsupported task') || e.message.includes('is not a valid task')) {
    console.log('❌ text-to-image NOT available');
  } else {
    console.log('✅ text-to-image IS available!');
  }
});
"
```

---

## 🔄 Git Workflow

### Daily Development

```bash
# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, then commit
git add -A
git commit -m "Add: Description of changes"

# Push to GitHub
git push origin feature/your-feature-name
```

### Commit Message Convention

```
Add: New feature description
Fix: Bug fix description
Update: Dependency or config update
Refactor: Code restructure without changing behavior
Docs: Documentation changes
```

---

## 🧪 Testing Changes

### Start Development Server

```bash
npm run dev
# Opens at http://localhost:5173
```

### Build for Production

```bash
npm run build
# Output in /dist folder

# Preview production build
npm run preview
```

### Check for Lint Errors

```bash
npm run lint
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── nodes/           # Custom React Flow nodes
│   │   ├── PromptNode.jsx
│   │   ├── ModelLoaderNode.jsx
│   │   ├── InferenceNode.jsx
│   │   ├── ImageDisplayNode.jsx
│   │   ├── Img2ImgNode.jsx
│   │   ├── SeedNode.jsx
│   │   └── ImageResizeNode.jsx
│   ├── Sidebar.jsx      # Left panel with nodes
│   ├── Toolbar.jsx      # Top toolbar
│   ├── StatusBar.jsx    # Bottom status
│   └── Gallery.jsx      # Image gallery
├── workers/
│   └── inference.worker.js  # AI inference (WebGPU + API)
├── services/
│   ├── opfsService.js       # OPFS storage (prepared)
│   └── modelDownloader.js   # Model downloads (prepared)
├── store/
│   └── useStore.jsx     # Zustand global state
├── hooks/
│   ├── useWebGPU.jsx    # WebGPU detection
│   ├── useGallery.jsx   # Gallery management
│   ├── useToast.jsx     # Notifications
│   └── useWorkflow.jsx  # Export/Import
├── App.jsx              # Main component
└── main.jsx             # Entry point
```

---

## 🎯 Key Files to Modify

### Adding a New Node

1. Create `src/components/nodes/YourNode.jsx`
2. Register in `src/App.jsx`:
   ```javascript
   const nodeTypes = {
     // ... existing nodes
     yourNode: YourNode,
   };
   ```
3. Add to sidebar in `src/components/Sidebar.jsx`

### Changing AI Generation Logic

Edit `src/workers/inference.worker.js`:
- `loadModel()` - Model initialization
- `generate()` - Generation routing
- `generateViaAPI()` - Pollinations.ai calls
- `processImageLocally()` - Local WebGPU processing

### Updating the UI Theme

- Colors: `src/index.css` and Tailwind classes
- Fonts: `index.html` (Google Fonts) and `tailwind.config.js`

---

## 🔧 Environment Variables

Currently no `.env` file is needed. If you add API keys:

1. Create `.env` in project root:
   ```
   VITE_API_KEY=your_key_here
   ```

2. Access in code:
   ```javascript
   const apiKey = import.meta.env.VITE_API_KEY;
   ```

3. Add `.env` to `.gitignore` (already included)

---

## 🚀 Deploying

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify

```bash
# Build first
npm run build

# Drag /dist folder to Netlify dashboard
# Or use Netlify CLI
```

### GitHub Pages

```bash
# Add to package.json scripts:
"deploy": "npm run build && gh-pages -d dist"

# Install gh-pages
npm install --save-dev gh-pages

# Deploy
npm run deploy
```

---

## 📊 Monitoring WebGPU/Transformers.js Progress

### Resources to Watch

- **Transformers.js Releases**: https://github.com/huggingface/transformers.js/releases
- **Transformers.js Issues**: https://github.com/huggingface/transformers.js/issues
- **WebGPU Status**: https://webgpureport.org/

### Check for text-to-image Support

```bash
# Quick test script
node -e "
const { pipeline } = require('@huggingface/transformers');
pipeline('text-to-image', 'test').catch(e => {
  if (e.message.includes('Unsupported pipeline')) {
    console.log('❌ text-to-image NOT available yet');
  } else {
    console.log('✅ text-to-image might be available!', e.message);
  }
});
"
```

---

## 🐛 Common Issues

### "Module not found" after npm install

```bash
rm -rf node_modules package-lock.json
npm install
```

### WebGPU Not Detected

1. Check browser compatibility (Chrome 113+, Edge 113+)
2. Enable WebGPU flags if needed:
   - Chrome: `chrome://flags/#enable-webgpu-developer-features`

### Build Fails

```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run build
```

### Worker Not Loading

Check browser console for CORS errors. Workers need to be served from the same origin.

---

## 📝 Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview, quick start |
| `ROADMAP.md` | Development phases, planned features |
| `LOCAL_INFERENCE.md` | WebGPU/local AI status |
| `CONTRIBUTING.md` | This file - maintenance guide |
| `PROYECTO.md` | Original project specification (Spanish) |

---

## 🤝 Getting Help

- **Issues**: https://github.com/PitiGo/CozyUI/issues
- **Transformers.js Discord**: https://discord.gg/hugging-face
- **WebGPU Docs**: https://www.w3.org/TR/webgpu/

---

*Last Updated: December 2024*

