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

