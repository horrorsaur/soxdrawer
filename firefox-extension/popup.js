document.addEventListener("DOMContentLoaded", function () {
  console.log("SoxDrawer popup loaded");

  // DOM elements
  const serverIndicator = document.getElementById("serverIndicator");
  const serverStatus = document.getElementById("serverStatus");
  const connectionInfo = document.getElementById("connectionInfo");
  const refreshStatusBtn = document.getElementById("refreshStatusBtn");
  const listObjectsBtn = document.getElementById("listObjectsBtn");
  const objectsContainer = document.getElementById("objectsContainer");
  const fileInput = document.getElementById("fileInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadResult = document.getElementById("uploadResult");

  // State management
  let isConnected = false;

  // Update status display
  function updateStatus(status) {
    isConnected = status.connected;

    if (isConnected) {
      serverIndicator.className = "status-indicator status-connected";
      serverStatus.textContent = "Connected";
      listObjectsBtn.disabled = false;
      uploadBtn.disabled = false;
    } else {
      serverIndicator.className = "status-indicator status-disconnected";
      serverStatus.textContent = "Disconnected";
      listObjectsBtn.disabled = true;
      uploadBtn.disabled = true;
    }

    if (status.connectionInfo) {
      connectionInfo.innerHTML = `
        <div>Server: ${status.connectionInfo.server || "N/A"}</div>
        <div style="color: #ffcccb;">${status.connectionInfo.error || ""}</div>
      `;
    }
  }

  // Display objects list
  function displayObjects(objects) {
    if (objects.length === 0) {
      objectsContainer.innerHTML =
        '<div class="loading">No objects found</div>';
      return;
    }

    const objectsHtml = objects
      .map(
        (obj) => `
      <div class="object-item">
        <div class="object-info">
          <div class="object-name">${obj.name}</div>
          <div class="object-details">Size: ${obj.size} bytes | Created: ${new Date(obj.created).toLocaleString()}</div>
        </div>
        <div class="object-actions">
          <button class="button small-button delete-button" data-key="${obj.name}">Delete</button>
        </div>
      </div>
    `,
      )
      .join("");

    objectsContainer.innerHTML = `
      <div class="objects-list">
        ${objectsHtml}
      </div>
    `;

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const key = e.target.dataset.key;
        if (confirm(`Are you sure you want to delete '${key}'?’`)) {
          deleteObject(key);
        }
      });
    });
  }

  // Show feedback message (success or error)
  function showFeedback(element, message, isError = false) {
    element.className = isError ? "error" : "success";
    element.textContent = message;

    setTimeout(() => {
      element.textContent = "";
      element.className = "";
    }, 5000);
  }

  // Send message to background script
  function sendMessage(action, data = {}) {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({ action, ...data }, (response) => {
        if (browser.runtime.lastError) {
          reject(new Error(browser.runtime.lastError.message));
        } else if (response && response.status === "error") {
          reject(new Error(response.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Get status from background script
  async function refreshStatus() {
    try {
      console.log("Requesting status from background...");
      const response = await sendMessage("get_status");
      console.log("Status response:", response);

      if (response && response.data) {
        updateStatus(response.data);
      }
    } catch (error) {
      console.error("Error getting status:", error);
      updateStatus({
        connected: false,
        connectionInfo: { error: error.message },
      });
    }
  }

  // List objects from background script
  async function listObjects() {
    try {
      objectsContainer.innerHTML =
        '<div class="loading">Loading objects...</div>';

      console.log("Requesting objects list from background...");
      const response = await sendMessage("list_objects");

      if (response && response.data) {
        displayObjects(response.data);
      }
    } catch (error) {
      console.error("Error listing objects:", error);
      showFeedback(
        objectsContainer,
        `Failed to list objects: ${error.message}`,
        true,
      );
    }
  }

  // Delete an object
  async function deleteObject(key) {
    try {
      console.log(`Requesting to delete object: ${key}`);
      await sendMessage("delete_object", { key });

      showFeedback(objectsContainer, `Object '${key}' deleted successfully`);
      // Refresh the list after deletion
      listObjects();
    } catch (error) {
      console.error("Error deleting object:", error);
      showFeedback(
        objectsContainer,
        `Failed to delete object: ${error.message}`,
        true,
      );
    }
  }

  // Upload a file
  async function uploadFile() {
    const file = fileInput.files[0];
    if (!file) {
      showFeedback(uploadResult, "Please select a file to upload", true);
      return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileData = {
        data: Array.from(new Uint8Array(arrayBuffer)),
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
      };

      const response = await sendMessage("upload_file", { data: fileData });

      showFeedback(
        uploadResult,
        `File '${response.data.filename}' uploaded as '${response.data.name}'`,
      );

      // Refresh the list after upload
      listObjects();
    } catch (error) {
      console.error("Upload failed:", error);
      showFeedback(uploadResult, `Upload failed: ${error.message}`, true);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload File";
      fileInput.value = ""; // Clear file input
    }
  }

  // Event listeners
  refreshStatusBtn.addEventListener("click", refreshStatus);
  listObjectsBtn.addEventListener("click", listObjects);
  uploadBtn.addEventListener("click", uploadFile);

  // Initial status check
  refreshStatus();

  console.log("SoxDrawer popup initialized");
});
