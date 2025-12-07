// Web Worker for AI Inference
// 2025 Update: Local WebGPU with Janus multimodal models
// Supports both local WebGPU models and cloud API fallback

import { 
  pipeline, 
  env,
  AutoModelForVision2Seq,
  AutoProcessor,
  RawImage
} from '@huggingface/transformers';

// Configure Transformers.js for 2025
env.allowLocalModels = false;
env.useBrowserCache = true;

let currentModel = null;
let janusModel = null; // For Janus multimodal generation
let janusProcessor = null;
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
              textToImage: 'local',
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
          textToImage: 'api',
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

    // ========== LOCAL JANUS MODEL (2025) ==========
    if (engine === 'local' && webGPUAvailable) {
      console.log('🖥️ Loading Janus multimodal model...');
      
      try {
        self.postMessage({
          type: 'MODEL_LOADING',
          payload: { modelId, progress: 20, message: 'Loading Janus model (this may take a while)...' }
        });

        // Load Janus model with WebGPU
        janusModel = await AutoModelForVision2Seq.from_pretrained(modelRepo, {
          device: 'webgpu',
          dtype: 'q4', // Quantized for web performance
          progress_callback: (progress) => {
            if (progress.status === 'progress' || progress.status === 'download') {
              const pct = 20 + Math.round((progress.progress || 0) * 0.5);
              self.postMessage({
                type: 'MODEL_LOADING',
                payload: { 
                  modelId, 
                  progress: pct,
                  message: `Downloading model: ${Math.round(progress.progress || 0)}%`
                }
              });
            }
          }
        });

        self.postMessage({
          type: 'MODEL_LOADING',
          payload: { modelId, progress: 75, message: 'Loading processor...' }
        });

        janusProcessor = await AutoProcessor.from_pretrained(modelRepo);

        console.log('✅ Janus model loaded!');

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
        console.warn('⚠️ Local Janus model failed, falling back to API:', err.message);
        janusModel = null;
        janusProcessor = null;
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
                  message: `Loading enhancer: ${Math.round(progress.progress || 0)}%`
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

  // ========== LOCAL JANUS GENERATION (2025) ==========
  if (currentModel.engine === 'local' && janusModel && janusProcessor) {
    console.log('🖥️ Generating with Janus (local WebGPU)...');
    try {
      await generateWithJanus(payload);
      return;
    } catch (err) {
      console.warn('⚠️ Janus generation failed, trying API:', err.message);
    }
  }

  // ========== CLOUD API FALLBACK ==========
  console.log('☁️ Generating via Pollinations.ai API...');
  await generateViaAPI(payload);
}

// ========== JANUS LOCAL GENERATION (2025) ==========
async function generateWithJanus(payload) {
  const { 
    prompt, 
    width = 384,
    height = 384,
    seed = -1
  } = payload;

  if (!janusModel || !janusProcessor) {
    throw new Error('Janus model not loaded');
  }

  try {
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 2147483647) : seed;
    
    console.log(`🖥️ Janus: ${width}x${height} | Seed: ${actualSeed}`);

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 10, mode: 'local', message: 'Preparing generation...' }
    });

    // Prepare the generation prompt for Janus
    const conversation = [
      {
        role: "user",
        content: `Generate an image: ${prompt}`
      }
    ];

    // Apply chat template
    const inputs = await janusProcessor(conversation);

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 30, mode: 'local', message: 'Generating...' }
    });

    // Generate with Janus
    const outputs = await janusModel.generate({
      ...inputs,
      max_new_tokens: 512,
      do_sample: true,
    });

    self.postMessage({
      type: 'GENERATION_PROGRESS',
      payload: { progress: 80, mode: 'local', message: 'Processing output...' }
    });

    // Decode the output
    const decoded = janusProcessor.batch_decode(outputs, { skip_special_tokens: true });
    
    // Extract image from output (Janus outputs base64 or image tokens)
    let imageUrl;
    
    // Check if output contains image data
    if (decoded[0] && decoded[0].includes('data:image')) {
      // Extract base64 image
      const match = decoded[0].match(/data:image\/[^;]+;base64,[^"'\s]+/);
      if (match) {
        imageUrl = match[0];
      }
    }

    if (!imageUrl) {
      // Fallback: Try to extract image from model output directly
      if (outputs.images && outputs.images.length > 0) {
        const img = outputs.images[0];
        if (img.toBlob) {
          const blob = await img.toBlob();
          imageUrl = URL.createObjectURL(blob);
        }
      }
    }

    if (!imageUrl) {
      throw new Error('Could not extract image from Janus output');
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
        info: '🖥️ Generated locally with Janus + WebGPU!'
      }
    });

    console.log('✅ Janus generation complete!');
    
  } catch (error) {
    console.error('❌ Janus generation error:', error);
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
