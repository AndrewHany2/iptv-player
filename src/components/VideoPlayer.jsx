import { useApp } from "../context/AppContext";

const VideoPlayer = () => {
  const { filteredChannels, currentChannelIndex } = useApp();

  const currentChannel =
    currentChannelIndex >= 0 ? filteredChannels[currentChannelIndex] : null;

  return (
    <main className="player-area">
      <div className="video-container">
        <video
          id="videoPlayer"
          controls
          autoPlay
          preload="auto"
          crossOrigin="anonymous"
        >
          Your browser does not support the video tag.
        </video>

        <div id="loadingIndicator" className="loading-indicator hidden">
          <div className="spinner"></div>
          <p>Loading stream...</p>
        </div>

        <div id="errorMessage" className="error-message hidden">
          <p>❌ Failed to load stream</p>
          <p className="error-details"></p>
        </div>
      </div>

      <div className="player-controls">
        <div className="now-playing">
          <span className="label">Now Playing:</span>
          <span className="channel-name">
            {currentChannel ? currentChannel.name : "No channel selected"}
          </span>
        </div>
        <div className="control-buttons">
          <button
            type="button"
            className="btn-control"
            title="Previous Channel"
          >
            ⏮️
          </button>
          <button type="button" className="btn-control" title="Play/Pause">
            ▶️
          </button>
          <button type="button" className="btn-control" title="Next Channel">
            ⏭️
          </button>
          <button type="button" className="btn-control" title="Fullscreen">
            ⛶
          </button>
          <input
            type="range"
            className="volume-slider"
            min="0"
            max="100"
            defaultValue="100"
            title="Volume"
          />
        </div>
      </div>
    </main>
  );
};

export default VideoPlayer;
