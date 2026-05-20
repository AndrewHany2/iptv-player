import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";

const AVATARS = ["👤","👨","👩","👦","👧","👴","👵","🧑","🎮","🎬","🍿","⚽","🎵","🦸","🎨","🐱"];
const AVATAR_COLS = 8;

const TVProfileSelector = () => {
  const { appProfiles, switchProfile, addProfile } = useApp();

  const [view, setView] = useState("picker"); // 'picker' | 'add'
  const [focusIdx, setFocusIdx] = useState(0);
  const [formField, setFormField] = useState(0); // 0=name, 1=avatarGrid, 2=save, 3=cancel
  const [avatarGridIdx, setAvatarGridIdx] = useState(0);
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState("👤");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cardRefs = useRef([]);
  const nameRef = useRef(null);
  const avatarBtnRefs = useRef([]);
  const saveRef = useRef(null);
  const cancelRef = useRef(null);

  const totalCards = appProfiles.length + 1; // +1 for "Add Profile"

  useEffect(() => {
    cardRefs.current[0]?.focus();
  }, []);

  const openAdd = () => {
    setNewName("");
    setNewAvatar("👤");
    setAvatarGridIdx(0);
    setFormField(0);
    setError(null);
    setView("add");
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const handleSave = async () => {
    if (!newName.trim()) { setError("Enter a profile name."); return; }
    setLoading(true);
    setError(null);
    try {
      const profile = await addProfile({ name: newName.trim(), avatar: newAvatar });
      if (profile) switchProfile(profile.id);
    } catch (err) {
      setError(err?.message || "Failed to create profile.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickerKey = useCallback((e, idx) => {
    switch (e.key) {
      case "ArrowRight": {
        e.preventDefault();
        const next = Math.min(idx + 1, totalCards - 1);
        setFocusIdx(next);
        cardRefs.current[next]?.focus();
        break;
      }
      case "ArrowLeft": {
        e.preventDefault();
        const prev = Math.max(idx - 1, 0);
        setFocusIdx(prev);
        cardRefs.current[prev]?.focus();
        break;
      }
      case "Enter":
        e.preventDefault();
        if (idx < appProfiles.length) {
          switchProfile(appProfiles[idx].id);
        } else {
          openAdd();
        }
        break;
      default:
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appProfiles, totalCards, switchProfile]);

  const focusFormField = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(idx, 3));
    setFormField(clamped);
    if (clamped === 0) nameRef.current?.focus();
    else if (clamped === 1) avatarBtnRefs.current[avatarGridIdx]?.focus();
    else if (clamped === 2) saveRef.current?.focus();
    else cancelRef.current?.focus();
  }, [avatarGridIdx]);

  const handleFormKey = useCallback((e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setView("picker");
      setTimeout(() => cardRefs.current[appProfiles.length]?.focus(), 50);
      return;
    }

    if (formField === 1) {
      // Avatar grid navigation
      const row = Math.floor(avatarGridIdx / AVATAR_COLS);
      const col = avatarGridIdx % AVATAR_COLS;
      const rows = Math.ceil(AVATARS.length / AVATAR_COLS);

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(avatarGridIdx + 1, AVATARS.length - 1);
        setAvatarGridIdx(next);
        setNewAvatar(AVATARS[next]);
        avatarBtnRefs.current[next]?.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = Math.max(avatarGridIdx - 1, 0);
        setAvatarGridIdx(prev);
        setNewAvatar(AVATARS[prev]);
        avatarBtnRefs.current[prev]?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (row < rows - 1) {
          const next = Math.min(avatarGridIdx + AVATAR_COLS, AVATARS.length - 1);
          setAvatarGridIdx(next);
          setNewAvatar(AVATARS[next]);
          avatarBtnRefs.current[next]?.focus();
        } else {
          focusFormField(2);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (row > 0) {
          const prev = avatarGridIdx - AVATAR_COLS;
          setAvatarGridIdx(prev);
          setNewAvatar(AVATARS[prev]);
          avatarBtnRefs.current[prev]?.focus();
        } else {
          focusFormField(0);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        setNewAvatar(AVATARS[avatarGridIdx]);
        focusFormField(2);
      }
      // suppress col warning
      void col;
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusFormField(formField + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusFormField(formField - 1);
    } else if (e.key === "Enter" && formField === 2) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Enter" && formField === 3) {
      e.preventDefault();
      setView("picker");
      setTimeout(() => cardRefs.current[appProfiles.length]?.focus(), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formField, avatarGridIdx, appProfiles.length, focusFormField, handleSave]);

  return (
    <div className="tv-profile-selector" onKeyDown={view === "add" ? handleFormKey : undefined}>
      {view === "picker" ? (
        <>
          <h1 className="tv-profile-selector-title">Who&apos;s watching?</h1>

          <div className="tv-profile-cards">
            {appProfiles.map((p, idx) => (
              <button
                key={p.id}
                ref={(el) => (cardRefs.current[idx] = el)}
                type="button"
                className="tv-profile-card"
                tabIndex={-1}
                onFocus={() => setFocusIdx(idx)}
                onKeyDown={(e) => handlePickerKey(e, idx)}
                onClick={() => switchProfile(p.id)}
              >
                <span className="tv-profile-card-avatar">{p.avatar}</span>
                <span className="tv-profile-card-name">{p.name}</span>
              </button>
            ))}

            <button
              ref={(el) => (cardRefs.current[appProfiles.length] = el)}
              type="button"
              className="tv-profile-card tv-profile-card-add"
              tabIndex={-1}
              onFocus={() => setFocusIdx(appProfiles.length)}
              onKeyDown={(e) => handlePickerKey(e, appProfiles.length)}
              onClick={openAdd}
            >
              <span className="tv-profile-card-avatar">+</span>
              <span className="tv-profile-card-name">Add Profile</span>
            </button>
          </div>

          <p className="tv-profile-hint">← → navigate · Enter to select</p>
        </>
      ) : (
        <div className="tv-profile-form-wrap">
          <h2 className="tv-profile-form-title">New Profile</h2>

          {error && <p className="tv-profile-error">{error}</p>}

          <div className="tv-profile-field">
            <label className="tv-profile-label" htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              ref={nameRef}
              type="text"
              className="tv-input"
              value={newName}
              placeholder="e.g. Dad, Kids…"
              onChange={(e) => setNewName(e.target.value)}
              onFocus={() => setFormField(0)}
              disabled={loading}
            />
          </div>

          <div className="tv-profile-field">
            <span className="tv-profile-label">Avatar</span>
            <div className="tv-avatar-grid">
              {AVATARS.map((emoji, i) => (
                <button
                  key={emoji}
                  ref={(el) => (avatarBtnRefs.current[i] = el)}
                  type="button"
                  className={`tv-avatar-btn${newAvatar === emoji ? " selected" : ""}`}
                  tabIndex={-1}
                  onFocus={() => { setFormField(1); setAvatarGridIdx(i); }}
                  onClick={() => { setNewAvatar(emoji); setAvatarGridIdx(i); }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="tv-profile-form-actions">
            <button
              ref={saveRef}
              type="button"
              className="tv-btn tv-btn-primary"
              tabIndex={-1}
              onFocus={() => setFormField(2)}
              onClick={handleSave}
              disabled={loading || !newName.trim()}
            >
              {loading ? "Creating…" : "Create Profile"}
            </button>
            <button
              ref={cancelRef}
              type="button"
              className="tv-btn"
              style={{ background: "#1f1f1f", color: "#9ca3af" }}
              tabIndex={-1}
              onFocus={() => setFormField(3)}
              onClick={() => {
                setView("picker");
                setTimeout(() => cardRefs.current[appProfiles.length]?.focus(), 50);
              }}
              disabled={loading}
            >
              Cancel
            </button>
          </div>

          <p className="tv-profile-hint">↑↓ navigate · Enter to confirm · Esc to go back</p>
        </div>
      )}
    </div>
  );
};

export default TVProfileSelector;
