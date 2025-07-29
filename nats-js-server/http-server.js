import { ObjectStoreService } from './object-store.js';

export class HTTPServer {
  constructor(natsServer, config = {}) {
    this.natsServer = natsServer;
    this.config = {
      port: config.port || 8080,
      host: config.host || 'localhost',
      ...config
    };
    this.objectStoreService = new ObjectStoreService(natsServer);
    this.server = null;
  }

  async start() {
    const server = Bun.serve({
      port: this.config.port,
      hostname: this.config.host,
      fetch: this.handleRequest.bind(this),
    });

    this.server = server;
    console.log(`🌐 HTTP server started on http://${this.config.host}:${this.config.port}`);
    return server;
  }

  async handleRequest(request) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    // Add CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (pathname === '/') {
        return this.handleIndex(request, corsHeaders);
      } else if (pathname === '/upload' && method === 'POST') {
        return this.handleUpload(request, corsHeaders);
      } else if (pathname === '/list' && method === 'GET') {
        return this.handleList(request, corsHeaders);
      } else if (pathname.startsWith('/download/') && method === 'GET') {
        return this.handleDownload(request, corsHeaders);
      } else if (pathname.startsWith('/delete/') && method === 'DELETE') {
        return this.handleDelete(request, corsHeaders);
      } else if (pathname === '/status' && method === 'GET') {
        return this.handleStatus(request, corsHeaders);
      } else {
        return new Response('Not Found', { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('❌ Request handling error:', error);
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  async handleIndex(request, corsHeaders) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>SoxDrawer JS</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #333; margin: 0; }
        .header p { color: #666; margin: 10px 0; }
        .upload-form { margin-top: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background: #fafafa; }
        button { background-color: #007cba; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
        button:hover { background-color: #005a87; }
        input[type="file"] { margin: 10px 0; padding: 8px; }
        .result { margin-top: 20px; padding: 15px; border-radius: 4px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .nav { margin: 20px 0; text-align: center; }
        .nav a { color: #007cba; text-decoration: none; margin: 0 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧦 SoxDrawer JS</h1>
            <p>A NATS-powered object storage service (JavaScript Edition)</p>
        </div>
        
        <div class="nav">
            <a href="/">Home</a>
            <a href="/list">List Objects</a>
            <a href="/status">Status</a>
        </div>
        
        <div class="upload-form">
            <h2>Upload File</h2>
            <form id="uploadForm" enctype="multipart/form-data">
                <input type="file" name="file" required>
                <br>
                <button type="submit">Upload</button>
            </form>
            <div id="result"></div>
        </div>
    </div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const resultDiv = document.getElementById('result');
            
            resultDiv.innerHTML = '<p>Uploading...</p>';
            
            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    resultDiv.innerHTML = '<div class="result success"><strong>Success!</strong><br>' +
                        'File: ' + data.filename + '<br>' +
                        'Key: ' + data.key + '<br>' +
                        'Size: ' + data.size + ' bytes</div>';
                } else {
                    resultDiv.innerHTML = '<div class="result error"><strong>Error:</strong> ' + data.message + '</div>';
                }
            } catch (error) {
                resultDiv.innerHTML = '<div class="result error"><strong>Error:</strong> ' + error.message + '</div>';
            }
        });
    </script>
</body>
</html>`;

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    });
  }

  async handleUpload(request, corsHeaders) {
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      
      if (!file || !file.name) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'No file provided'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate unique key with timestamp
      const timestamp = Date.now();
      const cleanFilename = this.sanitizeFilename(file.name);
      const key = `${timestamp}_${cleanFilename}`;

      // Get file data as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      // Store in object store
      const info = await this.objectStoreService.put(key, data, {
        description: `Uploaded file: ${file.name}`,
        headers: {
          'content-type': file.type || 'application/octet-stream',
          'original-filename': file.name,
        }
      });

      return new Response(JSON.stringify({
        status: 'success',
        message: 'File uploaded successfully',
        key: key,
        size: info.size,
        filename: file.name,
        created: info.created
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Upload error:', error);
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  async handleList(request, corsHeaders) {
    try {
      const objects = await this.objectStoreService.list();
      
      return new Response(JSON.stringify({
        status: 'success',
        message: 'Objects retrieved successfully',
        objects: objects
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  async handleDownload(request, corsHeaders) {
    try {
      const url = new URL(request.url);
      const key = decodeURIComponent(url.pathname.substring('/download/'.length));
      
      const result = await this.objectStoreService.get(key);
      const info = result.info;
      
      // Get content type from headers or default
      const contentType = info.headers?.['content-type'] || 'application/octet-stream';
      const originalFilename = info.headers?.['original-filename'] || key;
      
      return new Response(result.data, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${originalFilename}"`,
          'Content-Length': info.size.toString(),
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  async handleDelete(request, corsHeaders) {
    try {
      const url = new URL(request.url);
      const key = decodeURIComponent(url.pathname.substring('/delete/'.length));
      
      await this.objectStoreService.delete(key);
      
      return new Response(JSON.stringify({
        status: 'success',
        message: `Object '${key}' deleted successfully`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  async handleStatus(request, corsHeaders) {
    try {
      const bucketStatus = await this.objectStoreService.getStatus();
      const connectionInfo = this.natsServer.getConnectionInfo();
      
      return new Response(JSON.stringify({
        status: 'success',
        server: {
          connected: this.natsServer.isConnected(),
          connection: connectionInfo,
        },
        bucket: bucketStatus
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '') || 'unnamed_file';
  }

  async stop() {
    if (this.server) {
      this.server.stop();
      console.log('🛑 HTTP server stopped');
    }
  }
}

export default HTTPServer;
