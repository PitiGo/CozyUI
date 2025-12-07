import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'cozyui-gallery';
const MAX_IMAGES = 20; // Reduced to avoid localStorage limits with base64

// Unique ID generator
let imageIdCounter = 0;
const generateId = () => `img_${Date.now()}_${++imageIdCounter}_${Math.random().toString(36).slice(2, 7)}`;

// Convert blob URL or image URL to base64
async function urlToBase64(url) {
  try {
    // If already base64, return as is
    if (url.startsWith('data:')) return url;
    
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting to base64:', error);
    return url; // Return original if conversion fails
  }
}

export function useGallery() {
  const [images, setImages] = useState([]);
  const isAddingRef = useRef(false);
  const isLoadedRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      console.log('📂 Loading gallery from localStorage:', saved ? 'Found data' : 'Empty');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Filter out any invalid entries (must have url starting with data: for persistence)
        const validImages = parsed.filter(img => img && img.url && img.id && img.url.startsWith('data:'));
        console.log(`📂 Loaded ${validImages.length} valid images from gallery`);
        setImages(validImages);
      }
      isLoadedRef.current = true;
    } catch (error) {
      console.error('Error loading gallery:', error);
      isLoadedRef.current = true;
    }
  }, []);

  // Save to localStorage when images change (only after initial load)
  useEffect(() => {
    if (!isLoadedRef.current) return;
    
    try {
      const dataToSave = JSON.stringify(images);
      console.log('💾 Saving gallery:', images.length, 'images,', Math.round(dataToSave.length / 1024), 'KB');
      localStorage.setItem(STORAGE_KEY, dataToSave);
    } catch (error) {
      console.error('Error saving gallery:', error);
      // If storage is full, try removing oldest images
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ Storage full, reducing gallery size');
        const reduced = images.slice(0, Math.floor(images.length / 2));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
        setImages(reduced);
      }
    }
  }, [images]);

  const addImage = useCallback(async (imageData) => {
    // Prevent duplicate adds
    if (isAddingRef.current) return null;
    isAddingRef.current = true;
    
    try {
      console.log('🖼️ Adding image to gallery, original URL type:', imageData.url?.substring(0, 30));
      
      // Convert URL to base64 for persistence
      const base64Url = await urlToBase64(imageData.url);
      
      const isBase64 = base64Url.startsWith('data:');
      console.log('🖼️ Converted to base64:', isBase64, 'Size:', Math.round(base64Url.length / 1024), 'KB');
      
      if (!isBase64) {
        console.warn('⚠️ Failed to convert to base64, image will not persist!');
      }
      
      const newImage = {
        id: generateId(),
        url: base64Url,
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
        console.log('🖼️ Gallery now has', updated.length, 'images');
        // Keep only last MAX_IMAGES
        return updated.slice(0, MAX_IMAGES);
      });

      return newImage;
    } catch (error) {
      console.error('Error adding image:', error);
      return null;
    } finally {
      // Reset flag after a short delay
      setTimeout(() => { isAddingRef.current = false; }, 100);
    }
  }, []);

  const deleteImage = useCallback((id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const clearGallery = useCallback(() => {
    setImages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    images,
    addImage,
    deleteImage,
    clearGallery
  };
}
