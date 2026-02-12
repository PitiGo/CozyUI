import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'cozyui-gallery';
const MAX_IMAGES = 20;

// Unique ID generator
let imageIdCounter = 0;
const generateId = () => `img_${Date.now()}_${++imageIdCounter}_${Math.random().toString(36).slice(2, 7)}`;

// Convert blob URL or image URL to base64
async function urlToBase64(url) {
  try {
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
    return null;
  }
}

export function useGallery() {
  // Initialize from localStorage synchronously
  const getInitialImages = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validImages = parsed.filter(img => img && img.url && img.id && img.url.startsWith('data:'));
        return validImages;
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
    return [];
  };

  const [images, setImages] = useState(getInitialImages);
  const isAddingRef = useRef(false);
  const lastSavedRef = useRef(JSON.stringify(images));

  // Save to localStorage when images change
  useEffect(() => {
    const currentData = JSON.stringify(images);

    // Only save if data actually changed
    if (currentData === lastSavedRef.current) return;

    lastSavedRef.current = currentData;

    try {
      if (images.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, currentData);
      }
    } catch (error) {
      console.error('Error saving gallery:', error);
      if (error.name === 'QuotaExceededError') {
        const reduced = images.slice(0, Math.floor(images.length / 2));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
        setImages(reduced);
      }
    }
  }, [images]);

  const addImage = useCallback(async (imageData) => {
    if (isAddingRef.current) return null;
    isAddingRef.current = true;

    try {

      const base64Url = await urlToBase64(imageData.url);

      if (!base64Url || !base64Url.startsWith('data:')) {
        console.error('❌ Failed to convert to base64');
        return null;
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
        const updated = [newImage, ...prev].slice(0, MAX_IMAGES);
        return updated;
      });

      return newImage;
    } catch (error) {
      console.error('Error adding image:', error);
      return null;
    } finally {
      setTimeout(() => { isAddingRef.current = false; }, 100);
    }
  }, []);

  const deleteImage = useCallback((id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const clearGallery = useCallback(() => {
    lastSavedRef.current = '[]';
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
