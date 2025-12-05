import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'webdiffusion-gallery';
const MAX_IMAGES = 50;

export function useGallery() {
  const [images, setImages] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setImages(parsed);
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
  }, []);

  // Save to localStorage when images change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
    } catch (error) {
      console.error('Error saving gallery:', error);
    }
  }, [images]);

  const addImage = useCallback((imageData) => {
    const newImage = {
      id: Date.now().toString(),
      url: imageData.url,
      prompt: imageData.prompt || '',
      negativePrompt: imageData.negativePrompt || '',
      width: imageData.width || 512,
      height: imageData.height || 512,
      seed: imageData.seed,
      model: imageData.model,
      timestamp: Date.now()
    };

    setImages(prev => {
      const updated = [newImage, ...prev];
      // Keep only last MAX_IMAGES
      return updated.slice(0, MAX_IMAGES);
    });

    return newImage;
  }, []);

  const deleteImage = useCallback((id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const clearGallery = useCallback(() => {
    setImages([]);
  }, []);

  return {
    images,
    addImage,
    deleteImage,
    clearGallery
  };
}

