// --- Embedded Proxy Server Logic ---
const express = require("express");
const http = require("http");
const https = require("https");
const zlib = require("zlib");
const { URL } = require("url");

const httpKeepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });
const httpsKeepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });
const httpAgent = new http.Agent({ keepAlive: false });
const httpsAgent = new https.Agent({ keepAlive: false });

const proxyApp = express();
const PROXY_PORT = 5000;

proxyApp.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Range, Content-Type");
  res.header(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Content-Type",
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

function createProxyHandler(isVideo, proxyPath) {
  return async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    try {
      const decodedUrl = decodeURIComponent(targetUrl);
      const urlObj = new URL(decodedUrl);
      const isHttps = urlObj.protocol === "https:";
      const httpModule = isHttps ? https : http;
      const hostHeader = urlObj.port
        ? `${urlObj.hostname}:${urlObj.port}`
        : urlObj.hostname;
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        agent: isVideo
          ? isHttps ? httpsKeepAliveAgent : httpKeepAliveAgent
          : isHttps ? httpsAgent : httpAgent,
        headers: {
          Host: hostHeader,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) IPTVSmartersPro/1.1.1 Chrome/53.0.2785.143 Electron/1.4.16 Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "en-US",
          "Accept-Encoding": isVideo ? "identity" : "gzip, deflate",
          Connection: "keep-alive",
          Referer: `${urlObj.protocol}//${urlObj.host}/`,
        },
        timeout: isVideo ? 0 : 30000,
      };
      if (req.headers.range) {
        options.headers["Range"] = req.headers.range;
      }
      makeRequestWithRedirect(
        httpModule,
        options,
        decodedUrl,
        0,
        (err, response) => {
          if (err) {
            console.error("Proxy error:", err.message);
            if (res.headersSent) return res.end();
            return res.status(500).json({ error: err.message });
          }
          res.status(response.statusCode);
          const headersToForward = [
            "content-type",
            "content-range",
            "accept-ranges",
            "cache-control",
            "etag",
            "last-modified",
          ];
          headersToForward.forEach((header) => {
            if (response.headers[header]) {
              res.setHeader(header, response.headers[header]);
            }
          });
          const contentEncoding = response.headers["content-encoding"];
          let responseStream = response;
          if (!isVideo && contentEncoding === "gzip") {
            responseStream = response.pipe(zlib.createGunzip());
          } else if (!isVideo && contentEncoding === "deflate") {
            responseStream = response.pipe(zlib.createInflate());
          }
          const safeEnd = (err) => {
            if (err) console.error("Stream error:", err.message);
            if (!res.headersSent) res.status(500).end();
            else res.end();
          };
          const respContentType = response.headers["content-type"] || "";
          const isM3u8 =
            respContentType.includes("mpegurl") ||
            decodedUrl.includes(".m3u8");
          if (isVideo) {
            res.setHeader("Cache-Control", "no-cache");
          }
          if (isVideo && isM3u8) {
            let data = "";
            responseStream.on("data", (chunk) => {
              data += chunk.toString();
            });
            responseStream.on("end", () => {
              const rewrittenPlaylist = rewritePlaylistUrls(
                data,
                decodedUrl,
                proxyPath,
              );
              res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
              res.setHeader("Cache-Control", "no-cache");
              res.send(rewrittenPlaylist);
            });
            responseStream.on("error", safeEnd);
          } else {
            if (!contentEncoding && response.headers["content-length"]) {
              res.setHeader(
                "content-length",
                response.headers["content-length"],
              );
            }
            responseStream.pipe(res);
            responseStream.on("error", safeEnd);
            res.on("close", () => {
              if (!response.complete) {
                response.destroy();
              }
            });
          }
        },
      );
    } catch (error) {
      console.error("Error:", error);
      if (res.headersSent) return res.end();
      res.status(500).json({ error: error.message });
    }
  };
}

proxyApp.get("/proxy/live", createProxyHandler(true, "/proxy/live"));
proxyApp.get("/proxy/movie", createProxyHandler(true, "/proxy/movie"));
proxyApp.get("/proxy/series", createProxyHandler(true, "/proxy/series"));
proxyApp.get("/proxy", createProxyHandler(false, "/proxy"));

function makeRequestWithRedirect(
  httpModule,
  options,
  originalUrl,
  redirectCount,
  callback,
) {
  const MAX_REDIRECTS = 5;
  if (redirectCount >= MAX_REDIRECTS) {
    return callback(new Error("Too many redirects"));
  }
  const request = httpModule.request(options, (response) => {
    if (
      response.statusCode >= 300 &&
      response.statusCode < 400 &&
      response.headers.location
    ) {
      let redirectUrl;
      if (response.headers.location.startsWith("http")) {
        redirectUrl = response.headers.location;
      } else {
        const baseUrl = new URL(originalUrl);
        redirectUrl = new URL(response.headers.location, baseUrl.origin).href;
      }
      const redirectUrlObj = new URL(redirectUrl);
      const isHttps = redirectUrlObj.protocol === "https:";
      const newHttpModule = isHttps ? https : http;
      const newHostHeader = redirectUrlObj.port
        ? `${redirectUrlObj.hostname}:${redirectUrlObj.port}`
        : redirectUrlObj.hostname;
      const newOptions = {
        hostname: redirectUrlObj.hostname,
        port: redirectUrlObj.port || (isHttps ? 443 : 80),
        path: redirectUrlObj.pathname + redirectUrlObj.search,
        method: "GET",
        agent: options.agent,
        timeout: options.timeout,
        headers: {
          ...options.headers,
          Host: newHostHeader,
          Referer: `${redirectUrlObj.protocol}//${redirectUrlObj.host}/`,
        },
      };
      return makeRequestWithRedirect(
        newHttpModule,
        newOptions,
        redirectUrl,
        redirectCount + 1,
        callback,
      );
    }
    callback(null, response);
  });
  request.on("error", (err) => {
    callback(err);
  });
  request.on("timeout", () => {
    request.destroy();
    callback(new Error("Request timeout"));
  });
  request.end();
}

function rewritePlaylistUrls(playlistContent, baseUrl, proxyPath) {
  const lines = playlistContent.split("\n");
  const baseUrlObj = new URL(baseUrl);
  const rewrittenLines = lines.map((line) => {
    if (line.startsWith("#") || line.trim() === "") {
      return line;
    }
    if (line.trim().length > 0) {
      let absoluteUrl;
      if (line.startsWith("http://") || line.startsWith("https://")) {
        absoluteUrl = line.trim();
      } else if (line.startsWith("/")) {
        absoluteUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${line.trim()}`;
      } else {
        const basePath = baseUrlObj.pathname.substring(
          0,
          baseUrlObj.pathname.lastIndexOf("/") + 1,
        );
        absoluteUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${basePath}${line.trim()}`;
      }
      const encodedUrl = encodeURIComponent(absoluteUrl);
      return `${proxyPath}?url=${encodedUrl}`;
    }
    return line;
  });
  return rewrittenLines.join("\n");
}

proxyApp.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start proxy server with Electron app
proxyApp.listen(PROXY_PORT, () => {
  console.log(`Embedded proxy server running on port ${PROXY_PORT}`);
});
// --- End Embedded Proxy Server Logic ---
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
