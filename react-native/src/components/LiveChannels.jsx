import { useApp } from "../context/AppContext";

const LiveChannels = () => {
  const { filteredChannels, currentChannelIndex, setCurrentChannelIndex } =
    useApp();

  const handleChannelClick = (index) => {
    setCurrentChannelIndex(index);
  };

  if (filteredChannels.length === 0) {
    return (
      <div className="empty-state">
        <p>No channels loaded</p>
        <p className="hint">Connect to an IPTV service to load channels</p>
      </div>
    );
  }

  return (
    <div className="channel-list">
      {filteredChannels.map((channel, index) => {
        // Try multiple possible image field names for channel logo
        const logoUrl =
          channel.stream_icon || channel.icon || channel.logo || channel.cover;

        return (
          <div
            key={channel.id || channel.stream_id || index}
            className={`channel-item ${currentChannelIndex === index ? "active" : ""}`}
            onClick={() => handleChannelClick(index)}
          >
            {logoUrl && (
              <img
                src={logoUrl}
                alt={channel.name}
                className="channel-logo"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
            <span className="channel-name">{channel.name}</span>
          </div>
        );
      })}
    </div>
  );
};

export default LiveChannels;
