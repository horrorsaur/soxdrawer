document.addEventListener("DOMContentLoaded", function () {
  console.log("SoxDrawer popup loaded");

  // DOM elements
  const serverIndicator = document.getElementById("serverIndicator");
  const serverStatus = document.getElementById("serverStatus");
  const refreshStatusBtn = document.getElementById("refreshStatusBtn");
  const uploadForm = document.getElementById("uploadForm");
  const fileInput = document.getElementById("fileInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const resultDiv = document.getElementById("result");
  const dropZone = document.getElementById("dropZone");
  const refreshListBtn = document.getElementById("refreshListBtn");
  const objectsContainer = document.getElementById("objectsContainer");
  const homePage = document.getElementById("homePage");
  const listPage = document.getElementById("listPage");
  const homeTab = document.getElementById("homeTab");
  const listTab = document.getElementById("listTab");
  const backToHomeLink = document.getElementById("backToHomeLink");

  let isConnected = false;

  // --- Navigation ---
  function showPage(pageId) {
    document
      .querySelectorAll(".page")
      .forEach((page) => page.classList.remove("active"));
    document
      .querySelectorAll(".nav-link")
      .forEach((link) => link.classList.remove("active"));

    if (pageId === "listPage") {
      listPage.classList.add("active");
      listTab.classList.add("active");
    } else {
      homePage.classList.add("active");
      homeTab.classList.add("active");
    }
  }

  homeTab.addEventListener("click", () => showPage("homePage"));
  listTab.addEventListener("click", () => showPage("listPage"));
  backToHomeLink.addEventListener("click", () => showPage("homePage"));

  // --- Status and Connection ---
  function updateStatus(status) {
    isConnected = status.connected;

    if (isConnected) {
      serverIndicator.className = "status-indicator status-connected";
      serverStatus.textContent = "Connected";
      uploadBtn.disabled = false;
      refreshListBtn.disabled = false;
      dropZone.style.pointerEvents = "auto";
      dropZone.querySelector("p").textContent =
        "Drag & Drop files, text, or images here";
    } else {
      serverIndicator.className = "status-indicator status-disconnected";
      serverStatus.textContent = "Disconnected";
      uploadBtn.disabled = true;
      refreshListBtn.disabled = true;
      dropZone.style.pointerEvents = "none";
      dropZone.querySelector("p").textContent =
        "Connect to server to enable uploads";
    }
  }

  async function refreshStatus() {
    try {
      const response = await sendMessage("get_status");
      updateStatus(response.data);
    } catch (error) {
      updateStatus({ connected: false });
    }
  }

  // --- Object Listing and Deletion ---
  function displayObjects(objects) {
    if (objects.length === 0) {
      objectsContainer.innerHTML =
        '<div class="loading">No objects found</div>';
      return;
    }

    objectsContainer.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Size</th>
            <th>Modified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${objects
            .map(
              (obj) => `
            <tr>
              <td>${obj.name}</td>
              <td>${obj.size} bytes</td>
              <td>${new Date(obj.created).toLocaleString()}</td>
              <td class="object-actions">
                <button class="button button-danger" data-key="${obj.name}">Delete</button>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;

    document.querySelectorAll(".button-danger").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const key = e.target.dataset.key;
        if (confirm(`Are you sure you want to delete '${key}'?’`)) {
          deleteObject(key);
        }
      });
    });
  }

  async function listObjects() {
    try {
      objectsContainer.innerHTML = '<div class="loading">Loading...</div>';
      const response = await sendMessage("list_objects");
      displayObjects(response.data);
    } catch (error) {
      showFeedback(resultDiv, `Failed to list objects: ${error.message}`, true);
    }
  }

  async function deleteObject(key) {
    try {
      await sendMessage("delete_object", { key });
      showFeedback(resultDiv, `Object '${key}' deleted successfully`);
      listObjects();
    } catch (error) {
      showFeedback(resultDiv, `Failed to delete: ${error.message}`, true);
    }
  }

  // --- File Upload Logic ---
  async function handleFileUpload(file) {
    try {
      uploadBtn.textContent = "Uploading...";
      uploadBtn.disabled = true;

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
        resultDiv,
        `Uploaded '${response.data.filename}' as '${response.data.name}'`,
      );

      // Clear file input
      uploadForm.reset();
    } catch (error) {
      showFeedback(resultDiv, `Upload failed: ${error.message}`, true);
    } finally {
      uploadBtn.textContent = "Upload File";
      if (isConnected) uploadBtn.disabled = false;
    }
  }

  // --- Event Handlers ---
  refreshStatusBtn.addEventListener("click", refreshStatus);
  refreshListBtn.addEventListener("click", listObjects);

  uploadForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (fileInput.files.length > 0) {
      handleFileUpload(fileInput.files[0]);
    }
  });

  dropZone.addEventListener("click", () => fileInput.click());

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

    if (dt.files && dt.files.length > 0) {
      showFeedback(resultDiv, `Uploading ${dt.files.length} file(s)...`);
      for (const file of dt.files) {
        await handleFileUpload(file);
      }
      return;
    }

    const textData = dt.getData("text/plain");
    if (textData) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = new File([textData], `snippet-${timestamp}.txt`, {
        type: "text/plain",
      });
      await handleFileUpload(file);
      return;
    }

    const htmlData = dt.getData("text/html");
    if (htmlData) {
      const imgMatch = htmlData.match(/<img.*?src="(.*?)".*?>/);
      if (imgMatch && imgMatch[1]) {
        try {
          const imageUrl = imgMatch[1];
          showFeedback(resultDiv, "Downloading image to upload...");
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const ext = blob.type.split("/")[1] || "png";
          const file = new File([blob], `image-${timestamp}.${ext}`, {
            type: blob.type,
          });
          await handleFileUpload(file);
        } catch (error) {
          showFeedback(
            resultDiv,
            `Failed to download image: ${error.message}`,
            true,
          );
        }
        return;
      }
    }

    showFeedback(resultDiv, "Unsupported data type dropped.", true);
  });

  // --- Utility and Init ---
  function showFeedback(element, message, isError = false) {
    element.className = isError ? "result error" : "result success";
    element.textContent = message;
    setTimeout(() => {
      element.textContent = "";
      element.className = "result";
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

  // Initial load
  refreshStatus();
  console.log("SoxDrawer popup initialized");
});
