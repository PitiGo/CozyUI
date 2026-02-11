import PromptNode from './PromptNode';
import ModelLoaderNode from './ModelLoaderNode';
import InferenceNode from './InferenceNode';
import ImageDisplayNode from './ImageDisplayNode';
import Img2ImgNode from './Img2ImgNode';
import SeedNode from './SeedNode';
import ImageResizeNode from './ImageResizeNode';
import BackgroundRemovalNode from './BackgroundRemovalNode';
import InpaintingNode from './InpaintingNode';

export const nodeTypes = {
  promptNode: PromptNode,
  modelLoaderNode: ModelLoaderNode,
  inferenceNode: InferenceNode,
  imageDisplayNode: ImageDisplayNode,
  img2imgNode: Img2ImgNode,
  seedNode: SeedNode,
  imageResizeNode: ImageResizeNode,
  backgroundRemovalNode: BackgroundRemovalNode,
  inpaintingNode: InpaintingNode,
};

export {
  PromptNode,
  ModelLoaderNode,
  InferenceNode,
  ImageDisplayNode,
  Img2ImgNode,
  SeedNode,
  ImageResizeNode,
  BackgroundRemovalNode,
  InpaintingNode
};
