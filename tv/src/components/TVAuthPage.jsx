import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";

const FIELDS = ["username", "password"];
const FIELDS_REGISTER = ["username", "email", "password", "confirm"];

const TVAuthPage = () => {
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(0);

  const fieldRefs = useRef([]);
  const fields = mode === "login" ? FIELDS : FIELDS_REGISTER;

  useEffect(() => {
    fieldRefs.current[0]?.focus();
    setFocusedField(0);
  }, [mode]);

  const handleFieldKeyDown = (e, idx) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(idx + 1, fields.length); // +1 for submit button
      if (next < fields.length) {
        fieldRefs.current[next]?.focus();
        setFocusedField(next);
      } else {
        fieldRefs.current[fields.length]?.focus(); // submit button
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(idx - 1, 0);
      fieldRefs.current[prev]?.focus();
      setFocusedField(prev);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    if (mode === "register" && !/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
      setError("Username must be 3–30 characters: letters, numbers, underscores only.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "register" && !email.trim()) {
      setError("Email is required.");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(username.trim(), password);
      } else {
        await signUp(username.trim(), password, email.trim());
        await signIn(email.trim(), password);
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("rate limit")) {
        setError("Too many attempts. Please wait a few minutes.");
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        setError("Please confirm your email before signing in.");
      } else if (msg.toLowerCase().includes("invalid login credentials") || msg.toLowerCase().includes("invalid email or password")) {
        setError("Invalid username/email or password.");
      } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
        setError("This email is already registered. Please sign in.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tv-auth">
      <div className="tv-auth-card">
        <div className="tv-auth-logo">📺</div>
        <h1 className="tv-auth-title">IPTV Player</h1>
        <p className="tv-auth-subtitle">
          {mode === "login" ? "Sign in to your account" : "Create an account"}
        </p>

        <form className="tv-auth-form" onSubmit={handleSubmit}>
          <div className="tv-auth-field">
            <label>{mode === "login" ? "Username or Email" : "Username"}</label>
            <input
              ref={(el) => (fieldRefs.current[0] = el)}
              type="text"
              className="tv-input"
              placeholder={mode === "login" ? "username or email" : "username"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => handleFieldKeyDown(e, 0)}
              disabled={loading}
            />
          </div>

          {mode === "register" && (
            <div className="tv-auth-field">
              <label>Email</label>
              <input
                ref={(el) => (fieldRefs.current[1] = el)}
                type="email"
                className="tv-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => handleFieldKeyDown(e, 1)}
                disabled={loading}
              />
            </div>
          )}

          <div className="tv-auth-field">
            <label>Password</label>
            <input
              ref={(el) => (fieldRefs.current[mode === "register" ? 2 : 1] = el)}
              type="password"
              className="tv-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => handleFieldKeyDown(e, mode === "register" ? 2 : 1)}
              disabled={loading}
            />
          </div>

          {mode === "register" && (
            <div className="tv-auth-field">
              <label>Confirm Password</label>
              <input
                ref={(el) => (fieldRefs.current[3] = el)}
                type="password"
                className="tv-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => handleFieldKeyDown(e, 3)}
                disabled={loading}
              />
            </div>
          )}

          {error && <p className="tv-auth-error">{error}</p>}

          <button
            ref={(el) => (fieldRefs.current[fields.length] = el)}
            type="submit"
            className="tv-btn tv-btn-primary"
            disabled={loading}
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="tv-auth-toggle">
          {mode === "login" ? (
            <>
              <span>No account?</span>
              <button type="button" className="tv-auth-link" onClick={() => switchMode("register")}>
                Register
              </button>
            </>
          ) : (
            <>
              <span>Already have an account?</span>
              <button type="button" className="tv-auth-link" onClick={() => switchMode("login")}>
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TVAuthPage;
