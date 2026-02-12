/**
 * Model Downloader Service
 * Downloads models from Hugging Face and stores them in OPFS
 */

import { opfsService } from './opfsService.js';

class ModelDownloader {
  constructor() {
    this.downloads = new Map(); // Track active downloads
  }

  /**
   * Download a model file from Hugging Face
   */
  async downloadModelFile(modelId, filename, onProgress) {
    const cacheKey = `${modelId}/${filename}`;

    // Check if already downloaded
    const opfsPath = `models/${cacheKey}`;
    if (await opfsService.fileExists(opfsPath)) {
      console.log(`✅ Model file already cached: ${cacheKey}`);
      return opfsPath;
    }

    // Check if already downloading
    if (this.downloads.has(cacheKey)) {
      return this.downloads.get(cacheKey);
    }

    // Start download
    const downloadPromise = this._downloadFile(modelId, filename, opfsPath, onProgress);
    this.downloads.set(cacheKey, downloadPromise);

    try {
      const result = await downloadPromise;
      return result;
    } finally {
      this.downloads.delete(cacheKey);
    }
  }

  async _downloadFile(modelId, filename, opfsPath, onProgress) {
    // Hugging Face CDN URL
    const url = `https://huggingface.co/${modelId}/resolve/main/${filename}`;

    console.log(`📥 Downloading: ${url}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      const reader = response.body.getReader();
      const chunks = [];
      let receivedLength = 0;

      // Read stream with progress
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        if (onProgress && contentLength > 0) {
          const progress = (receivedLength / contentLength) * 100;
          onProgress({
            filename,
            loaded: receivedLength,
            total: contentLength,
            progress: Math.min(100, progress)
          });
        }
      }

      // Combine chunks
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      // Write to OPFS
      await opfsService.writeFile(opfsPath, allChunks.buffer);

      console.log(`✅ Downloaded and cached: ${filename} (${(receivedLength / 1024 / 1024).toFixed(2)} MB)`);
      return opfsPath;

    } catch (error) {
      console.error(`❌ Download failed for ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Download a complete model (all required files)
   */
  async downloadModel(modelId, files, onProgress) {
    const results = {};
    let totalFiles = files.length;
    let completedFiles = 0;

    for (const filename of files) {
      try {
        const onFileProgress = (progressData) => {
          if (onProgress) {
            // Calculate overall progress
            const fileProgressPercent = progressData.progress || 0;
            const overallProgress = (completedFiles / totalFiles) * 100 + (fileProgressPercent / totalFiles);

            onProgress({
              modelId,
              filename,
              fileProgress: progressData,
              overallProgress: Math.min(100, overallProgress),
              completedFiles,
              totalFiles
            });
          }
        };

        const opfsPath = await this.downloadModelFile(modelId, filename, onFileProgress);
        results[filename] = opfsPath;
        completedFiles++;
      } catch (error) {
        console.error(`Failed to download ${filename}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Get model files list from Hugging Face
   * Note: This is a simplified version. In production, you'd use the HF API
   */
  // eslint-disable-next-line no-unused-vars
  async getModelFiles(modelId) {
    // For now, return common ONNX model files
    // In production, fetch from: https://huggingface.co/api/models/{modelId}
    return [
      'model.onnx',
      'model.json',
      'config.json',
      'tokenizer.json',
      'vocab.json'
    ];
  }

  /**
   * Cancel a download
   */
  cancelDownload(modelId, filename) {
    const cacheKey = `${modelId}/${filename}`;
    this.downloads.delete(cacheKey);
  }

  /**
   * Check if a model is cached (has any files downloaded)
   */
  async isModelCached(modelRepo) {
    const path = `models/${modelRepo}`;
    return await opfsService.directoryExists(path);
  }

  /**
   * Check which models from a list are cached
   */
  async checkCachedModels(availableModels) {
    const cachedIds = [];

    for (const model of availableModels) {
      const isCached = await this.isModelCached(model.repo);
      if (isCached) {
        cachedIds.push(model.id);
      }
    }

    return cachedIds;
  }

  /**
   * Delete a cached model
   */
  async deleteModel(modelRepo) {
    const path = `models/${modelRepo}`;
    const success = await opfsService.deleteDirectory(path);

    if (success) {
      console.log(`✅ Model deleted: ${modelRepo}`);
    }

    return success;
  }

  /**
   * Get all cached models with their info
   */
  async getCachedModelsInfo() {
    return await opfsService.listCachedModels();
  }
}

export const modelDownloader = new ModelDownloader();

