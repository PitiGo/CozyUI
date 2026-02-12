import { useCallback } from 'react';

export function useWorkflow() {

  const exportWorkflow = useCallback((nodes, edges) => {
    const workflow = {
      version: '1.0.0',
      name: `workflow-${Date.now()}`,
      createdAt: new Date().toISOString(),
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: sanitizeNodeData(node.data)
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
      }))
    };

    const json = JSON.stringify(workflow, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflow.name}.json`;
    link.click();

    URL.revokeObjectURL(url);

    return workflow;
  }, []);

  const importWorkflow = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const workflow = JSON.parse(e.target.result);

          // Validate workflow structure
          if (!workflow.nodes || !workflow.edges) {
            throw new Error('Invalid workflow file: missing nodes or edges');
          }

          // Reconstruct nodes with proper styling
          const nodes = workflow.nodes.map(node => ({
            ...node,
            data: node.data || {}
          }));

          // Reconstruct edges with styling
          const edges = workflow.edges.map(edge => ({
            ...edge,
            animated: true,
            style: { stroke: getEdgeColor(edge.sourceHandle), strokeWidth: 2 }
          }));

          resolve({ nodes, edges, metadata: { name: workflow.name, createdAt: workflow.createdAt } });
        } catch (error) {
          reject(new Error('Failed to parse workflow file: ' + error.message));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  const loadFromFile = useCallback(() => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          try {
            const result = await importWorkflow(file);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }
      };

      input.click();
    });
  }, [importWorkflow]);

  return {
    exportWorkflow,
    importWorkflow,
    loadFromFile
  };
}

// Helper to remove non-serializable data
function sanitizeNodeData(data) {
  const sanitized = { ...data };

  // Remove blob URLs (they won't work after reload)
  if (sanitized.imageUrl && sanitized.imageUrl.startsWith('blob:')) {
    delete sanitized.imageUrl;
  }

  return sanitized;
}

// Get edge color based on source handle
export function getEdgeColor(sourceHandle) {
  const colors = {
    'prompt-out': '#6366f1',
    'model-out': '#8b5cf6',
    'image-out': '#10b981',
    'seed-out': '#06b6d4',
    'size-out': '#0ea5e9',
    'inpaint-out': '#8b5cf6',
    'bg-removed-out': '#f43f5e',
  };
  return colors[sourceHandle] || '#6366f1';
}

// Preset workflows
export const presetWorkflows = [
  {
    id: 'basic-txt2img',
    name: 'Basic Text to Image',
    description: 'Simple prompt → model → generate → output',
    nodes: [
      {
        id: 'prompt-1',
        type: 'promptNode',
        position: { x: 100, y: 200 },
        data: { prompt: '', negativePrompt: '' }
      },
      {
        id: 'model-1',
        type: 'modelLoaderNode',
        position: { x: 100, y: 450 },
        data: {
          selectedModel: { id: 'sd-turbo', name: 'SD Turbo', repo: 'Xenova/sd-turbo' },
          modelStatus: 'idle'
        }
      },
      {
        id: 'inference-1',
        type: 'inferenceNode',
        position: { x: 500, y: 300 },
        data: { steps: 4, guidanceScale: 1, seed: -1, width: 512, height: 512 }
      },
      {
        id: 'output-1',
        type: 'imageDisplayNode',
        position: { x: 900, y: 300 },
        data: { imageUrl: null }
      }
    ],
    edges: [
      { id: 'e1', source: 'prompt-1', target: 'inference-1', sourceHandle: 'prompt-out', targetHandle: 'prompt-in' },
      { id: 'e2', source: 'model-1', target: 'inference-1', sourceHandle: 'model-out', targetHandle: 'model-in' },
      { id: 'e3', source: 'inference-1', target: 'output-1', sourceHandle: 'image-out', targetHandle: 'image-in' }
    ]
  },
  {
    id: 'with-seed',
    name: 'With Seed Control',
    description: 'Basic workflow + seed generator for reproducible results',
    nodes: [
      {
        id: 'prompt-1',
        type: 'promptNode',
        position: { x: 100, y: 150 },
        data: { prompt: '', negativePrompt: '' }
      },
      {
        id: 'seed-1',
        type: 'seedNode',
        position: { x: 100, y: 400 },
        data: { seed: -1, isLocked: false }
      },
      {
        id: 'model-1',
        type: 'modelLoaderNode',
        position: { x: 100, y: 600 },
        data: {
          selectedModel: { id: 'sd-turbo', name: 'SD Turbo', repo: 'Xenova/sd-turbo' },
          modelStatus: 'idle'
        }
      },
      {
        id: 'inference-1',
        type: 'inferenceNode',
        position: { x: 500, y: 300 },
        data: { steps: 4, guidanceScale: 1, seed: -1, width: 512, height: 512 }
      },
      {
        id: 'output-1',
        type: 'imageDisplayNode',
        position: { x: 900, y: 300 },
        data: { imageUrl: null }
      }
    ],
    edges: [
      { id: 'e1', source: 'prompt-1', target: 'inference-1', sourceHandle: 'prompt-out', targetHandle: 'prompt-in' },
      { id: 'e2', source: 'model-1', target: 'inference-1', sourceHandle: 'model-out', targetHandle: 'model-in' },
      { id: 'e3', source: 'inference-1', target: 'output-1', sourceHandle: 'image-out', targetHandle: 'image-in' }
    ]
  },
  {
    id: 'img2img',
    name: 'Image to Image',
    description: 'Transform an existing image with AI',
    nodes: [
      {
        id: 'img2img-1',
        type: 'img2imgNode',
        position: { x: 100, y: 200 },
        data: { strength: 0.75 }
      },
      {
        id: 'prompt-1',
        type: 'promptNode',
        position: { x: 100, y: 500 },
        data: { prompt: '', negativePrompt: '' }
      },
      {
        id: 'model-1',
        type: 'modelLoaderNode',
        position: { x: 450, y: 500 },
        data: {
          selectedModel: { id: 'sd-turbo', name: 'SD Turbo', repo: 'Xenova/sd-turbo' },
          modelStatus: 'idle'
        }
      },
      {
        id: 'inference-1',
        type: 'inferenceNode',
        position: { x: 500, y: 200 },
        data: { steps: 4, guidanceScale: 1, seed: -1, width: 512, height: 512 }
      },
      {
        id: 'output-1',
        type: 'imageDisplayNode',
        position: { x: 900, y: 200 },
        data: { imageUrl: null }
      }
    ],
    edges: [
      { id: 'e1', source: 'prompt-1', target: 'inference-1', sourceHandle: 'prompt-out', targetHandle: 'prompt-in' },
      { id: 'e2', source: 'model-1', target: 'inference-1', sourceHandle: 'model-out', targetHandle: 'model-in' },
      { id: 'e3', source: 'inference-1', target: 'output-1', sourceHandle: 'image-out', targetHandle: 'image-in' }
    ]
  }
];

