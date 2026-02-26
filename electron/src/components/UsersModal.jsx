import { useState } from "react";
import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

const UsersModal = ({ onClose }) => {
  const {
    users,
    activeUserId,
    setActiveUserId,
    saveUsers,
    addUser,
    updateUser,
    removeUser,
    setChannels,
  } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nickname: "",
    host: "",
    username: "",
    password: "",
  });

  const resetForm = () => {
    setFormData({ nickname: "", host: "", username: "", password: "" });
    setEditingId(null);
    setShowForm(false);
  };

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

  const handleSave = async () => {
    if (!formData.host || !formData.username || !formData.password) {
      // eslint-disable-next-line no-alert
      alert("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await updateUser(editingId, formData);
      } else {
        await addUser(formData);
      }
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    // eslint-disable-next-line no-alert, no-restricted-globals
    if (!confirm("Are you sure you want to delete this account?")) return;
    setLoading(true);
    try {
      await removeUser(userId);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setActiveUserId(userId);
    saveUsers();

    setLoading(true);
    try {
      iptvApi.setCredentials(user.host, user.username, user.password);
      const channelsData = await iptvApi.getLiveStreams();
      const formattedChannels = channelsData.map((ch) => ({
        name: ch.name,
        url: iptvApi.buildStreamUrl("live", ch.stream_id, ch.stream_type || "ts"),
        id: ch.stream_id,
      }));
      setChannels(formattedChannels);
      // eslint-disable-next-line no-alert
      alert(
        `Connected to ${user.nickname || user.username}! Loaded ${formattedChannels.length} channels.`
      );
      onClose();
    } catch (err) {
      console.error("Error loading channels:", err);
      // eslint-disable-next-line no-alert
      alert("Failed to load channels. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h2>📡 IPTV Accounts</h2>
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
                <h3>Saved Accounts</h3>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddNew}
                  disabled={loading}
                >
                  ➕ Add Account
                </button>
              </div>

              {users.length === 0 ? (
                <div className="empty-state">
                  <p>No IPTV accounts added yet</p>
                  <p className="hint">
                    Click &quot;Add Account&quot; to add your first IPTV service
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
                          disabled={loading}
                        >
                          🔗 Connect
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEdit(user)}
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(user.id)}
                          disabled={loading}
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
              <h3>{editingId ? "Edit Account" : "Add New Account"}</h3>

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
                disabled={loading}
              />

              <label htmlFor="user-host">Server/Host:</label>
              <input
                id="user-host"
                type="text"
                className="input-field"
                placeholder="s1.example.com:8080"
                value={formData.host}
                onChange={(e) =>
                  setFormData({ ...formData, host: e.target.value })
                }
                required
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              />

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? "Saving…" : "💾 Save"}
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
