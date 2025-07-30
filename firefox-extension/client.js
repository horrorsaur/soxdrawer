class ExtensionNATSClient {
  constructor(config = {}) {
    this.config = {
      serverUrl: config.serverUrl || "http://localhost:8080",
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 3,
      ...config,
    };

    this.connected = false;
    this.connectionError = null;
    this.objectStore = null;

    console.log("Client initialized with config:", this.config);
  }

  async connect() {
    try {
      const response = await this.makeRequest("/", {
        method: "GET",
        headers: {
          Accept: "text/html,application/json",
        },
      });

      if (response.ok) {
        this.connected = true;
        this.connectionError = null;
        this.objectStore = new HTTPObjectStore(this);
        return this;
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      this.connected = false;
      this.connectionError = error.message;
      throw error;
    }
  }

  async disconnect() {
    this.connected = false;
    this.objectStore = null;
    console.log("Disconnected from SoxDrawer server");
  }

  isConnected() {
    return this.connected;
  }

  async getObjectStore(bucketName = "default") {
    if (!this.connected) {
      throw new Error("Not connected to SoxDrawer server");
    }

    console.log(`Getting object store: ${bucketName}`);
    return this.objectStore;
  }

  getConnectionInfo() {
    return {
      connected: this.connected,
      server: this.config.serverUrl,
      error: this.connectionError,
      timestamp: new Date().toISOString(),
    };
  }

  // Helper method to make HTTP requests with proper error handling
  async makeRequest(endpoint, options = {}) {
    const url = `${this.config.serverUrl}${endpoint}`;
    const requestOptions = {
      timeout: this.config.timeout,
      ...options,
      headers: {
        ...options.headers,
      },
    };

    console.log(`Request to: ${url}`, requestOptions.method || "GET");

    try {
      const response = await fetch(url, requestOptions);
      return response;
    } catch (error) {
      console.error(`Request failed to ${url}:`, error);
      throw error;
    }
  }
}

// HTTP-based Object Store that communicates with Go server
class HTTPObjectStore {
  constructor(client) {
    this.client = client;
  }

  async put(key, data, metadata = {}) {
    try {
      const formData = new FormData();

      let fileData;
      if (data instanceof File) {
        fileData = data;
      } else if (data instanceof Blob) {
        fileData = data;
      } else if (typeof data === "string") {
        fileData = new Blob([data], { type: "text/plain" });
      } else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
        fileData = new Blob([data], { type: "application/octet-stream" });
      } else {
        // Convert other data types to JSON string
        fileData = new Blob([JSON.stringify(data)], {
          type: "application/json",
        });
      }

      // Create a File object with the specified name
      const file = new File([fileData], key, {
        type: fileData.type,
        lastModified: Date.now(),
      });

      formData.append("file", file);

      const response = await this.client.makeRequest("/upload", {
        method: "POST",
        body: formData,
        headers: {},
      });

      if (!response.ok) {
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      console.log(`Stored object '${key}' (${result.size} bytes)`);

      return {
        name: result.key,
        size: result.size,
        created: result.created || new Date().toISOString(),
        filename: result.filename,
      };
    } catch (error) {
      console.error(`Failed to store object '${key}':`, error);
      throw error;
    }
  }

  async get(key) {
    try {
      const response = await this.client.makeRequest(
        `/download/${encodeURIComponent(key)}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Object '${key}' not found`);
        }
        throw new Error(
          `Download failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.arrayBuffer();
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      const contentLength = response.headers.get("content-length");

      console.log(`✅ Retrieved object '${key}' (${data.byteLength} bytes)`);

      return {
        data: new Uint8Array(data),
        info: {
          name: key,
          size: data.byteLength,
          contentType: contentType,
          contentLength: contentLength
            ? parseInt(contentLength)
            : data.byteLength,
        },
      };
    } catch (error) {
      console.error(`❌ Failed to get object '${key}':`, error);
      throw error;
    }
  }

  async getString(key) {
    const result = await this.get(key);
    return new TextDecoder().decode(result.data);
  }

  async getInfo(key) {
    // Since we don't have a separate info endpoint, we'll try to get the object
    // This is not optimal but works for the current Go server implementation
    try {
      const result = await this.get(key);
      return result.info;
    } catch (error) {
      throw error;
    }
  }

  async delete(key) {
    try {
      const response = await this.client.makeRequest(
        `/delete/${encodeURIComponent(key)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Object '${key}' not found`);
        }
        throw new Error(
          `Delete failed: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      console.log(`✅ Deleted object '${key}'`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete object '${key}':`, error);
      throw error;
    }
  }

  async list() {
    try {
      const response = await this.client.makeRequest("/list?json=true", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(
          `List failed: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();

      if (result.status !== "success") {
        throw new Error(result.message || "List operation failed");
      }

      const objects = result.objects || [];
      console.log(`✅ Listed ${objects.length} objects`);

      // Convert the Go server's object format to our expected format
      return objects.map((obj) => ({
        name: obj.name,
        size: obj.size,
        created: obj.created,
        // Add other fields as available from the Go server
      }));
    } catch (error) {
      console.error("❌ Failed to list objects:", error);
      throw error;
    }
  }

  async exists(key) {
    try {
      await this.getInfo(key);
      return true;
    } catch (error) {
      if (error.message.includes("not found")) {
        return false;
      }
      throw error;
    }
  }

  async getStatus() {
    try {
      // Check if the server has a status endpoint, otherwise simulate
      const response = await this.client.makeRequest("/status", {
        method: "GET",
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        // If no status endpoint, return basic info
        const objects = await this.list();
        return {
          bucket: "default",
          description: "SoxDrawer object store via HTTP",
          objects: objects.length,
          storage: "nats-jetstream",
          server: this.client.config.serverUrl,
        };
      }
    } catch (error) {
      console.error("❌ Failed to get status:", error);
      throw error;
    }
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ExtensionNATSClient, HTTPObjectStore };
} else {
  // Browser environment
  window.ExtensionNATSClient = ExtensionNATSClient;
  window.HTTPObjectStore = HTTPObjectStore;
}
