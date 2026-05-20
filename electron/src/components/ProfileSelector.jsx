import { useState } from "react";
import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";

const AVATARS = ["👤","👨","👩","👦","👧","👴","👵","🧑","🎮","🎬","🍿","⚽","🎵","🦸","🎨","🐱"];

const ProfileSelector = ({ onManage }) => {
  const { appProfiles, switchProfile, addProfile } = useApp();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("👤");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Enter a profile name."); return; }
    setLoading(true);
    setError(null);
    try {
      const profile = await addProfile({ name: name.trim(), avatar });
      if (profile) switchProfile(profile.id);
    } catch (err) {
      setError(err?.message || "Failed to create profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-selector-overlay">
      <div className="profile-selector">
        <h1 className="profile-selector-title">Who&apos;s watching?</h1>

        {!showAdd ? (
          <>
            <div className="profile-cards">
              {appProfiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="profile-card"
                  onClick={() => switchProfile(p.id)}
                >
                  <span className="profile-card-avatar">{p.avatar}</span>
                  <span className="profile-card-name">{p.name}</span>
                </button>
              ))}

              <button
                type="button"
                className="profile-card profile-card-add"
                onClick={() => setShowAdd(true)}
              >
                <span className="profile-card-avatar">+</span>
                <span className="profile-card-name">Add Profile</span>
              </button>
            </div>

            {appProfiles.length > 0 && (
              <button
                type="button"
                className="profile-manage-link"
                onClick={onManage}
              >
                Manage Profiles
              </button>
            )}
          </>
        ) : (
          <form className="profile-add-form" onSubmit={handleCreate}>
            <h2 className="profile-form-subtitle">New Profile</h2>

            {error && <p className="profile-form-error">{error}</p>}

            <label htmlFor="new-profile-name" className="profile-form-label">Name</label>
            <input
              id="new-profile-name"
              type="text"
              className="input-field"
              value={name}
              placeholder="e.g. Dad, Kids…"
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={loading}
            />

            <span className="profile-form-label">Avatar</span>
            <div className="profile-avatar-grid">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`profile-avatar-btn${avatar === emoji ? " selected" : ""}`}
                  onClick={() => setAvatar(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="profile-form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowAdd(false); setError(null); }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !name.trim()}
              >
                {loading ? "Creating…" : "Create Profile"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

ProfileSelector.propTypes = {
  onManage: PropTypes.func.isRequired,
};

export default ProfileSelector;
