# IPTV Player

A modern IPTV player built with Electron and React, supporting Xtream Codes API for Live TV, Movies, and Series.

## Features

- 📺 **Live TV** - Browse and play live IPTV channels
- 🎬 **Movies** - Browse movies by category with VLC playback
- 📺 **Series** - Watch TV shows with season/episode navigation
- 👥 **Multi-User** - Manage multiple IPTV service accounts
- 🔍 **Search** - Search across all content types
- 🎥 **VLC Integration** - Reliable playback with VLC Media Player
- 🌐 **Proxy Support** - Built-in proxy server for CORS handling

## Tech Stack

- **Electron** - Desktop application framework
- **React** - UI library with hooks and context
- **Vite** - Fast build tool and dev server
- **Express** - Proxy server for API calls
- **HLS.js** - HTTP Live Streaming support

## Prerequisites

- Node.js (v16 or higher)
- VLC Media Player (for stream playback)

## Installation

```bash
# Install dependencies
npm install

# Install VLC (macOS)
brew install --cask vlc
```

## Development

```bash
# Start the app in development mode
npm run dev

# Start the proxy server (in a separate terminal)
npm run proxy
```

## Build

```bash
# Build the React app
npm run build

# Run the built app
npm start
```

## Project Structure

```
iptv-player/
├── src/                    # React application
│   ├── components/         # React components
│   ├── context/           # State management
│   ├── services/          # API services
│   ├── App.jsx            # Main app component
│   └── main.jsx           # React entry point
├── main.js                # Electron main process
├── preload.js             # Electron preload script
├── proxy-server.js        # Express proxy server
├── index.html             # HTML template
└── vite.config.mjs        # Vite configuration
```

## Usage

1. **Add IPTV Service**
   - Click "Users" button
   - Add your Xtream Codes credentials
   - Click "Connect" to load channels

2. **Browse Content**
   - Use tabs to switch between Live TV, Movies, and Series
   - Click categories to browse content
   - Search for specific content

3. **Play Content**
   - Click any channel/movie/episode
   - Choose VLC for reliable playback
   - Or try browser playback (may have limitations)

## Configuration

### Proxy Server

The proxy server runs on `http://localhost:3000` and handles:

- CORS headers
- 302 redirects
- Authentication headers
- Connection management

### Xtream Codes API

Supports standard Xtream Codes endpoints:

- `get_live_streams` - Live TV channels
- `get_vod_categories` - Movie categories
- `get_vod_streams` - Movies list
- `get_series_categories` - Series categories
- `get_series` - Series list
- `get_series_info` - Episodes by season

## License

ISC
