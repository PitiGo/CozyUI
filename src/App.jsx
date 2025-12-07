import { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './components/nodes';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import { ToastContainer } from './components/Toast';
import { StoreProvider, useStore } from './store/useStore.jsx';
import { useGallery } from './hooks/useGallery.jsx';
import { useToast } from './hooks/useToast.jsx';
import { useWorkflow } from './hooks/useWorkflow.jsx';

// Initial nodes for demo
const initialNodes = [
  {
    id: 'prompt-1',
    type: 'promptNode',
    position: { x: 100, y: 150 },
    data: { 
      prompt: 'A cyberpunk city at night, neon lights reflecting on wet streets, towering skyscrapers, flying cars, cinematic lighting, 8k, highly detailed',
      negativePrompt: 'blurry, low quality, distorted, ugly, watermark'
    },
  },
  {
    id: 'model-1',
    type: 'modelLoaderNode',
    position: { x: 100, y: 420 },
    data: { 
      selectedModel: {
        id: 'sd-turbo-small',
        name: 'SD Turbo Small',
        repo: 'Xenova/sd-turbo',
        engine: 'local',
        description: '⚡ Fast local, ~400MB'
      },
      modelStatus: 'idle',
      loadProgress: 0
    },
  },
  {
    id: 'inference-1',
    type: 'inferenceNode',
    position: { x: 500, y: 250 },
    data: { 
      steps: 20,
      guidanceScale: 7.5,
      seed: -1,
      width: 512,
      height: 512,
      isGenerating: false,
      progress: 0
    },
  },
  {
    id: 'output-1',
    type: 'imageDisplayNode',
    position: { x: 900, y: 250 },
    data: { 
      imageUrl: null,
      isLoading: false
    },
  },
];

const initialEdges = [
  {
    id: 'e-prompt-inference',
    source: 'prompt-1',
    target: 'inference-1',
    sourceHandle: 'prompt-out',
    targetHandle: 'prompt-in',
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
  },
  {
    id: 'e-model-inference',
    source: 'model-1',
    target: 'inference-1',
    sourceHandle: 'model-out',
    targetHandle: 'model-in',
    animated: true,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
  },
  {
    id: 'e-inference-output',
    source: 'inference-1',
    target: 'output-1',
    sourceHandle: 'image-out',
    targetHandle: 'image-in',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
  },
];

let id = 0;
const getId = () => `node_${id++}`;

// Get edge color based on source handle
function getEdgeColor(sourceHandle) {
  const colors = {
    'prompt-out': '#6366f1',
    'model-out': '#8b5cf6',
    'image-out': '#10b981',
    'seed-out': '#06b6d4',
    'size-out': '#0ea5e9'
  };
  return colors[sourceHandle] || '#6366f1';
}

function Flow() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const { state, actions } = useStore();
  
  // Gallery, Toast, and Workflow hooks
  const { images: galleryImages, addImage, deleteImage, clearGallery } = useGallery();
  const toast = useToast();
  const { exportWorkflow, loadFromFile } = useWorkflow();

  // Refs to track previous values and avoid infinite loops
  const prevModelStatus = useRef(state.model.status);
  const prevModelProgress = useRef(state.model.progress);
  const prevGenStatus = useRef(state.generation.status);
  const prevImageUrl = useRef(state.generation.imageUrl);
  const prevModelStatusForToast = useRef(null);
  const prevGenError = useRef(null);

  // Sync store state with model loader node
  useEffect(() => {
    if (prevModelStatus.current === state.model.status && 
        prevModelProgress.current === state.model.progress) return;
    prevModelStatus.current = state.model.status;
    prevModelProgress.current = state.model.progress;
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'modelLoaderNode') {
          return {
            ...node,
            data: { ...node.data, modelStatus: state.model.status, loadProgress: state.model.progress },
          };
        }
        return node;
      })
    );
  }, [state.model.status, state.model.progress, setNodes]);

  // Update inference node when generation status changes
  useEffect(() => {
    if (prevGenStatus.current === state.generation.status) return;
    prevGenStatus.current = state.generation.status;
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'inferenceNode') {
          return {
            ...node,
            data: { ...node.data, isGenerating: state.generation.status === 'generating', progress: state.generation.progress },
          };
        }
        return node;
      })
    );
  }, [state.generation.status, state.generation.progress, setNodes]);

  // Update output node and gallery when image is generated
  useEffect(() => {
    if (!state.generation.imageUrl || state.generation.status !== 'complete') return;
    if (prevImageUrl.current === state.generation.imageUrl) return;
    prevImageUrl.current = state.generation.imageUrl;
    
    // Update output node
    setNodes((nds) => nds.map((node) => {
      if (node.type === 'imageDisplayNode') {
        return { ...node, data: { ...node.data, imageUrl: state.generation.imageUrl, isLoading: false } };
      }
      return node;
    }));

    // Add to gallery (async - get node data first)
    setNodes((nds) => {
      const promptNode = nds.find(n => n.type === 'promptNode');
      const inferenceNode = nds.find(n => n.type === 'inferenceNode');
      
      // Call addImage async (don't await, just fire and forget)
      addImage({
        url: state.generation.imageUrl,
        prompt: promptNode?.data?.prompt || '',
        negativePrompt: promptNode?.data?.negativePrompt || '',
        width: inferenceNode?.data?.width || 512,
        height: inferenceNode?.data?.height || 512,
        seed: inferenceNode?.data?.seed,
      });
      
      return nds; // Return unchanged
    });

    toast.success('Image generated! ✨');
  }, [state.generation.imageUrl, state.generation.status, setNodes, addImage, toast]);

  // Handle generation errors
  useEffect(() => {
    if (state.generation.status === 'error' && state.generation.error && prevGenError.current !== state.generation.error) {
      prevGenError.current = state.generation.error;
      toast.error(`Error: ${state.generation.error}`);
    }
  }, [state.generation.status, state.generation.error, toast]);

  // Handle model/API ready - only show toast on status change
  useEffect(() => {
    if (prevModelStatusForToast.current === state.model.status) return;
    const wasLoading = prevModelStatusForToast.current === 'loading';
    prevModelStatusForToast.current = state.model.status;
    
    if (state.model.status === 'loaded' && wasLoading) {
      toast.success('Ready! ✓');
    } else if (state.model.status === 'error') {
      toast.error(`Failed: ${state.model.error}`);
    }
  }, [state.model.status, state.model.error, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter = Generate
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunWorkflow();
      }
      // Ctrl/Cmd + R = Reset (prevent browser refresh)
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleClearCanvas();
        toast.info('Canvas reset');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, state.model.status]);

  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      let strokeColor = '#6366f1';
      
      if (sourceNode?.type === 'modelLoaderNode') strokeColor = '#8b5cf6';
      else if (sourceNode?.type === 'inferenceNode') strokeColor = '#10b981';
      else if (sourceNode?.type === 'promptNode') strokeColor = '#6366f1';

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: strokeColor, strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [nodes, setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: getDefaultNodeData(type),
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const getDefaultNodeData = (type) => {
    switch (type) {
      case 'promptNode':
        return { prompt: '', negativePrompt: '' };
      case 'modelLoaderNode':
        return { 
          selectedModel: {
            id: 'sd-turbo-small',
            name: 'SD Turbo Small',
            repo: 'Xenova/sd-turbo',
            engine: 'local',
            description: '⚡ Fast local, ~400MB'
          },
          modelStatus: 'idle',
          loadProgress: 0
        };
      case 'inferenceNode':
        return { 
          steps: 20,
          guidanceScale: 7.5,
          seed: -1,
          width: 512,
          height: 512,
          isGenerating: false,
          progress: 0
        };
      case 'imageDisplayNode':
        return { imageUrl: null, isLoading: false };
      default:
        return {};
    }
  };

  const handleRunWorkflow = useCallback(() => {
    const promptNode = nodes.find(n => n.type === 'promptNode');
    const modelNode = nodes.find(n => n.type === 'modelLoaderNode');
    const inferenceNode = nodes.find(n => n.type === 'inferenceNode');

    if (!promptNode || !modelNode || !inferenceNode) {
      toast.error('Please connect all required nodes: Prompt, Model, and Inference');
      return;
    }

    if (!promptNode.data?.prompt?.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    // Load/configure model if needed
    if (state.model.status !== 'loaded' || state.model.id !== modelNode.data.selectedModel.id) {
      const selectedModel = modelNode.data.selectedModel;
      actions.loadModel(selectedModel.id, selectedModel.repo, selectedModel.engine || 'api');
      
      if (selectedModel.engine === 'mediapipe') {
        toast.info('Loading local model (this may take a while)...');
      } else {
        toast.info('Connecting to API...');
      }
      return;
    }

    // Generate via API
    toast.info('Sending request to API...');
    actions.generate({
      prompt: promptNode.data.prompt,
      negativePrompt: promptNode.data.negativePrompt,
      steps: inferenceNode.data.steps,
      guidanceScale: inferenceNode.data.guidanceScale,
      width: inferenceNode.data.width,
      height: inferenceNode.data.height,
      seed: inferenceNode.data.seed,
    });
  }, [nodes, state.model.status, actions, toast]);

  const handleClearCanvas = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    actions.resetGeneration();
  }, [setNodes, setEdges, actions]);

  // Workflow handlers
  const handleExportWorkflow = useCallback(() => {
    exportWorkflow(nodes, edges);
    toast.success('Workflow exported!');
  }, [nodes, edges, exportWorkflow, toast]);

  const handleImportWorkflow = useCallback(async () => {
    try {
      const result = await loadFromFile();
      setNodes(result.nodes);
      setEdges(result.edges.map(edge => ({
        ...edge,
        animated: true,
        style: { stroke: getEdgeColor(edge.sourceHandle), strokeWidth: 2 }
      })));
      toast.success(`Workflow "${result.metadata?.name}" imported!`);
    } catch (error) {
      toast.error(error.message);
    }
  }, [loadFromFile, setNodes, setEdges, toast]);

  const handleLoadPreset = useCallback((preset) => {
    setNodes(preset.nodes);
    setEdges(preset.edges.map(edge => ({
      ...edge,
      animated: true,
      style: { stroke: getEdgeColor(edge.sourceHandle), strokeWidth: 2 }
    })));
    actions.resetGeneration();
    toast.success(`Loaded preset: ${preset.name}`);
  }, [setNodes, setEdges, actions, toast]);

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0f]">
      <Sidebar 
        galleryImages={galleryImages}
        onDeleteImage={deleteImage}
        onClearGallery={clearGallery}
      />
      
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <Toolbar 
          onRunWorkflow={handleRunWorkflow}
          onClearCanvas={handleClearCanvas}
          onExportWorkflow={handleExportWorkflow}
          onImportWorkflow={handleImportWorkflow}
          onLoadPreset={handleLoadPreset}
        />
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-[#0a0a0f]"
        >
          <Background 
            color="#1e1e2e" 
            gap={20} 
            size={1}
            variant="dots"
          />
          <Controls 
            position="bottom-right"
            style={{ marginBottom: '40px' }}
          />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'promptNode': return '#6366f1';
                case 'modelLoaderNode': return '#8b5cf6';
                case 'inferenceNode': return '#f59e0b';
                case 'imageDisplayNode': return '#10b981';
                default: return '#64748b';
              }
            }}
            maskColor="rgba(0, 0, 0, 0.8)"
            style={{ 
              backgroundColor: '#12121a',
              marginBottom: '40px'
            }}
          />
        </ReactFlow>
        
        <StatusBar />
        
        {/* Toast Notifications */}
        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      </div>
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </StoreProvider>
  );
}

export default App;
