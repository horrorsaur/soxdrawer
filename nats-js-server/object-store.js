export class ObjectStoreService {
  constructor(natsServer, bucketName = 'default') {
    this.natsServer = natsServer;
    this.bucketName = bucketName;
  }

  get objectStore() {
    return this.natsServer.getObjectStore(this.bucketName);
  }

  /**
   * Store an object with the given key and data
   */
  async put(key, data, metadata = {}) {
    try {
      const store = this.objectStore;
      
      // Convert string data to Uint8Array if needed
      const dataBytes = typeof data === 'string' 
        ? new TextEncoder().encode(data) 
        : data;

      const info = await store.put({
        name: key,
        description: metadata.description || '',
        headers: metadata.headers || {},
      }, dataBytes);

      console.log(`✅ Stored object '${key}' (${info.size} bytes)`);
      
      return {
        name: info.name,
        size: info.size,
        created: info.mtime,
        digest: info.digest,
        chunks: info.chunks,
      };
    } catch (error) {
      console.error(`❌ Failed to store object '${key}':`, error);
      throw error;
    }
  }

  /**
   * Store an object from a readable stream
   */
  async putStream(key, stream, metadata = {}) {
    try {
      const store = this.objectStore;
      
      const info = await store.put({
        name: key,
        description: metadata.description || '',
        headers: metadata.headers || {},
      }, stream);

      console.log(`✅ Stored object '${key}' from stream (${info.size} bytes)`);
      
      return {
        name: info.name,
        size: info.size,
        created: info.mtime,
        digest: info.digest,
        chunks: info.chunks,
      };
    } catch (error) {
      console.error(`❌ Failed to store object '${key}' from stream:`, error);
      throw error;
    }
  }

  /**
   * Retrieve an object by key
   */
  async get(key) {
    try {
      const store = this.objectStore;
      const result = await store.get(key);
      
      if (!result) {
        throw new Error(`Object '${key}' not found`);
      }

      // Read the data from the readable stream
      const chunks = [];
      for await (const chunk of result.data) {
        chunks.push(chunk);
      }
      
      const data = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(`✅ Retrieved object '${key}' (${data.length} bytes)`);
      
      return {
        data,
        info: {
          name: result.info.name,
          size: result.info.size,
          created: result.info.mtime,
          digest: result.info.digest,
          chunks: result.info.chunks,
        }
      };
    } catch (error) {
      console.error(`❌ Failed to get object '${key}':`, error);
      throw error;
    }
  }

  /**
   * Retrieve an object as a string
   */
  async getString(key) {
    const result = await this.get(key);
    return new TextDecoder().decode(result.data);
  }

  /**
   * Get object metadata/info without downloading the data
   */
  async getInfo(key) {
    try {
      const store = this.objectStore;
      const info = await store.info(key);
      
      if (!info) {
        throw new Error(`Object '${key}' not found`);
      }

      return {
        name: info.name,
        size: info.size,
        created: info.mtime,
        digest: info.digest,
        chunks: info.chunks,
        deleted: info.deleted || false,
      };
    } catch (error) {
      console.error(`❌ Failed to get info for object '${key}':`, error);
      throw error;
    }
  }

  /**
   * Delete an object by key
   */
  async delete(key) {
    try {
      const store = this.objectStore;
      await store.delete(key);
      
      console.log(`✅ Deleted object '${key}'`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete object '${key}':`, error);
      throw error;
    }
  }

  /**
   * List all objects in the bucket
   */
  async list() {
    try {
      const store = this.objectStore;
      const objects = [];
      
      for await (const info of store.list()) {
        objects.push({
          name: info.name,
          size: info.size,
          created: info.mtime,
          digest: info.digest,
          chunks: info.chunks,
          deleted: info.deleted || false,
        });
      }

      console.log(`✅ Listed ${objects.length} objects`);
      return objects;
    } catch (error) {
      console.error('❌ Failed to list objects:', error);
      throw error;
    }
  }

  /**
   * Check if an object exists
   */
  async exists(key) {
    try {
      await this.getInfo(key);
      return true;
    } catch (error) {
      if (error.message.includes('not found')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get bucket status/statistics
   */
  async getStatus() {
    try {
      const store = this.objectStore;
      const status = await store.status();
      
      return {
        bucket: status.bucket,
        description: status.description,
        size: status.size,
        objects: status.objects || 0,
        storage: status.storage,
        replicas: status.replicas,
      };
    } catch (error) {
      console.error('❌ Failed to get bucket status:', error);
      throw error;
    }
  }
}

export default ObjectStoreService;
