const express = require("express");
const http = require("http");
const https = require("https");
const { URL } = require("url");

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

    // Prepare request options
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        Connection: "close",
      },
      timeout: 30000, // 30 second timeout
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
          return res.status(500).json({ error: err.message });
        }

        // Forward status code
        res.status(response.statusCode);

        // Forward relevant headers
        const headersToForward = [
          "content-type",
          "content-length",
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

        // Handle m3u8 playlist - rewrite URLs to go through proxy
        if (
          response.headers["content-type"]?.includes(
            "application/vnd.apple.mpegurl",
          ) ||
          response.headers["content-type"]?.includes("application/x-mpegURL") ||
          decodedUrl.includes(".m3u8")
        ) {
          let data = "";
          response.on("data", (chunk) => {
            data += chunk.toString();
          });

          response.on("end", () => {
            // Rewrite URLs in playlist to go through proxy
            const rewrittenPlaylist = rewritePlaylistUrls(data, decodedUrl);
            res.send(rewrittenPlaylist);
          });

          response.on("error", (err) => {
            console.error("Stream error:", err);
            res.status(500).end();
          });
        } else {
          // For .ts segments and other content, pipe directly
          response.pipe(res);

          response.on("error", (err) => {
            console.error("Stream error:", err);
            res.status(500).end();
          });
        }
      },
    );
  } catch (error) {
    console.error("Error:", error);
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
      // Parse redirect URL
      let redirectUrl;
      if (response.headers.location.startsWith("http")) {
        redirectUrl = response.headers.location;
      } else {
        // Relative URL
        const baseUrl = new URL(originalUrl);
        redirectUrl = new URL(response.headers.location, baseUrl.origin).href;
      }

      const redirectUrlObj = new URL(redirectUrl);
      const isHttps = redirectUrlObj.protocol === "https:";
      const newHttpModule = isHttps ? https : http;

      const newOptions = {
        hostname: redirectUrlObj.hostname,
        port: redirectUrlObj.port || (isHttps ? 443 : 80),
        path: redirectUrlObj.pathname + redirectUrlObj.search,
        method: "GET",
        headers: options.headers,
      };

      // Follow redirect
      return makeRequestWithRedirect(
        newHttpModule,
        newOptions,
        redirectUrl,
        redirectCount + 1,
        callback,
      );
    }

    // Success - return response
    callback(null, response);
  });

  request.on("error", (err) => {
    callback(err);
  });

  request.end();
}

// Helper function to rewrite URLs in m3u8 playlist
function rewritePlaylistUrls(playlistContent, baseUrl) {
  const lines = playlistContent.split("\n");
  const baseUrlObj = new URL(baseUrl);

  const rewrittenLines = lines.map((line) => {
    // Skip comments and empty lines
    if (line.startsWith("#") || line.trim() === "") {
      return line;
    }

    // Check if line is a URL
    if (line.trim().length > 0) {
      let absoluteUrl;

      if (line.startsWith("http://") || line.startsWith("https://")) {
        // Already absolute URL
        absoluteUrl = line;
      } else if (line.startsWith("/")) {
        // Absolute path
        absoluteUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${line}`;
      } else {
        // Relative path
        const basePath = baseUrlObj.pathname.substring(
          0,
          baseUrlObj.pathname.lastIndexOf("/") + 1,
        );
        absoluteUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${basePath}${line}`;
      }

      // Encode and proxy the URL
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
  // Server started
});
