// Web Worker for AI Inference
// 2025 Update: Local WebGPU text-to-image generation now available!
// Supports both local WebGPU models and cloud API fallback

import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js for 2025
env.allowLocalModels = false;
env.useBrowserCache = true;

let currentModel = null;
let textToImagePipeline = null; // For local text-to-image generation
let img2imgPipeline = null; // For local image enhancement
let webGPUAvailable = false;

// Message handler
self.onmessage = async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'LOAD_MODEL':
      await loadModel(payload);
      break;
    case 'GENERATE':
      await generate(payload);
      break;
    case 'CHECK_WEBGPU':
      await checkWebGPU();
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};

async function checkWebGPU() {
  try {
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      
      if (adapter) {
        const info = await adapter.requestAdapterInfo?.() || {};
        webGPUAvailable = true;
        
        self.postMessage({
          type: 'WEBGPU_STATUS',
          payload: { 
            supported: true, 
            info: `WebGPU: ${info.description || info.vendor || 'GPU Detected'}`,
            features: {
              textToImage: 'local', // 2025: Now supports local!
              imageEnhancement: true
            }
          }
        });
        return;
      }
    }
    
    webGPUAvailable = false;
    self.postMessage({
      type: 'WEBGPU_STATUS',
      payload: { 
        supported: false, 
        reason: 'WebGPU not available',
        features: {
          textToImage: 'api', // Fallback to API
          imageEnhancement: false
        }
      }
    });
  } catch (error) {
    webGPUAvailable = false;
    self.postMessage({
      type: 'WEBGPU_STATUS',
      payload: { 
        supported: false, 
        reason: error.message
      }
    });
  }
}

async function loadModel(payload) {
  const { modelId, modelRepo, engine = 'api' } = payload;

  try {
    currentModel = {
      id: modelId,
      repo: modelRepo,
      engine: engine
    };

    console.log(`📦 Loading model: ${modelId} (${engine})`);

    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 10, message: 'Initializing...' }
    });

    // ========== LOCAL MODEL LOADING (2025) ==========
    if (engine === 'local' && webGPUAvailable) {
      console.log('🖥️ Loading local WebGPU model...');
      
      try {
        self.postMessage({
          type: 'MODEL_LOADING',
          payload: { modelId, progress: 20, message: 'Loading text-to-image model (this may take a while)...' }
        });

        // Load text-to-image pipeline with WebGPU
        textToImagePipeline = await pipeline('text-to-image', modelRepo, {
          device: 'webgpu',
          dtype: 'fp16', // Use fp16 for better performance
          progress_callback: (progress) => {
            if (progress.status === 'progress' || progress.status === 'download') {
              const pct = 20 + Math.round((progress.progress || 0) * 0.7);
              self.postMessage({
                type: 'MODEL_LOADING',
                payload: { 
                  modelId, 
                  progress: pct,
                  message: `Downloading: ${progress.file || modelRepo}...`
                }
              });
            }
          }
        });

        console.log('✅ Local text-to-image pipeline ready!');

        self.postMessage({
          type: 'MODEL_LOADING',
          payload: { modelId, progress: 100, message: 'Local model ready!' }
        });

        self.postMessage({
          type: 'MODEL_LOADED',
          payload: { 
            modelId, 
            modelRepo,
            engine: 'local',
            capabilities: {
              textToImage: 'local',
              imageEnhancement: 'local'
            }
          }
        });

        return;

      } catch (err) {
        console.warn('⚠️ Local model failed, falling back to API:', err.message);
        textToImagePipeline = null;
        // Fall through to API mode
      }
    }

    // ========== API MODEL (Cloud) ==========
    console.log('☁️ Configuring cloud API model...');

    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 50, message: 'Connecting to API...' }
    });

    // Optionally load local image enhancement pipeline
    if (webGPUAvailable && !img2imgPipeline) {
      try {
        self.postMessage({
          type: 'MODEL_LOADING',
          payload: { modelId, progress: 60, message: 'Loading image enhancer...' }
        });

        img2imgPipeline = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64', {
          device: 'webgpu',
          progress_callback: (progress) => {
            if (progress.status === 'progress' || progress.status === 'download') {
              const pct = 60 + Math.round((progress.progress || 0) * 0.3);
              self.postMessage({
                type: 'MODEL_LOADING',
                payload: { 
                  modelId, 
                  progress: pct,
                  message: `Loading enhancer: ${progress.file || ''}...`
                }
              });
            }
          }
        });

        console.log('✅ Image enhancement pipeline ready');
      } catch (err) {
        console.warn('⚠️ Image enhancement not available:', err.message);
        img2imgPipeline = null;
      }
    }

    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 100, message: 'Ready!' }
    });

    console.log(`✅ Ready! Model: ${modelId} | Mode: API | Enhancement: ${img2imgPipeline ? 'Local' : 'N/A'}`);

    self.postMessage({
      type: 'MODEL_LOADED',
      payload: { 
        modelId, 
        modelRepo,
        engine: 'api',
        capabilities: {
          textToImage: 'api',
          imageEnhancement: img2imgPipeline ? 'local' : 'none'
        }
      }
    });

  } catch (error) {
    console.error('❌ Model loading error:', error);
    self.postMessage({
      type: 'MODEL_ERROR',
      payload: { modelId, error: error.message }
    });
  }
}

async function generate(payload) {
  const { 
    prompt, 
    negativePrompt = '', 
    steps = 20, 
    guidanceScale = 7.5,
    width = 512,
    height = 512,
    seed = -1,
    sourceImage = null,
    strength = 0.75
  } = payload;

  if (!currentModel) {
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: 'No model selected. Please select a model first.' }
    });
    return;
  }

  self.postMessage({
    type: 'GENERATION_STARTED',
    payload: { prompt }
  });

  // Image Enhancement mode (local)
  if (sourceImage && img2imgPipeline) {
    console.log('🖼️ Image Enhancement mode (local WebGPU)');
    try {
      await enhanceImageLocally(sourceImage);
      return;
    } catch (err) {
      console.warn('⚠️ Local enhancement failed:', err.message);
    }
  }

  // ========== LOCAL TEXT-TO-IMAGE (2025) ==========
  if (currentModel.engine === 'local' && textToImagePipeline) {
    console.log('🖥️ Generating locally with WebGPU...');
    try {
      await generateLocally(payload);
      return;
    } catch (err) {
      console.warn('⚠️ Local generation failed, trying API:', err.message);
    }
  }

  // ========== CLOUD API FALLBACK ==========
  console.log('☁️ Generating via Pollinations.ai API...');
  await generateViaAPI(payload);
}

// ========== LOCAL GENERATION (2025) ==========
async function generateLocally(payload) {
  const { 
    prompt, 
    negativePrompt = '', 
    steps = 4, // Turbo models work with 1-4 steps
    guidanceScale = 1.0, // Turbo models use low guidance
    width = 512,
    height = 512,
    seed = -1
  } = payload;

  if (!textToImagePipeline) {
    throw new Error('Local pipeline not loaded');
  }

  try {
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
    
    console.log(`🖥️ Local: ${steps} steps | ${width}x${height} | Seed: ${actualSeed}`);

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 10, mode: 'local', message: 'Starting local generation...' }
    });

    // Generate with the local pipeline
    const output = await textToImagePipeline(prompt, {
      negative_prompt: negativePrompt,
      num_inference_steps: steps,
      guidance_scale: guidanceScale,
      width: width,
      height: height,
      callback: (step, totalSteps) => {
        const progress = Math.round((step / totalSteps) * 80) + 10;
        self.postMessage({
          type: 'GENERATION_PROGRESS',
          payload: { 
            progress, 
            mode: 'local',
            step: step,
            totalSteps: totalSteps
          }
        });
      }
    });

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 90, mode: 'local', message: 'Processing result...' }
    });

    // Handle output - could be RawImage, Blob, or array
    let imageUrl;
    if (output?.images?.[0]) {
      const img = output.images[0];
      if (img.toBlob) {
        const blob = await img.toBlob();
        imageUrl = URL.createObjectURL(blob);
      } else if (img instanceof Blob) {
        imageUrl = URL.createObjectURL(img);
      } else if (typeof img === 'string') {
        imageUrl = img;
      }
    } else if (output instanceof Blob) {
      imageUrl = URL.createObjectURL(output);
    } else if (output?.toBlob) {
      const blob = await output.toBlob();
      imageUrl = URL.createObjectURL(blob);
    }

    if (!imageUrl) {
      throw new Error('Could not extract image from output');
    }

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 100, mode: 'local' }
    });

    self.postMessage({
      type: 'GENERATION_COMPLETE',
      payload: { 
        imageUrl, 
        mode: 'local',
        model: currentModel.id,
        seed: actualSeed,
        info: '🖥️ Generated locally with WebGPU!'
      }
    });

    console.log('✅ Local generation complete!');
    
  } catch (error) {
    console.error('❌ Local generation error:', error);
    throw error;
  }
}

// ========== API GENERATION (Pollinations.ai) ==========
async function generateViaAPI(payload) {
  const { 
    prompt, 
    negativePrompt = '', 
    width = 512,
    height = 512,
    seed = -1
  } = payload;

  try {
    // Progress simulation
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress = Math.min(85, currentProgress + 8);
      self.postMessage({
        type: 'GENERATION_PROGRESS',
        payload: { progress: currentProgress, mode: 'api' }
      });
    }, 500);

    // Calculate seed
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
    
    // For API models, use the repo directly; for local models falling back, use 'flux'
    const model = currentModel.engine === 'api' ? (currentModel.repo || 'flux') : 'flux';
    
    // Build URL
    const encodedPrompt = encodeURIComponent(prompt);
    let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${actualSeed}&model=${model}&nologo=true`;
    
    if (negativePrompt) {
      url += `&negative=${encodeURIComponent(negativePrompt)}`;
    }

    console.log(`☁️ API: ${model} | Size: ${width}x${height} | Seed: ${actualSeed}`);

    // Fetch with retry
    let response;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url);
        if (response.ok) break;
        
        if (response.status >= 500 && attempt < maxRetries) {
          console.warn(`⚠️ API Error ${response.status}, retry ${attempt}/${maxRetries}...`);
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw new Error(`API Error: ${response.status}`);
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
    
    clearInterval(progressInterval);

    if (!response?.ok) {
      throw new Error('Generation failed after retries');
    }

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 100, mode: 'api' }
    });

    self.postMessage({
      type: 'GENERATION_COMPLETE',
      payload: { 
        imageUrl, 
        mode: 'api',
        model: model,
        seed: actualSeed,
        info: '☁️ Generated via Pollinations.ai'
      }
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: error.message }
    });
  }
}

// ========== LOCAL IMAGE ENHANCEMENT ==========
async function enhanceImageLocally(imageData) {
  if (!img2imgPipeline) {
    throw new Error('Enhancement pipeline not loaded');
  }

  try {
    console.log('✨ Enhancing image locally...');
    
    let imageBlob;
    if (imageData.startsWith('data:') || imageData.startsWith('blob:')) {
      const response = await fetch(imageData);
      imageBlob = await response.blob();
    } else {
      throw new Error('Unsupported image format');
    }

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 30, mode: 'local' }
    });

    const result = await img2imgPipeline(imageBlob);
    
    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 90, mode: 'local' }
    });

    // Convert result to URL
    let imageUrl;
    if (result instanceof Blob) {
      imageUrl = URL.createObjectURL(result);
    } else if (result?.images?.[0]) {
      const img = result.images[0];
      imageUrl = img instanceof Blob ? URL.createObjectURL(img) : img;
    } else if (typeof result === 'string') {
      imageUrl = result;
    } else {
      throw new Error('Unexpected result format');
    }

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 100, mode: 'local' }
    });

    self.postMessage({
      type: 'GENERATION_COMPLETE',
      payload: { 
        imageUrl, 
        mode: 'local',
        info: '✨ Enhanced with WebGPU'
      }
    });

    console.log('✅ Enhancement complete!');
    
  } catch (error) {
    console.error('❌ Enhancement error:', error);
    throw error;
  }
}
