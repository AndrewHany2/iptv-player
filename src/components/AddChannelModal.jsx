import { useState } from "react";
import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";

const AddChannelModal = ({ onClose }) => {
  const { channels, setChannels, saveChannels } = useApp();
  const [channelName, setChannelName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");

  const handleAdd = () => {
    if (!channelName || !streamUrl) {
      // eslint-disable-next-line no-alert
      alert("Please fill in both channel name and stream URL");
      return;
    }

    const newChannel = {
      name: channelName,
      url: streamUrl,
      id: Date.now().toString(),
    };

    setChannels([...channels, newChannel]);
    saveChannels();

    // eslint-disable-next-line no-alert
    alert("Channel added successfully!");
    onClose();
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add Channel</h2>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <label htmlFor="channel-name">Channel Name:</label>
          <input
            id="channel-name"
            type="text"
            className="input-field"
            placeholder="Enter channel name"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
          />

          <label htmlFor="stream-url">Stream URL:</label>
          <input
            id="stream-url"
            type="text"
            className="input-field"
            placeholder="http://example.com/stream.m3u8"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
          />

          <div className="url-hint">
            Supported formats: HTTP/HTTPS streams (HLS .m3u8, DASH .mpd, direct
            video files)
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAdd}
            >
              Add Channel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

AddChannelModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default AddChannelModal;
