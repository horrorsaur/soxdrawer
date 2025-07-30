const natsClient = new ExtensionNATSClient();

async function startNATS() {
  try {
    await natsClient.connect();
    console.log("SoxDrawer server seems up");
    browser.storage.local.set({ natsStatus: "connected" });
  } catch (error) {
    console.error("Failed to connect to SoxDrawer: ", error);
    browser.storage.local.set({ natsStatus: "error" });
  }
}

// Start NATS when the extension is installed or updated
browser.runtime.onInstalled.addListener((details) => {
  console.log("SoxDrawer extension installed/updated:", details.reason);
  startNATS();

  browser.notifications
    .create({
      type: "basic",
      title: "SoxDrawer Ready",
      message: "Connecting to SoxDrawer server in the background.",
    })
    .catch((err) => {
      console.log("Notification not shown:", err.message);
    });
});

// Attempt to reconnect on browser startup
browser.runtime.onStartup.addListener(() => {
  console.log("SoxDrawer extension started with browser");
  startNATS();
});

// Handle messages from popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);

  // Handle get_status requests
  if (request.action === "get_status") {
    const status = {
      connected: natsClient.isConnected(),
      connectionInfo: natsClient.getConnectionInfo(),
    };

    sendResponse({ status: "success", data: status });
    return false; // No async work here
  }

  // Handle object listing requests
  if (request.action === "list_objects") {
    if (!natsClient.isConnected()) {
      sendResponse({ status: "error", message: "Not connected to server" });
      return false;
    }

    natsClient
      .getObjectStore()
      .then((store) => store.list())
      .then((objects) => {
        sendResponse({ status: "success", data: objects });
      })
      .catch((error) => {
        sendResponse({ status: "error", message: error.message });
      });

    return true; // Keep message channel open for async response
  }

  // Handle object deletion requests
  if (request.action === "delete_object") {
    if (!natsClient.isConnected()) {
      sendResponse({ status: "error", message: "Not connected to server" });
      return false;
    }

    natsClient
      .getObjectStore()
      .then((store) => store.delete(request.key))
      .then(() => {
        sendResponse({
          status: "success",
          message: `Object ${request.key} deleted`,
        });
      })
      .catch((error) => {
        sendResponse({ status: "error", message: error.message });
      });

    return true; // Keep message channel open for async response
  }

  // Handle file upload requests
  if (request.action === "upload_file") {
    if (!natsClient.isConnected()) {
      sendResponse({ status: "error", message: "Not connected to server" });
      return false;
    }

    // Reconstruct File object from plain object
    const fileData = new Blob([request.data.data], { type: request.data.type });
    const file = new File([fileData], request.data.name, {
      type: request.data.type,
      lastModified: request.data.lastModified,
    });

    natsClient
      .getObjectStore()
      .then((store) => store.put(file.name, file))
      .then((result) => {
        sendResponse({ status: "success", data: result });
      })
      .catch((error) => {
        sendResponse({ status: "error", message: error.message });
      });

    return true; // Keep message channel open for async response
  }

  return false;
});

// Start NATS connection when the script is first loaded
startNATS();
