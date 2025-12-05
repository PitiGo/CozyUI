// Web Worker for AI Inference
// Uses Pollinations.ai API (free, no CORS issues, no API key needed)

let currentModel = null;

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
        self.postMessage({
          type: 'WEBGPU_STATUS',
          payload: { supported: true, info: 'WebGPU Available' }
        });
        return;
      }
    }
    self.postMessage({
      type: 'WEBGPU_STATUS',
      payload: { supported: false, reason: 'WebGPU not available in worker' }
    });
  } catch (error) {
    self.postMessage({
      type: 'WEBGPU_STATUS',
      payload: { supported: false, reason: error.message }
    });
  }
}

async function loadModel(payload) {
  const { modelId, modelRepo } = payload;

  try {
    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 50 }
    });

    // For Pollinations API, we just store the model reference
    currentModel = {
      id: modelId,
      repo: modelRepo
    };

    // Simulate loading progress
    await new Promise(resolve => setTimeout(resolve, 300));
    
    self.postMessage({
      type: 'MODEL_LOADING',
      payload: { modelId, progress: 100 }
    });

    self.postMessage({
      type: 'MODEL_LOADED',
      payload: { modelId, modelRepo }
    });
  } catch (error) {
    console.error('Model loading error:', error);
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

  try {
    self.postMessage({
      type: 'GENERATION_STARTED',
      payload: { prompt }
    });

    // Progress simulation while waiting for API (smooth incremental)
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      // Increment by 5-15% each time, but slow down as we approach 90%
      const increment = currentProgress < 50 ? 12 : currentProgress < 80 ? 8 : 3;
      currentProgress = Math.min(90, currentProgress + increment);
      
      self.postMessage({
        type: 'GENERATION_PROGRESS',
        payload: { step: Math.floor(currentProgress / 10), totalSteps: 10, progress: currentProgress }
      });
    }, 400);

    // Use Pollinations.ai API - Free, no CORS, no API key!
    // Format: https://image.pollinations.ai/prompt/{prompt}?width={w}&height={h}&seed={s}&model={m}&negative={neg}
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
    
    // Map our model IDs to Pollinations models
    const modelMap = {
      'stable-diffusion-v1-5': 'flux',
      'sd-turbo': 'turbo', 
      'sdxl-turbo': 'flux'
    };
    const pollinationsModel = modelMap[currentModel.id] || 'flux';
    
    // Build the URL with encoded prompt
    const encodedPrompt = encodeURIComponent(prompt);
    const encodedNegative = negativePrompt ? encodeURIComponent(negativePrompt) : '';
    
    let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${actualSeed}&model=${pollinationsModel}&nologo=true`;
    
    if (encodedNegative) {
      url += `&negative=${encodedNegative}`;
    }

    console.log('Generating image from:', url);

    // Fetch with retry logic
    let response;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url);
        
        if (response.ok) {
          break; // Success, exit retry loop
        }
        
        // If server error (5xx), retry
        if (response.status >= 500 && attempt < maxRetries) {
          console.log(`Attempt ${attempt} failed with ${response.status}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Wait 2s, 4s, 6s
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
      payload: { imageUrl }
    });
  } catch (error) {
    console.error('Generation error:', error);
    self.postMessage({
      type: 'GENERATION_ERROR',
      payload: { error: error.message }
    });
  }
}
