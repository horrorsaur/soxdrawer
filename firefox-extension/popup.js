// React component for SoxDrawer Firefox extension popup
(function() {
  'use strict';

  // Simple React-like component system for the extension
  class SoxDrawerPopup {
    constructor(container) {
      this.container = container;
      this.state = {
        items: [],
        isLoading: false,
        error: null,
        notification: null
      };
      
      this.init();
    }

    async init() {
      this.render();
      await this.loadItems();
    }

    setState(newState) {
      this.state = { ...this.state, ...newState };
      this.render();
    }

    showNotification(message, type) {
      this.setState({ notification: { message, type } });
      setTimeout(() => {
        this.setState({ notification: null });
      }, 3000);
    }

    async loadItems() {
      this.setState({ isLoading: true, error: null });
      
      try {
        const result = await browser.storage.local.get(['soxdrawerUrl']);
        const soxdrawerUrl = result.soxdrawerUrl || 'http://localhost:8080';
        
        const response = await fetch(`${soxdrawerUrl}/api/list?json=true`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.objects) {
          const items = data.objects.map(obj => ({
            id: obj.name,
            type: this.determineType(obj.name),
            name: obj.name,
            content: obj.name,
            size: obj.size,
            timestamp: new Date(obj.created),
            url: `${soxdrawerUrl}/api/download/${obj.name}`
          }));
          
          this.setState({ items, isLoading: false });
        } else {
          throw new Error(data.message || 'Failed to load items');
        }
      } catch (error) {
        console.error('Error loading items:', error);
        this.setState({ 
          error: error.message, 
          isLoading: false 
        });
      }
    }

    determineType(filename) {
      const ext = filename.toLowerCase().split('.').pop();
      
      if (ext === 'txt') {
        return 'text';
      }
      
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
      if (imageExts.includes(ext || '')) {
        return 'image';
      }
      
      return 'file';
    }

    async uploadFile(file) {
      try {
        const result = await browser.storage.local.get(['soxdrawerUrl']);
        const soxdrawerUrl = result.soxdrawerUrl || 'http://localhost:8080';
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'file');
        
        const response = await fetch(`${soxdrawerUrl}/api/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
          this.showNotification('File uploaded successfully!', 'success');
          await this.loadItems(); // Reload items
        } else {
          throw new Error(data.message || 'Upload failed');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        this.showNotification(error.message, 'error');
      }
    }

    async deleteItem(id) {
      try {
        const result = await browser.storage.local.get(['soxdrawerUrl']);
        const soxdrawerUrl = result.soxdrawerUrl || 'http://localhost:8080';
        
        const response = await fetch(`${soxdrawerUrl}/api/delete/${id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`Delete failed: ${response.statusText}`);
        }
        
        this.showNotification('Item deleted successfully!', 'success');
        await this.loadItems(); // Reload items
      } catch (error) {
        console.error('Error deleting item:', error);
        this.showNotification(error.message, 'error');
      }
    }

    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatTimestamp(date) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }

    getItemIcon(type) {
      const icons = {
        'link': '🔗',
        'text': '📄',
        'image': '🖼️',
        'file': '📁'
      };
      return icons[type] || '📁';
    }

    render() {
      const { items, isLoading, error, notification } = this.state;
      
      this.container.innerHTML = `
        <div class="popup-container">
          <header class="popup-header">
            <h1>SoxDrawer</h1>
            <button class="refresh-btn" onclick="popup.loadItems()">
              🔄
            </button>
          </header>
          
          <div class="popup-content">
            ${this.renderUploadZone()}
            ${this.renderItems()}
            ${this.renderError()}
            ${this.renderLoading()}
          </div>
          
          ${this.renderNotification()}
        </div>
      `;
    }

    renderUploadZone() {
      return `
        <div class="upload-zone" id="upload-zone">
          <div class="upload-text">
            <div class="upload-icon">📁</div>
            <p>Drop files here or click to browse</p>
          </div>
          <input type="file" id="file-input" multiple style="display: none;" />
        </div>
      `;
    }

    renderItems() {
      const { items, isLoading } = this.state;
      
      if (isLoading) return '';
      if (items.length === 0) {
        return `
          <div class="empty-state">
            <div class="empty-icon">📁</div>
            <p>No items yet</p>
            <p class="empty-subtitle">Start by uploading files</p>
          </div>
        `;
      }
      
      return `
        <div class="items-list">
          ${items.map(item => `
            <div class="item-card" data-id="${item.id}">
              <div class="item-icon">${this.getItemIcon(item.type)}</div>
              <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-meta">
                  <span class="item-date">${this.formatTimestamp(item.timestamp)}</span>
                  ${item.size ? `<span class="item-size">${this.formatFileSize(item.size)}</span>` : ''}
                </div>
              </div>
              <div class="item-actions">
                <button class="action-btn" onclick="popup.deleteItem('${item.id}')" title="Delete">
                  🗑️
                </button>
                ${item.url ? `<a href="${item.url}" target="_blank" class="action-btn" title="Download">⬇️</a>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    renderError() {
      const { error } = this.state;
      if (!error) return '';
      
      return `
        <div class="error-message">
          <div class="error-icon">⚠️</div>
          <div class="error-text">
            <p>${error}</p>
            <button onclick="popup.loadItems()" class="retry-btn">Try again</button>
          </div>
        </div>
      `;
    }

    renderLoading() {
      const { isLoading } = this.state;
      if (!isLoading) return '';
      
      return `
        <div class="loading">
          <div class="loading-spinner"></div>
          <p>Loading items...</p>
        </div>
      `;
    }

    renderNotification() {
      const { notification } = this.state;
      if (!notification) return '';
      
      return `
        <div class="notification ${notification.type}">
          ${notification.message}
        </div>
      `;
    }

    setupEventListeners() {
      // File upload handling
      const uploadZone = this.container.querySelector('#upload-zone');
      const fileInput = this.container.querySelector('#file-input');
      
      if (uploadZone && fileInput) {
        uploadZone.addEventListener('click', () => {
          fileInput.click();
        });
        
        uploadZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadZone.classList.add('drag-over');
        });
        
        uploadZone.addEventListener('dragleave', (e) => {
          e.preventDefault();
          uploadZone.classList.remove('drag-over');
        });
        
        uploadZone.addEventListener('drop', (e) => {
          e.preventDefault();
          uploadZone.classList.remove('drag-over');
          
          const files = Array.from(e.dataTransfer.files);
          files.forEach(file => this.uploadFile(file));
        });
        
        fileInput.addEventListener('change', (e) => {
          const files = Array.from(e.target.files);
          files.forEach(file => this.uploadFile(file));
          e.target.value = ''; // Reset input
        });
      }
    }
  }

  // Initialize the popup when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('root');
    if (container) {
      window.popup = new SoxDrawerPopup(container);
      
      // Setup event listeners after initial render
      setTimeout(() => {
        window.popup.setupEventListeners();
      }, 100);
    }
  });

})(); 