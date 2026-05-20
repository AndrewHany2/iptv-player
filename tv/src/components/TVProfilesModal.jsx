import { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";

const AVATARS = ["👤","👨","👩","👦","👧","👴","👵","🧑","🎮","🎬","🍿","⚽","🎵","🦸","🎨","🐱"];
const AVATAR_COLS = 8;

const TVProfilesModal = ({ onClose }) => {
  const { appProfiles, activeProfileId, switchProfile, addProfile, updateProfile, removeProfile } =
    useApp();

  const [view, setView] = useState("list"); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formData, setFormData] = useState({ name: "", avatar: "👤" });
  const [avatarGridIdx, setAvatarGridIdx] = useState(0);

  // list focus: area='top' (close/add), area='list' row
  const [listArea, setListArea] = useState("top");
  const [listTopCol, setListTopCol] = useState(0); // 0=close, 1=add
  const [listRow, setListRow] = useState(0);
  const [listCol, setListCol] = useState(0); // 0=switch, 1=edit, 2=delete

  // form focus: 0=name, 1=avatarGrid, 2=save, 3=cancel
  const [formField, setFormField] = useState(0);

  const closeRef = useRef(null);
  const addRef = useRef(null);
  const rowRefs = useRef([]); // [row][col]
  const nameRef = useRef(null);
  const avatarBtnRefs = useRef([]);
  const saveRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    rowRefs.current = rowRefs.current.slice(0, appProfiles.length);
  }, [appProfiles.length]);

  const focusTop = useCallback((col = 0) => {
    setListArea("top");
    setListTopCol(col);
    if (col === 0) closeRef.current?.focus();
    else addRef.current?.focus();
  }, []);

  const focusRow = useCallback((row, col = 0) => {
    const r = Math.max(0, Math.min(row, appProfiles.length - 1));
    setListArea("list");
    setListRow(r);
    setListCol(col);
    rowRefs.current[r]?.[col]?.focus();
  }, [appProfiles.length]);

  const openAdd = () => {
    setFormData({ name: "", avatar: "👤" });
    setAvatarGridIdx(0);
    setEditingId(null);
    setError(null);
    setFormField(0);
    setView("form");
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const openEdit = (profile) => {
    const avatarIdx = AVATARS.indexOf(profile.avatar);
    setFormData({ name: profile.name, avatar: profile.avatar });
    setAvatarGridIdx(avatarIdx >= 0 ? avatarIdx : 0);
    setEditingId(profile.id);
    setError(null);
    setFormField(0);
    setView("form");
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const resetForm = () => {
    setView("list");
    setError(null);
    setTimeout(() => focusTop(editingId ? 0 : 1), 50);
  };

  const handleSave = async () => {
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
      const newLen = appProfiles.length - 1;
      if (newLen === 0) focusTop(1);
      else focusRow(Math.max(0, listRow - 1));
    } catch (err) {
      setError(err?.message || "Failed to delete profile.");
    } finally {
      setLoading(false);
    }
  };

  const focusFormField = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(idx, 3));
    setFormField(clamped);
    if (clamped === 0) nameRef.current?.focus();
    else if (clamped === 1) avatarBtnRefs.current[avatarGridIdx]?.focus();
    else if (clamped === 2) saveRef.current?.focus();
    else cancelRef.current?.focus();
  }, [avatarGridIdx]);

  const handleListKey = useCallback((e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (deleteConfirmId) { setDeleteConfirmId(null); return; }
      onClose();
      return;
    }

    if (listArea === "top") {
      switch (e.key) {
        case "ArrowRight": e.preventDefault(); focusTop(1); break;
        case "ArrowLeft":  e.preventDefault(); focusTop(0); break;
        case "ArrowDown":
          e.preventDefault();
          if (appProfiles.length > 0) focusRow(0);
          break;
        case "Enter":
          e.preventDefault();
          if (listTopCol === 0) onClose();
          else openAdd();
          break;
        default:
      }
      return;
    }

    // list area
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (listRow < appProfiles.length - 1) focusRow(listRow + 1, listCol);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (listRow > 0) focusRow(listRow - 1, listCol);
        else focusTop(listTopCol);
        break;
      case "ArrowRight":
        e.preventDefault();
        focusRow(listRow, Math.min(listCol + 1, 2));
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (listCol > 0) focusRow(listRow, listCol - 1);
        else focusTop(0);
        break;
      case "Enter": {
        e.preventDefault();
        const p = appProfiles[listRow];
        if (!p) break;
        if (listCol === 0) { switchProfile(p.id); onClose(); }
        else if (listCol === 1) openEdit(p);
        else handleDelete(p.id);
        break;
      }
      default:
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listArea, listTopCol, listRow, listCol, appProfiles, deleteConfirmId, onClose, focusTop, focusRow]);

  const handleFormKey = useCallback((e) => {
    if (e.key === "Escape") { e.preventDefault(); resetForm(); return; }

    if (formField === 1) {
      const row = Math.floor(avatarGridIdx / AVATAR_COLS);
      const rows = Math.ceil(AVATARS.length / AVATAR_COLS);

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(avatarGridIdx + 1, AVATARS.length - 1);
        setAvatarGridIdx(next);
        setFormData((d) => ({ ...d, avatar: AVATARS[next] }));
        avatarBtnRefs.current[next]?.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = Math.max(avatarGridIdx - 1, 0);
        setAvatarGridIdx(prev);
        setFormData((d) => ({ ...d, avatar: AVATARS[prev] }));
        avatarBtnRefs.current[prev]?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (row < rows - 1) {
          const next = Math.min(avatarGridIdx + AVATAR_COLS, AVATARS.length - 1);
          setAvatarGridIdx(next);
          setFormData((d) => ({ ...d, avatar: AVATARS[next] }));
          avatarBtnRefs.current[next]?.focus();
        } else {
          focusFormField(2);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (row > 0) {
          const prev = avatarGridIdx - AVATAR_COLS;
          setAvatarGridIdx(prev);
          setFormData((d) => ({ ...d, avatar: AVATARS[prev] }));
          avatarBtnRefs.current[prev]?.focus();
        } else {
          focusFormField(0);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        focusFormField(2);
      }
      return;
    }

    if (e.key === "ArrowDown") { e.preventDefault(); focusFormField(formField + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusFormField(formField - 1); }
    else if (e.key === "Enter" && formField === 2) { e.preventDefault(); handleSave(); }
    else if (e.key === "Enter" && formField === 3) { e.preventDefault(); resetForm(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formField, avatarGridIdx, focusFormField, handleSave]);

  return (
    <div
      className="tv-users-overlay"
      onKeyDown={view === "list" ? handleListKey : handleFormKey}
    >
      <div className="tv-users-modal" role="dialog" aria-modal="true" aria-label="Profiles">

        <div className="tv-users-header">
          <span className="tv-users-title">👤 Profiles</span>
          <div className="tv-users-header-actions">
            {view === "list" && (
              <button
                ref={addRef}
                type="button"
                className="tv-users-btn tv-users-btn-add"
                tabIndex={-1}
                onFocus={() => { setListArea("top"); setListTopCol(1); }}
                onClick={openAdd}
                disabled={loading}
              >
                + Add Profile
              </button>
            )}
            <button
              ref={closeRef}
              type="button"
              className="tv-users-btn tv-users-btn-close"
              tabIndex={-1}
              onFocus={() => { setListArea("top"); setListTopCol(0); }}
              onClick={onClose}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {error && <div className="tv-users-error">{error}</div>}
        {loading && <div className="tv-users-status">Working…</div>}

        {view === "list" && (
          <div className="tv-users-list">
            {appProfiles.length === 0 ? (
              <div className="tv-users-empty">No profiles yet — press &quot;Add Profile&quot; to create one.</div>
            ) : (
              appProfiles.map((p, row) => (
                <div
                  key={p.id}
                  className={`tv-users-card${activeProfileId === p.id ? " active" : ""}`}
                >
                  <div className="tv-users-card-info">
                    <span className="tv-profile-inline-avatar">{p.avatar}</span>
                    <div>
                      <span className="tv-users-card-name">{p.name}</span>
                      {activeProfileId === p.id && (
                        <span className="tv-users-active-badge"> ✓ Active</span>
                      )}
                      {deleteConfirmId === p.id && (
                        <span className="tv-users-confirm-text"> Press Delete again to confirm</span>
                      )}
                    </div>
                  </div>
                  <div className="tv-users-card-actions">
                    {["Switch", "Edit", "Delete"].map((label, col) => (
                      <button
                        key={label}
                        ref={(el) => {
                          if (!rowRefs.current[row]) rowRefs.current[row] = [];
                          rowRefs.current[row][col] = el;
                        }}
                        type="button"
                        tabIndex={-1}
                        className={`tv-users-btn tv-users-btn-${
                          label === "Switch" ? "connect" : label.toLowerCase()
                        }${deleteConfirmId === p.id && label === "Delete" ? " confirm" : ""}`}
                        onFocus={() => { setListArea("list"); setListRow(row); setListCol(col); }}
                        onClick={() => {
                          if (col === 0) { switchProfile(p.id); onClose(); }
                          else if (col === 1) openEdit(p);
                          else handleDelete(p.id);
                        }}
                        disabled={loading}
                      >
                        {label === "Delete" && deleteConfirmId === p.id ? "Confirm?" : label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {view === "form" && (
          <div className="tv-users-form">
            <h2 className="tv-users-form-title">
              {editingId ? "Edit Profile" : "New Profile"}
            </h2>

            <div className="tv-users-field">
              <label className="tv-users-label" htmlFor="tv-profile-name">Name *</label>
              <input
                id="tv-profile-name"
                ref={nameRef}
                type="text"
                className="tv-input"
                value={formData.name}
                placeholder="e.g. Dad, Kids…"
                onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                onFocus={() => setFormField(0)}
                disabled={loading}
              />
            </div>

            <div className="tv-users-field">
              <span className="tv-users-label">Avatar</span>
              <div className="tv-avatar-grid">
                {AVATARS.map((emoji, i) => (
                  <button
                    key={emoji}
                    ref={(el) => (avatarBtnRefs.current[i] = el)}
                    type="button"
                    className={`tv-avatar-btn${formData.avatar === emoji ? " selected" : ""}`}
                    tabIndex={-1}
                    onFocus={() => { setFormField(1); setAvatarGridIdx(i); }}
                    onClick={() => {
                      setFormData((d) => ({ ...d, avatar: emoji }));
                      setAvatarGridIdx(i);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="tv-users-form-actions">
              <button
                ref={saveRef}
                type="button"
                className="tv-users-btn tv-users-btn-save"
                tabIndex={-1}
                onFocus={() => setFormField(2)}
                onClick={handleSave}
                disabled={loading || !formData.name.trim()}
              >
                {loading ? "Saving…" : editingId ? "Save Changes" : "Create Profile"}
              </button>
              <button
                ref={cancelRef}
                type="button"
                className="tv-users-btn tv-users-btn-cancel"
                tabIndex={-1}
                onFocus={() => setFormField(3)}
                onClick={resetForm}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
            <p className="tv-users-form-hints">↑↓ navigate · ←→ in avatar grid · Esc to cancel</p>
          </div>
        )}

        <p className="tv-users-hints">↑↓ navigate · ←→ switch actions · Esc to close</p>
      </div>
    </div>
  );
};

TVProfilesModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default TVProfilesModal;
