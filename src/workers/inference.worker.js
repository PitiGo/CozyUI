// Web Worker for AI Inference
// Supports both local WebGPU (via Transformers.js) and API fallback (Pollinations.ai)

import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js to use local models
env.allowLocalModels = true;
env.allowRemoteModels = false; // We'll download models ourselves

let currentModel = null;
let currentPipeline = null;
let webGPUAvailable = false;
let useLocalInference = false;

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
    case 'SET_INFERENCE_MODE':
      useLocalInference = payload.useLocal;
      self.postMessage({
        type: 'INFERENCE_MODE_SET',
        payload: { mode: useLocalInference ? 'local' : 'api' }
      });
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};

async function checkWebGPU() {
  try {
    // Check if WebGPU is available in the worker context
    // Note: navigator.gpu might not be available in all worker contexts
    // We'll check in the main thread and pass the result
    
    // For now, try to detect via Transformers.js
    const adapter = await navigator.gpu?.requestAdapter();
    
    if (adapter) {
      webGPUAvailable = true;
      self.postMessage({
        type: 'WEBGPU_STATUS',
        payload: { 
          supported: true, 
          info: 'WebGPU Available',
          adapter: adapter.info?.description || 'Unknown'
        }
      });
    } else {
      webGPUAvailable = false;
      self.postMessage({
        type: 'WEBGPU_STATUS',
        payload: { 
          supported: false, 
          reason: 'WebGPU adapter not available',
          fallback: 'Will use API mode'
        }
      });
    }
  } catch (error) {
    webGPUAvailable = false;
    self.postMessage({
      type: 'WEBGPU_STATUS',
      payload: { 
        supported: false, 
        reason: error.message,
        fallback: 'Will use API mode'
      }
    });
  }
}

async function loadModel(payload) {
  const { modelId, modelRepo, useLocal = false } = payload;

  try {
    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 10 }
    });

    currentModel = {
      id: modelId,
      repo: modelRepo
    };

    // If local inference is requested and WebGPU is available
    if (useLocal && webGPUAvailable) {
      await loadModelLocal(modelId, modelRepo);
    } else {
      // API mode - just store reference
      await loadModelAPI(modelId, modelRepo);
    }

  } catch (error) {
    console.error('Model loading error:', error);
    self.postMessage({
      type: 'MODEL_ERROR',
      payload: { modelId, error: error.message }
    });
  }
}

async function loadModelLocal(modelId, modelRepo) {
  try {
    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 30, message: 'Downloading model files...' }
    });

    // TODO: When Transformers.js supports text-to-image in browser:
    // 1. Download model files using modelDownloader
    // 2. Load pipeline with local files from OPFS
    // 3. Initialize WebGPU backend
    
    // For now, this is a placeholder
    // currentPipeline = await pipeline('text-to-image', modelId, {
    //   device: 'webgpu',
    //   dtype: 'q8', // Quantized for faster inference
    //   progress_callback: (progress) => {
    //     self.postMessage({
    //       type: 'MODEL_LOADING',
    //       payload: { modelId, progress: 30 + (progress.loaded / progress.total * 60) }
    //     });
    //   }
    // });

    // Simulate for now - fallback to API
    console.log('⚠️ Local inference not yet implemented, falling back to API');
    await loadModelAPI(modelId, modelRepo);
    
  } catch (error) {
    console.error('Local model loading failed, falling back to API:', error);
    await loadModelAPI(modelId, modelRepo);
  }
}

async function loadModelAPI(modelId, modelRepo) {
  // API mode - just store reference and simulate loading
  await new Promise(resolve => setTimeout(resolve, 300));
  
  self.postMessage({
    type: 'MODEL_LOADING',
    payload: { modelId, progress: 100 }
  });

  self.postMessage({
    type: 'MODEL_LOADED',
    payload: { 
      modelId, 
      modelRepo,
      mode: 'api',
      message: 'Using API mode (Pollinations.ai)'
    }
  });
}

async function generate(payload) {
  const { 
    prompt, 
    negativePrompt = '', 
    steps = 4, 
    guidanceScale = 1,
    width = 512,
    height = 512,
    seed = -1
  } = payload;

  if (!currentModel) {
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: 'No model loaded. Please load a model first.' }
    });
    return;
  }

  // Try local inference first if available
  if (useLocalInference && currentPipeline && webGPUAvailable) {
    try {
      await generateLocal(payload);
      return;
    } catch (error) {
      console.error('Local generation failed, falling back to API:', error);
      // Fall through to API generation
    }
  }

  // Fallback to API generation
  await generateAPI(payload);
}

async function generateLocal(payload) {
  const { prompt, negativePrompt, steps, guidanceScale, width, height, seed } = payload;

  try {
    self.postMessage({
      type: 'GENERATION_STARTED',
      payload: { prompt, mode: 'local' }
    });

    // TODO: When Transformers.js supports text-to-image:
    // const output = await currentPipeline(prompt, {
    //   negative_prompt: negativePrompt,
    //   num_inference_steps: steps,
    //   guidance_scale: guidanceScale,
    //   width,
    //   height,
    //   seed: seed === -1 ? undefined : seed,
    //   callback: (step, timestep, latents) => {
    //     const progress = ((step + 1) / steps) * 100;
    //     self.postMessage({
    //       type: 'GENERATION_PROGRESS',
    //       payload: { step: step + 1, totalSteps: steps, progress }
    //     });
    //   }
    // });
    
    // Convert tensor to image blob
    // const imageBlob = await tensorToBlob(output.images[0]);
    // const imageUrl = URL.createObjectURL(imageBlob);
    
    // self.postMessage({
    //   type: 'GENERATION_COMPLETE',
    //   payload: { imageUrl, mode: 'local' }
    // });

    // For now, throw to trigger fallback
    throw new Error('Local inference not yet implemented');

  } catch (error) {
    throw error;
  }
}

async function generateAPI(payload) {
  const { 
    prompt, 
    negativePrompt = '', 
    steps = 4, 
    guidanceScale = 1,
    width = 512,
    height = 512,
    seed = -1
  } = payload;

  try {
    self.postMessage({
      type: 'GENERATION_STARTED',
      payload: { prompt, mode: 'api' }
    });

    // Progress simulation while waiting for API (smooth incremental)
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      const increment = currentProgress < 50 ? 12 : currentProgress < 80 ? 8 : 3;
      currentProgress = Math.min(90, currentProgress + increment);
      
      self.postMessage({
        type: 'GENERATION_PROGRESS',
        payload: { step: Math.floor(currentProgress / 10), totalSteps: 10, progress: currentProgress }
      });
    }, 400);

    // Use Pollinations.ai API - Free, no CORS, no API key!
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
    
    // Map our model IDs to Pollinations models
    const modelMap = {
      'stable-diffusion-v1-5': 'flux',
      'sd-turbo': 'turbo', 
      'sdxl-turbo': 'flux'
    };
    const pollinationsModel = modelMap[currentModel.id] || 'flux';
    
    // Build the URL
    const encodedPrompt = encodeURIComponent(prompt);
    const encodedNegative = negativePrompt ? encodeURIComponent(negativePrompt) : '';
    
    let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${actualSeed}&model=${pollinationsModel}&nologo=true`;
    
    if (encodedNegative) {
      url += `&negative=${encodedNegative}`;
    }

    console.log('Generating image from API:', url);

    // Fetch with retry logic
    let response;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url);
        
        if (response.ok) {
          break;
        }
        
        if (response.status >= 500 && attempt < maxRetries) {
          console.log(`Attempt ${attempt} failed with ${response.status}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        
        throw new Error(`API Error: ${response.status}`);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries && error.message.includes('fetch')) {
          console.log(`Attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        throw error;
      }
    }
    
    clearInterval(progressInterval);

    if (!response || !response.ok) {
      throw lastError || new Error('Failed after multiple retries');
    }

    // Get the image blob
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { step: 10, totalSteps: 10, progress: 100 }
    });

    self.postMessage({
      type: 'GENERATION_COMPLETE',
      payload: { imageUrl, mode: 'api' }
    });
  } catch (error) {
    console.error('Generation error:', error);
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: error.message }
    });
  }
}
