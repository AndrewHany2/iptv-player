import { useState } from "react";
import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";

const AVATARS = ["👤","👨","👩","👦","👧","👴","👵","🧑","🎮","🎬","🍿","⚽","🎵","🦸","🎨","🐱"];

const ProfilesModal = ({ onClose }) => {
  const { appProfiles, activeProfileId, switchProfile, addProfile, updateProfile, removeProfile } =
    useApp();

  const [view, setView] = useState("list"); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formData, setFormData] = useState({ name: "", avatar: "👤" });

  const resetForm = () => {
    setFormData({ name: "", avatar: "👤" });
    setEditingId(null);
    setError(null);
    setView("list");
  };

  const openAdd = () => {
    setFormData({ name: "", avatar: "👤" });
    setEditingId(null);
    setError(null);
    setView("form");
  };

  const openEdit = (profile) => {
    setFormData({ name: profile.name, avatar: profile.avatar });
    setEditingId(profile.id);
    setError(null);
    setView("form");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError("Profile name is required."); return; }
    setLoading(true);
    setError(null);
    try {
      if (editingId) {
        await updateProfile(editingId, formData);
      } else {
        await addProfile(formData);
      }
      resetForm();
    } catch (err) {
      setError(err?.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (profileId) => {
    if (deleteConfirmId !== profileId) {
      setDeleteConfirmId(profileId);
      return;
    }
    setLoading(true);
    setDeleteConfirmId(null);
    try {
      await removeProfile(profileId);
    } catch (err) {
      setError(err?.message || "Failed to delete profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h2>👤 Profiles</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {error && <p className="form-error">{error}</p>}

          {view === "list" ? (
            <>
              <div className="section-header">
                <h3>Your Profiles</h3>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={openAdd}
                  disabled={loading}
                >
                  + Add Profile
                </button>
              </div>

              {appProfiles.length === 0 ? (
                <div className="empty-state">
                  <p>No profiles yet.</p>
                  <p className="hint">Click &quot;Add Profile&quot; to create your first one.</p>
                </div>
              ) : (
                <div className="users-list">
                  {appProfiles.map((p) => (
                    <div key={p.id} className={`user-card${activeProfileId === p.id ? " active-profile" : ""}`}>
                      <div className="user-info" style={{ flexDirection: "row", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "32px" }}>{p.avatar}</span>
                        <div>
                          <h4>{p.name}</h4>
                          {activeProfileId === p.id && <span className="active-badge">✓ Active</span>}
                          {deleteConfirmId === p.id && (
                            <span className="confirm-text"> Click Delete again to confirm</span>
                          )}
                        </div>
                      </div>
                      <div className="user-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => { switchProfile(p.id); onClose(); }}
                          disabled={loading || activeProfileId === p.id}
                        >
                          {activeProfileId === p.id ? "Active" : "Switch"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(p)}
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm${deleteConfirmId === p.id ? " btn-danger" : " btn-secondary"}`}
                          onClick={() => handleDelete(p.id)}
                          disabled={loading}
                        >
                          {deleteConfirmId === p.id ? "Confirm Delete" : "🗑️ Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form className="user-form-section" onSubmit={handleSave}>
              <h3>{editingId ? "Edit Profile" : "Add New Profile"}</h3>

              <label htmlFor="profile-form-name">Name *</label>
              <input
                id="profile-form-name"
                type="text"
                className="input-field"
                value={formData.name}
                placeholder="e.g. Dad, Kids…"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
                disabled={loading}
              />

              <span className="form-label">Avatar</span>
              <div className="profile-avatar-grid">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`profile-avatar-btn${formData.avatar === emoji ? " selected" : ""}`}
                    onClick={() => setFormData({ ...formData, avatar: emoji })}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

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
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !formData.name.trim()}
                >
                  {loading ? "Saving…" : editingId ? "Save Changes" : "Create Profile"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

ProfilesModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default ProfilesModal;
