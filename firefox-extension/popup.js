document.addEventListener("DOMContentLoaded", function () {
  console.log("SoxDrawer popup loaded");

  const serverIndicator = document.getElementById("serverIndicator");
  const serverStatus = document.getElementById("serverStatus");
  const refreshStatusBtn = document.getElementById("refreshStatusBtn");
  const listObjectsBtn = document.getElementById("listObjectsBtn");
  const objectsContainer = document.getElementById("objectsContainer");
  const dropZone = document.getElementById("dropZone");
  const uploadResult = document.getElementById("uploadResult");

  let isConnected = false;

  function updateStatus(status) {
    isConnected = status.connected;

    if (isConnected) {
      serverIndicator.className = "status-indicator status-connected";
      serverStatus.textContent = "Connected";
      listObjectsBtn.disabled = false;
      dropZone.style.pointerEvents = "auto";
      dropZone.querySelector("p").textContent =
        "Drag & Drop files, text, or images here";
    } else {
      serverIndicator.className = "status-indicator status-disconnected";
      serverStatus.textContent = "Disconnected";
      listObjectsBtn.disabled = true;
      dropZone.style.pointerEvents = "none";
      dropZone.querySelector("p").textContent =
        "Connect to server to enable uploads";
    }
  }

  function displayObjects(objects) {
    if (objects.length === 0) {
      objectsContainer.innerHTML =
        '<div class="loading">No objects found</div>';
      return;
    }

    objectsContainer.innerHTML = `
      <div class="objects-list">
        ${objects
          .map(
            (obj) => `
          <div class="object-item">
            <div class="object-info">
              <div class="object-name">${obj.name}</div>
              <div class="object-details">Size: ${obj.size} bytes | Created: ${new Date(obj.created).toLocaleString()}</div>
            </div>
            <button class="button delete-button" data-key="${obj.name}">Delete</button>
          </div>
        `,
          )
          .join("")}
      </div>
    `;

    document.querySelectorAll(".delete-button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const key = e.target.dataset.key;
        if (confirm(`Are you sure you want to delete '${key}'?’`)) {
          deleteObject(key);
        }
      });
    });
  }

  function showFeedback(element, message, isError = false) {
    element.className = isError ? "error" : "success";
    element.textContent = message;
    setTimeout(() => {
      element.textContent = "";
      element.className = "";
    }, 5000);
  }

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

  async function refreshStatus() {
    try {
      const response = await sendMessage("get_status");
      updateStatus(response.data);
    } catch (error) {
      updateStatus({ connected: false });
    }
  }

  async function listObjects() {
    try {
      objectsContainer.innerHTML = "<div class='loading'>Loading...</div>";
      const response = await sendMessage("list_objects");
      displayObjects(response.data);
    } catch (error) {
      showFeedback(
        objectsContainer,
        `Failed to list objects: ${error.message}`,
        true,
      );
    }
  }

  async function deleteObject(key) {
    try {
      await sendMessage("delete_object", { key });
      showFeedback(uploadResult, `Object '${key}' deleted successfully`);
      listObjects();
    } catch (error) {
      showFeedback(uploadResult, `Failed to delete: ${error.message}`, true);
    }
  }

  async function uploadFile(file) {
    try {
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });

      const fileData = {
        data: Array.from(new Uint8Array(arrayBuffer)),
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
      };

      const response = await sendMessage("upload_file", { data: fileData });
      showFeedback(
        uploadResult,
        `Uploaded '${response.data.filename}' as '${response.data.name}'`,
      );
      listObjects();
    } catch (error) {
      showFeedback(uploadResult, `Upload failed: ${error.message}`, true);
    }
  }

  // --- Drag and Drop Logic ---
  dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isConnected) dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("drag-over");

    if (!isConnected) return;

    const dt = e.dataTransfer;
    if (!dt) return;

    // Handle dropped files
    if (dt.files && dt.files.length > 0) {
      showFeedback(uploadResult, `Uploading ${dt.files.length} file(s)...`);
      for (const file of dt.files) {
        await uploadFile(file);
      }
      return;
    }

    // Handle dropped text
    const textData = dt.getData("text/plain");
    if (textData) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = new File([textData], `snippet-${timestamp}.txt`, {
        type: "text/plain",
      });
      await uploadFile(file);
      return;
    }

    // Handle dropped HTML (e.g., images from a webpage)
    const htmlData = dt.getData("text/html");
    if (htmlData) {
      const imgMatch = htmlData.match(/<img.*?src="(.*?)".*?>/);
      if (imgMatch && imgMatch[1]) {
        try {
          const imageUrl = imgMatch[1];
          showFeedback(uploadResult, "Downloading image to upload...");
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const ext = blob.type.split("/")[1] || "png";
          const file = new File([blob], `image-${timestamp}.${ext}`, {
            type: blob.type,
          });
          await uploadFile(file);
        } catch (error) {
          showFeedback(
            uploadResult,
            `Failed to download image: ${error.message}`,
            true,
          );
        }
        return;
      }
    }

    showFeedback(uploadResult, "Unsupported data type dropped.", true);
  });

  refreshStatusBtn.addEventListener("click", refreshStatus);
  listObjectsBtn.addEventListener("click", listObjects);

  refreshStatus();

  console.log("SoxDrawer popup initialized with drag and drop");
});
