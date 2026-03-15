// Available models list (exported for use in components)
// 100% Local – NO APIs – Uses web-txt2img + WebGPU
export const AVAILABLE_MODELS = [
    // ═══════════════════════════════════════════════════════════════════
    // FUNCIONALES – 100% Local via web-txt2img + WebGPU
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'sd-turbo',
        name: 'SD-Turbo',
        repo: 'sd-turbo',                  // web-txt2img model ID
        engine: 'local-txt2img',           // uses txt2imgService
        description: '🖥️ 100% Local · 1-step · Fast',
        size: '~1.7GB',
        local: true,
        status: 'working',                 // ✅ Confirmed working
        note: 'Single-step Stable Diffusion via ONNX Runtime Web + WebGPU'
    },
    {
        id: 'janus-pro-1b',
        name: 'Janus-Pro 1B',
        repo: 'janus-pro-1b',             // web-txt2img model ID
        engine: 'local-txt2img',
        description: '🖥️ 100% Local · Multimodal · 1B',
        size: '~1.5GB',
        local: true,
        status: 'working',                 // ✅ Confirmed working
        note: 'DeepSeek Janus-Pro via Transformers.js + WebGPU'
    },

    // ═══════════════════════════════════════════════════════════════════
    // FUNCIONAL – Super-Resolution local (Transformers.js worker)
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'local-super-resolution',
        name: 'Image Enhancer (2x)',
        repo: 'Xenova/swin2SR-classical-sr-x2-64',
        engine: 'local-enhance',           // uses existing worker
        description: '🖥️ 100% Local · Super-Resolution',
        size: '~50MB',
        local: true,
        status: 'working',
        note: 'Image enhancement only – not text-to-image'
    },
    // ═══════════════════════════════════════════════════════════════════
    // PENDING – Not yet available in compatible format
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'sdxl-turbo-pending',
        name: 'SDXL-Turbo (Pending)',
        repo: '',
        engine: 'pending',
        description: 'Pending – ONNX not available',
        size: '~3GB',
        local: true,
        status: 'pending',
        disabled: true,
        note: 'Awaiting browser-compatible ONNX conversion'
    },
    {
        id: 'sd-1.5-pending',
        name: 'SD 1.5 Local (Pending)',
        repo: '',
        engine: 'pending',
        description: 'Pending – ONNX not available',
        size: '~2GB',
        local: true,
        status: 'pending',
        disabled: true,
        note: 'Awaiting Transformers.js-compatible ONNX models'
    }
];
