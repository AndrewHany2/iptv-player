let electron;
try {
  electron = require("electron");
  if (!electron || !electron.app) {
    throw new Error("Electron module loaded but APIs not available");
  }
} catch (error) {
  console.error("Failed to load electron:", error);
  process.exit(1);
}

const { app, BrowserWindow, ipcMain, dialog, session } = electron;
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const os = require("os");

let mainWindow;

function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    backgroundColor: "#1a1a1a",
    title: "IPTV Player",
  });

  // Set VLC User-Agent for better IPTV compatibility
  const vlcUserAgent = "VLC/3.0.18 LibVLC/3.0.18";
  mainWindow.webContents.setUserAgent(vlcUserAgent);

  // Load from Vite dev server in development, or built files in production
  if (isDev) {
    mainWindow.loadURL("http://localhost:3001");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Intercept requests to add custom headers for IPTV streams
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ["http://*/*", "https://*/*"] },
    (details, callback) => {
      details.requestHeaders["User-Agent"] = "VLC/3.0.18 LibVLC/3.0.18";
      details.requestHeaders["Referer"] = details.url;
      callback({ requestHeaders: details.requestHeaders });
    },
  );

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle("select-playlist", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "M3U Playlist", extensions: ["m3u", "m3u8"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const content = fs.readFileSync(result.filePaths[0], "utf-8");
      return { success: true, content, path: result.filePaths[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "No file selected" };
});

ipcMain.handle("save-playlist", async (_event, content) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: "M3U Playlist", extensions: ["m3u"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, content, "utf-8");
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Save canceled" };
});

/**
 * Build VLC command with arguments for different platforms
 * @param {string} streamUrl - The stream URL to play
 * @param {Array<string>} vlcArgs - VLC command line arguments
 * @param {string} platform - Operating system platform
 * @returns {string} Complete VLC command
 */
function buildVLCCommand(streamUrl, vlcArgs, platform) {
  const argsString = vlcArgs.length > 0 ? vlcArgs.join(" ") : "";

  switch (platform) {
    case "darwin":
      // macOS - Use 'open' command with --args for VLC arguments
      return `open -a VLC "${streamUrl}"${argsString ? ` --args ${argsString}` : ""}`;

    case "win32":
      // Windows
      return `"C:\\Program Files\\VideoLAN\\VLC\\vlc.exe"${argsString ? ` ${argsString}` : ""} "${streamUrl}"`;

    default:
      // Linux and other Unix-like systems
      return `vlc${argsString ? ` ${argsString}` : ""} "${streamUrl}"`;
  }
}

/**
 * Open stream in VLC with optional start time and metadata
 * Supports resume playback at specific timestamp
 */
ipcMain.handle("open-in-vlc", async (_event, streamUrl, options = {}) => {
  const { startTime = 0, name = "Stream" } = options;
  const platform = os.platform();
  const vlcArgs = [];

  // Add start time argument if provided (in seconds)
  if (startTime > 0) {
    vlcArgs.push(`--start-time=${Math.floor(startTime)}`);
  }

  // Add title metadata
  if (name) {
    vlcArgs.push(`--meta-title="${name}"`);
  }

  const vlcCommand = buildVLCCommand(streamUrl, vlcArgs, platform);

  return new Promise((resolve) => {
    exec(vlcCommand, (error, _stdout, stderr) => {
      if (error) {
        console.error("Error opening VLC:", error);
        console.error("stderr:", stderr);
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});
