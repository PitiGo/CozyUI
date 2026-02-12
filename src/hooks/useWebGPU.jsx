import { useState, useEffect } from 'react';

export function useWebGPU() {
  const [status, setStatus] = useState({
    supported: null,
    checking: true,
    info: null,
    error: null
  });

  useEffect(() => {
    async function checkWebGPU() {
      try {
        // Check if WebGPU is available
        if (!navigator.gpu) {
          setStatus({
            supported: false,
            checking: false,
            info: 'WebGPU API not available in this browser',
            error: null
          });
          return;
        }

        // Request adapter
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          setStatus({
            supported: false,
            checking: false,
            info: 'No WebGPU adapter found',
            error: null
          });
          return;
        }

        // Get adapter info
        const adapterInfo = await adapter.requestAdapterInfo?.() || {};

        setStatus({
          supported: true,
          checking: false,
          info: {
            vendor: adapterInfo.vendor || 'Unknown',
            architecture: adapterInfo.architecture || 'Unknown',
            device: adapterInfo.device || 'Unknown',
            description: adapterInfo.description || 'WebGPU Ready'
          },
          error: null
        });

      } catch (error) {
        setStatus({
          supported: false,
          checking: false,
          info: null,
          error: error.message
        });
      }
    }

    checkWebGPU();
  }, []);

  return status;
}

