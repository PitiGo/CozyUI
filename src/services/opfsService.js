/**
 * OPFS (Origin Private File System) Service
 * Manages persistent storage for large model files
 */

class OPFSService {
  constructor() {
    this.root = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Request access to OPFS
      this.root = await navigator.storage.getDirectory();
      this.initialized = true;
      console.log('✅ OPFS initialized');
      return true;
    } catch (error) {
      console.error('❌ OPFS initialization failed:', error);
      return false;
    }
  }

  /**
   * Get or create a directory
   */
  async getDirectory(path) {
    if (!this.initialized) await this.init();

    const parts = path.split('/').filter(p => p);
    let current = this.root;

    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true });
    }

    return current;
  }

  /**
   * Check if a file exists
   */
  async fileExists(path) {
    if (!this.initialized) await this.init();

    try {
      const parts = path.split('/').filter(p => p);
      const filename = parts.pop();
      const dir = await this.getDirectory(parts.join('/'));
      await dir.getFileHandle(filename);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   */
  async directoryExists(path) {
    if (!this.initialized) await this.init();

    try {
      const parts = path.split('/').filter(p => p);
      let current = this.root;

      for (const part of parts) {
        current = await current.getDirectoryHandle(part, { create: false });
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file handle
   */
  async getFile(path) {
    if (!this.initialized) await this.init();

    const parts = path.split('/').filter(p => p);
    const filename = parts.pop();
    const dir = await this.getDirectory(parts.join('/'));
    return await dir.getFileHandle(filename, { create: true });
  }

  /**
   * Write data to a file
   */
  async writeFile(path, data) {
    if (!this.initialized) await this.init();

    const fileHandle = await this.getFile(path);
    const writable = await fileHandle.createWritable();

    if (data instanceof Blob) {
      await writable.write(data);
    } else if (data instanceof ArrayBuffer) {
      await writable.write(data);
    } else if (typeof data === 'string') {
      await writable.write(data);
    } else {
      await writable.write(JSON.stringify(data));
    }

    await writable.close();
  }

  /**
   * Read file as ArrayBuffer
   */
  async readFile(path) {
    if (!this.initialized) await this.init();

    const fileHandle = await this.getFile(path);
    const file = await fileHandle.getFile();
    return await file.arrayBuffer();
  }

  /**
   * Read file as Blob
   */
  async readFileAsBlob(path) {
    if (!this.initialized) await this.init();

    const fileHandle = await this.getFile(path);
    return await fileHandle.getFile();
  }

  /**
   * Delete a file
   */
  async deleteFile(path) {
    if (!this.initialized) await this.init();

    try {
      const parts = path.split('/').filter(p => p);
      const filename = parts.pop();
      const dir = await this.getDirectory(parts.join('/'));
      await dir.removeEntry(filename);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Delete a directory recursively
   */
  async deleteDirectory(path) {
    if (!this.initialized) await this.init();

    try {
      const parts = path.split('/').filter(p => p);
      const dirName = parts.pop();

      let parentDir = this.root;
      for (const part of parts) {
        parentDir = await parentDir.getDirectoryHandle(part, { create: false });
      }

      await parentDir.removeEntry(dirName, { recursive: true });
      console.log(`✅ Deleted directory: ${path}`);
      return true;
    } catch (error) {
      console.error('Error deleting directory:', error);
      return false;
    }
  }

  /**
   * List all files in a directory
   */
  async listFiles(path = '') {
    if (!this.initialized) await this.init();

    const dir = await this.getDirectory(path);
    const files = [];

    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        files.push({
          name,
          size: file.size,
          lastModified: file.lastModified
        });
      }
    }

    return files;
  }

  /**
   * List all directories in a path
   */
  async listDirectories(path = '') {
    if (!this.initialized) await this.init();

    try {
      const dir = path ? await this.getDirectory(path) : this.root;
      const directories = [];

      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'directory') {
          // Calculate directory size
          const size = await this._getDirectorySize(handle);
          directories.push({
            name,
            size,
            path: path ? `${path}/${name}` : name
          });
        }
      }

      return directories;
    } catch (error) {
      console.error('Error listing directories:', error);
      return [];
    }
  }

  /**
   * Calculate total size of a directory recursively
   */
  async _getDirectorySize(dirHandle) {
    let totalSize = 0;

    try {
      for await (const [, handle] of dirHandle.entries()) {
        if (handle.kind === 'file') {
          const file = await handle.getFile();
          totalSize += file.size;
        } else if (handle.kind === 'directory') {
          totalSize += await this._getDirectorySize(handle);
        }
      }
    } catch (error) {
      console.error('Error calculating directory size:', error);
    }

    return totalSize;
  }

  /**
   * List cached models with their info
   */
  async listCachedModels() {
    if (!this.initialized) await this.init();

    try {
      const modelsDir = await this.root.getDirectoryHandle('models', { create: false });
      const models = [];

      for await (const [name, handle] of modelsDir.entries()) {
        if (handle.kind === 'directory') {
          const size = await this._getDirectorySize(handle);

          // Count files in the model directory
          let fileCount = 0;
          for await (const [, fileHandle] of handle.entries()) {
            if (fileHandle.kind === 'file') fileCount++;
          }

          models.push({
            name,
            size,
            fileCount,
            path: `models/${name}`
          });
        }
      }

      return models;
    } catch {
      // Models directory doesn't exist yet
      return [];
    }
  }

  /**
   * Get total storage used
   */
  async getStorageUsage() {
    if (!this.initialized) await this.init();

    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0)
      };
    } catch (error) {
      console.error('Error getting storage estimate:', error);
      return { used: 0, quota: 0, available: 0 };
    }
  }

  /**
   * Clear all stored models
   */
  async clearAll() {
    if (!this.initialized) await this.init();

    try {
      const modelsDir = await this.root.getDirectoryHandle('models', { create: false });
      for await (const [name] of modelsDir.entries()) {
        await modelsDir.removeEntry(name, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
}

// Export singleton instance
export const opfsService = new OPFSService();

/**
 * Browser Cache Service for Transformers.js models
 * Transformers.js stores models in the browser's Cache API
 */
class BrowserCacheService {
  constructor() {
    this.cacheNames = [
      'transformers-cache',
      'transformers.js',
      'huggingface'
    ];
  }

  /**
   * Get all cache entries from Transformers.js
   */
  async listCachedModels() {
    const models = new Map(); // Use map to group by model

    try {
      const cacheNames = await caches.keys();

      for (const cacheName of cacheNames) {
        // Check all caches that might contain model data
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          const url = request.url;

          // Filter for Hugging Face model files
          if (url.includes('huggingface.co') || url.includes('hf.co')) {
            // Extract model name from URL
            // URLs look like: https://huggingface.co/Xenova/swin2SR-classical-sr-x2-64/resolve/main/model.onnx
            const match = url.match(/huggingface\.co\/([^/]+\/[^/]+)/);
            const modelName = match ? match[1] : 'Unknown';

            // Get response to calculate size
            const response = await cache.match(request);
            const size = response ? parseInt(response.headers.get('content-length') || '0', 10) : 0;

            // Get filename from URL
            const filename = url.split('/').pop()?.split('?')[0] || 'unknown';

            if (!models.has(modelName)) {
              models.set(modelName, {
                name: modelName,
                files: [],
                totalSize: 0,
                cacheName
              });
            }

            const model = models.get(modelName);
            model.files.push({ filename, url, size });
            model.totalSize += size;
          }
        }
      }

      return Array.from(models.values());
    } catch (error) {
      console.error('Error listing browser cache:', error);
      return [];
    }
  }

  /**
   * Get total size of cached models
   */
  async getTotalCacheSize() {
    const models = await this.listCachedModels();
    return models.reduce((total, model) => total + model.totalSize, 0);
  }

  /**
   * Delete a specific model from cache
   */
  async deleteModel(modelName) {
    try {
      const cacheNames = await caches.keys();
      let deleted = false;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          if (request.url.includes(modelName.replace('/', '%2F')) ||
            request.url.includes(modelName)) {
            await cache.delete(request);
            deleted = true;
          }
        }
      }

      console.log(`✅ Deleted model from cache: ${modelName}`);
      return deleted;
    } catch (error) {
      console.error('Error deleting from cache:', error);
      return false;
    }
  }

  /**
   * Clear all Transformers.js cache
   */
  async clearAll() {
    try {
      const cacheNames = await caches.keys();
      let clearedCount = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          if (request.url.includes('huggingface.co') || request.url.includes('hf.co')) {
            await cache.delete(request);
            clearedCount++;
          }
        }
      }

      console.log(`✅ Cleared ${clearedCount} cached model files`);
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Check if a specific model is cached
   */
  async isModelCached(modelRepo) {
    try {
      const models = await this.listCachedModels();
      return models.some(m => m.name === modelRepo || m.name.includes(modelRepo.split('/')[1]));
    } catch {
      return false;
    }
  }
}

export const browserCacheService = new BrowserCacheService();

