import { useState } from "react";
import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

const UsersModal = ({ onClose }) => {
  const {
    users,
    setUsers,
    activeUserId,
    setActiveUserId,
    saveUsers,
    setChannels,
  } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nickname: "",
    host: "",
    username: "",
    password: "",
  });

  const handleAddNew = () => {
    setFormData({ nickname: "", host: "", username: "", password: "" });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setFormData({
      nickname: user.nickname || "",
      host: user.host,
      username: user.username,
      password: user.password,
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.host || !formData.username || !formData.password) {
      // eslint-disable-next-line no-alert
      alert("Please fill in all required fields");
      return;
    }

    if (editingId) {
      // Update existing user
      setUsers(
        users.map((u) => (u.id === editingId ? { ...u, ...formData } : u)),
      );
    } else {
      // Add new user
      const newUser = {
        id: Date.now().toString(),
        ...formData,
      };
      setUsers([...users, newUser]);
    }

    saveUsers();
    setShowForm(false);
    setFormData({ nickname: "", host: "", username: "", password: "" });
  };

  const handleDelete = (userId) => {
    // eslint-disable-next-line no-alert, no-restricted-globals
    if (!confirm("Are you sure you want to delete this user?")) return;

    setUsers(users.filter((u) => u.id !== userId));
    if (activeUserId === userId) {
      setActiveUserId(null);
    }
    saveUsers();
  };

  const handleConnect = async (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setActiveUserId(userId);
    saveUsers();

    // Load channels
    try {
      iptvApi.setCredentials(user.host, user.username, user.password);
      const channelsData = await iptvApi.getLiveStreams();

      const formattedChannels = channelsData.map((ch) => ({
        name: ch.name,
        url: iptvApi.buildStreamUrl(
          "live",
          ch.stream_id,
          ch.stream_type || "ts",
        ),
        id: ch.stream_id,
      }));

      setChannels(formattedChannels);
      // eslint-disable-next-line no-alert
      alert(
        `Connected to ${user.nickname || user.username}! Loaded ${formattedChannels.length} channels.`,
      );
      onClose();
    } catch (error) {
      console.error("Error loading channels:", error);
      // eslint-disable-next-line no-alert
      alert("Failed to load channels. Please check your credentials.");
    }
  };

  return (
    <div className="modal">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h2>👥 IPTV Users Management</h2>
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
          {!showForm ? (
            <>
              <div className="section-header">
                <h3>Saved Users</h3>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddNew}
                >
                  ➕ Add New User
                </button>
              </div>

              {users.length === 0 ? (
                <div className="empty-state">
                  <p>No users added yet</p>
                  <p className="hint">
                    Click "Add New User" to add your first IPTV service
                  </p>
                </div>
              ) : (
                <div className="users-list">
                  {users.map((user) => (
                    <div key={user.id} className="user-card">
                      <div className="user-info">
                        <h4>
                          {user.nickname || `${user.username}@${user.host}`}
                        </h4>
                        <p>{user.host}</p>
                        {activeUserId === user.id && (
                          <span className="active-badge">✓ Active</span>
                        )}
                      </div>
                      <div className="user-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleConnect(user.id)}
                        >
                          🔗 Connect
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEdit(user)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(user.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="user-form-section">
              <h3>{editingId ? "Edit User" : "Add New User"}</h3>

              <label htmlFor="user-nickname">Nickname (optional):</label>
              <input
                id="user-nickname"
                type="text"
                className="input-field"
                placeholder="e.g., My IPTV Service"
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
              />

              <label htmlFor="user-host">Server/Host:</label>
              <input
                id="user-host"
                type="text"
                className="input-field"
                placeholder="s1.nasaservers.com:8080"
                value={formData.host}
                onChange={(e) =>
                  setFormData({ ...formData, host: e.target.value })
                }
                required
              />

              <label htmlFor="user-username">Username:</label>
              <input
                id="user-username"
                type="text"
                className="input-field"
                placeholder="Your username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />

              <label htmlFor="user-password">Password:</label>
              <input
                id="user-password"
                type="password"
                className="input-field"
                placeholder="Your password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                >
                  💾 Save User
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

UsersModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default UsersModal;
