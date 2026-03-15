# SDXL ONNX + WebGPU — Resumen (Feb 2025)

Los modelos **SDXL ONNX de Hugging Face** (`onnxruntime/sdxl-turbo`) **no funcionan en el navegador** (ni WebGPU ni WASM).

**Motivo:** Usan el operador `com.microsoft.NhwcConv`, optimizado para CUDA/DirectML, que no está implementado en ONNX Runtime Web.

**Para el futuro:** Cuando existan modelos ONNX exportados para WebGPU (sin NhwcConv ni otras optimizaciones CUDA), se podrán integrar siguiendo el mismo patrón que SD-Turbo en web-txt2img. Mientras tanto, los modelos compatibles en CozyUI son **SD-Turbo** y **Janus-Pro 1B**.
