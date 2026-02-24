const express = require("express");
const http = require("http");
const https = require("https");
const zlib = require("zlib");
const { URL } = require("url");

// Keep-alive agents for live video streams only
const httpKeepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });
const httpsKeepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

// Default agents (no keep-alive) for API calls
const httpAgent = new http.Agent({ keepAlive: false });
const httpsAgent = new https.Agent({ keepAlive: false });

// Detect if URL is a live video stream (not an API call)
function isVideoStream(url) {
  return /\/(live|movie|series)\//.test(url);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use((req, res, next) => {
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

// Proxy endpoint
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    // Decode the URL
    const decodedUrl = decodeURIComponent(targetUrl);

    // Parse URL
    const urlObj = new URL(decodedUrl);
    const isHttps = urlObj.protocol === "https:";
    const httpModule = isHttps ? https : http;

    // Prepare request options - matching IPTVSmartersPro headers exactly
    const hostHeader = urlObj.port
      ? `${urlObj.hostname}:${urlObj.port}`
      : urlObj.hostname;
    const videoStream = isVideoStream(decodedUrl);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      agent: videoStream
        ? isHttps ? httpsKeepAliveAgent : httpKeepAliveAgent
        : isHttps ? httpsAgent : httpAgent,
      headers: {
        Host: hostHeader,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) IPTVSmartersPro/1.1.1 Chrome/53.0.2785.143 Electron/1.4.16 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US",
        // Video streams: no compression (binary data). API calls: accept gzip.
        "Accept-Encoding": videoStream ? "identity" : "gzip, deflate",
        Connection: "keep-alive",
        Referer: `${urlObj.protocol}//${urlObj.host}/`,
      },
      timeout: videoStream ? 0 : 30000, // no timeout for live streams
    };

    // Add Range header if present (for video seeking)
    if (req.headers.range) {
      options.headers["Range"] = req.headers.range;
    }

    // Make request with redirect handling
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

        // Forward status code
        res.status(response.statusCode);

        // Forward relevant headers (but not content-encoding since we decompress)
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

        // Decompress only for non-video (API/JSON) responses
        const contentEncoding = response.headers["content-encoding"];
        let responseStream = response;

        if (!videoStream && contentEncoding === "gzip") {
          responseStream = response.pipe(zlib.createGunzip());
        } else if (!videoStream && contentEncoding === "deflate") {
          responseStream = response.pipe(zlib.createInflate());
        }

        const safeEnd = (err) => {
          if (err) console.error("Stream error:", err.message);
          if (!res.headersSent) res.status(500).end();
          else res.end();
        };

        // Handle m3u8 playlist - rewrite URLs to go through proxy
        const contentType = response.headers["content-type"] || "";
        if (
          contentType.includes("application/vnd.apple.mpegurl") ||
          contentType.includes("application/x-mpegURL") ||
          decodedUrl.includes(".m3u8")
        ) {
          let data = "";
          responseStream.on("data", (chunk) => {
            data += chunk.toString();
          });

          responseStream.on("end", () => {
            const rewrittenPlaylist = rewritePlaylistUrls(data, decodedUrl);
            res.send(rewrittenPlaylist);
          });

          responseStream.on("error", safeEnd);
        } else {
          // For video streams: pipe binary data directly, no content-length for chunked
          if (!contentEncoding && response.headers["content-length"]) {
            res.setHeader("content-length", response.headers["content-length"]);
          }

          responseStream.pipe(res);
          responseStream.on("error", safeEnd);
          res.on("close", () => response.destroy());
        }
      },
    );
  } catch (error) {
    console.error("Error:", error);
    if (res.headersSent) return res.end();
    res.status(500).json({ error: error.message });
  }
});

// Helper function to handle redirects
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
    // Handle redirects (301, 302, 303, 307, 308)
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

// Helper function to rewrite URLs in m3u8 playlist
function rewritePlaylistUrls(playlistContent, baseUrl) {
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
      return `/proxy?url=${encodedUrl}`;
    }

    return line;
  });

  return rewrittenLines.join("\n");
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
