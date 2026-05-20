import { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

const FIELDS = ["nickname", "host", "username", "password"];

const TVUsersModal = ({ onClose }) => {
  const { users, activeUserId, setActiveUserId, saveUsers, addUser, updateUser, removeUser, setChannels } =
    useApp();

  const [view, setView] = useState("list"); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formData, setFormData] = useState({ nickname: "", host: "", username: "", password: "" });

  // list-view focus: area='top' (close/add), area='list' row+col
  const [listArea, setListArea] = useState("top");
  const [listTopCol, setListTopCol] = useState(0); // 0=close, 1=add
  const [listRow, setListRow] = useState(0);
  const [listCol, setListCol] = useState(0); // 0=connect, 1=edit, 2=delete
  const [formField, setFormField] = useState(0); // 0-3 fields, 4=cancel, 5=save

  const closeRef = useRef(null);
  const addRef = useRef(null);
  const listRowRefs = useRef([]); // [row][col]
  const formFieldRefs = useRef([]);

  // Focus on mount
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Sync listRowRefs size
  useEffect(() => {
    listRowRefs.current = listRowRefs.current.slice(0, users.length);
  }, [users.length]);

  const focusListTop = useCallback((col = 0) => {
    setListArea("top");
    setListTopCol(col);
    if (col === 0) closeRef.current?.focus();
    else addRef.current?.focus();
  }, []);

  const focusListRow = useCallback((row, col = 0) => {
    const clampedRow = Math.max(0, Math.min(row, users.length - 1));
    setListArea("list");
    setListRow(clampedRow);
    setListCol(col);
    listRowRefs.current[clampedRow]?.[col]?.focus();
  }, [users.length]);

  const focusFormField = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(idx, 5));
    setFormField(clamped);
    formFieldRefs.current[clamped]?.focus();
  }, []);

  const resetForm = () => {
    setFormData({ nickname: "", host: "", username: "", password: "" });
    setEditingId(null);
    setError(null);
    setView("list");
    setTimeout(() => focusListTop(1), 0);
  };

  const openAdd = () => {
    setFormData({ nickname: "", host: "", username: "", password: "" });
    setEditingId(null);
    setError(null);
    setView("form");
    setTimeout(() => focusFormField(0), 0);
  };

  const openEdit = (user) => {
    setFormData({ nickname: user.nickname || "", host: user.host, username: user.username, password: user.password });
    setEditingId(user.id);
    setError(null);
    setView("form");
    setTimeout(() => focusFormField(0), 0);
  };

  const handleSave = async () => {
    if (!formData.host || !formData.username || !formData.password) {
      setError("Host, username and password are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (editingId) {
        await updateUser(editingId, formData);
      } else {
        await addUser(formData);
      }
      resetForm();
    } catch (err) {
      setError(err?.message || "Failed to save account.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      setActiveUserId(userId);
      saveUsers();
      iptvApi.setCredentials(user.host, user.username, user.password);
      const channelsData = await iptvApi.getLiveStreams();
      const formatted = channelsData.map((ch) => ({
        name: ch.name,
        url: iptvApi.buildStreamUrl("live", ch.stream_id, "m3u8"),
        id: ch.stream_id,
        stream_id: ch.stream_id,
        logo: ch.stream_icon || null,
      }));
      setChannels(formatted);
      setSuccessMsg(`Connected to ${user.nickname || user.username} — ${formatted.length} channels loaded.`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err?.message || "Failed to connect. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (deleteConfirmId !== userId) {
      setDeleteConfirmId(userId);
      return;
    }
    setLoading(true);
    setDeleteConfirmId(null);
    try {
      await removeUser(userId);
      if (users.length <= 1) {
        focusListTop(1);
      } else {
        focusListRow(Math.max(0, listRow - 1));
      }
    } catch (err) {
      setError(err?.message || "Failed to delete account.");
    } finally {
      setLoading(false);
    }
  };

  const handleListKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (deleteConfirmId) {
          setDeleteConfirmId(null);
          return;
        }
        onClose();
        return;
      }

      if (listArea === "top") {
        switch (e.key) {
          case "ArrowRight":
            e.preventDefault();
            focusListTop(1);
            break;
          case "ArrowLeft":
            e.preventDefault();
            focusListTop(0);
            break;
          case "ArrowDown":
            e.preventDefault();
            if (users.length > 0) focusListRow(0, 0);
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

      // area === 'list'
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (listRow < users.length - 1) focusListRow(listRow + 1, listCol);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (listRow > 0) focusListRow(listRow - 1, listCol);
          else focusListTop(listTopCol);
          break;
        case "ArrowRight":
          e.preventDefault();
          focusListRow(listRow, Math.min(listCol + 1, 2));
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (listCol > 0) focusListRow(listRow, listCol - 1);
          else focusListTop(0);
          break;
        case "Enter": {
          e.preventDefault();
          const user = users[listRow];
          if (!user) break;
          if (listCol === 0) handleConnect(user.id);
          else if (listCol === 1) openEdit(user);
          else handleDelete(user.id);
          break;
        }
        default:
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listArea, listTopCol, listRow, listCol, users, deleteConfirmId, onClose]
  );

  const handleFormKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        resetForm();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusFormField(formField + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusFormField(formField - 1);
      } else if (e.key === "Enter" && formField >= 4) {
        e.preventDefault();
        if (formField === 4) resetForm();
        else handleSave();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formField]
  );

  return (
    <div className="tv-users-overlay" onKeyDown={view === "list" ? handleListKeyDown : handleFormKeyDown}>
      <div className="tv-users-modal" role="dialog" aria-modal="true" aria-label="IPTV Accounts">

        {/* Header */}
        <div className="tv-users-header">
          <span className="tv-users-title">📡 IPTV Accounts</span>
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
                + Add Account
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

        {/* Status messages */}
        {error && <div className="tv-users-error">{error}</div>}
        {successMsg && <div className="tv-users-success">{successMsg}</div>}
        {loading && <div className="tv-users-status">Working…</div>}

        {/* List view */}
        {view === "list" && (
          <div className="tv-users-list">
            {users.length === 0 ? (
              <div className="tv-users-empty">No accounts yet — press &quot;Add Account&quot; to get started.</div>
            ) : (
              users.map((user, row) => (
                <div
                  key={user.id}
                  className={`tv-users-card${activeUserId === user.id ? " active" : ""}`}
                >
                  <div className="tv-users-card-info">
                    <span className="tv-users-card-name">
                      {user.nickname || `${user.username}@${user.host}`}
                    </span>
                    <span className="tv-users-card-host">{user.host}</span>
                    {activeUserId === user.id && <span className="tv-users-active-badge">✓ Active</span>}
                    {deleteConfirmId === user.id && (
                      <span className="tv-users-confirm-text">Press Delete again to confirm removal</span>
                    )}
                  </div>
                  <div className="tv-users-card-actions">
                    {["Connect", "Edit", "Delete"].map((label, col) => (
                      <button
                        key={label}
                        ref={(el) => {
                          if (!listRowRefs.current[row]) listRowRefs.current[row] = [];
                          listRowRefs.current[row][col] = el;
                        }}
                        type="button"
                        tabIndex={-1}
                        className={`tv-users-btn tv-users-btn-${label.toLowerCase()}${
                          deleteConfirmId === user.id && label === "Delete" ? " confirm" : ""
                        }`}
                        onFocus={() => { setListArea("list"); setListRow(row); setListCol(col); }}
                        onClick={() => {
                          if (col === 0) handleConnect(user.id);
                          else if (col === 1) openEdit(user);
                          else handleDelete(user.id);
                        }}
                        disabled={loading}
                      >
                        {label === "Delete" && deleteConfirmId === user.id ? "Confirm?" : label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Form view */}
        {view === "form" && (
          <div className="tv-users-form">
            <h2 className="tv-users-form-title">{editingId ? "Edit Account" : "Add New Account"}</h2>
            {FIELDS.map((field, idx) => (
              <div key={field} className="tv-users-field">
                <label className="tv-users-label" htmlFor={`tv-field-${field}`}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  {field !== "nickname" && " *"}
                </label>
                <input
                  id={`tv-field-${field}`}
                  ref={(el) => (formFieldRefs.current[idx] = el)}
                  type={field === "password" ? "password" : "text"}
                  className="tv-input"
                  value={formData[field]}
                  placeholder={
                    field === "nickname" ? "e.g. My IPTV (optional)" :
                    field === "host" ? "s1.example.com:8080" :
                    field === "username" ? "Your username" : "Your password"
                  }
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  onFocus={() => setFormField(idx)}
                  disabled={loading}
                />
              </div>
            ))}
            <div className="tv-users-form-actions">
              <button
                ref={(el) => (formFieldRefs.current[4] = el)}
                type="button"
                className="tv-users-btn tv-users-btn-cancel"
                tabIndex={-1}
                onFocus={() => setFormField(4)}
                onClick={resetForm}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                ref={(el) => (formFieldRefs.current[5] = el)}
                type="button"
                className="tv-users-btn tv-users-btn-save"
                tabIndex={-1}
                onFocus={() => setFormField(5)}
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "Saving…" : "Save"}
              </button>
            </div>
            <p className="tv-users-form-hints">↑↓ navigate fields · Enter to save · Esc to cancel</p>
          </div>
        )}

        <p className="tv-users-hints">↑↓ navigate · ←→ switch actions · Esc to close</p>
      </div>
    </div>
  );
};

TVUsersModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default TVUsersModal;
