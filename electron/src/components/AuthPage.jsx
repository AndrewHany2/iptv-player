import { useState } from "react";
import { useApp } from "../context/AppContext";

const AuthPage = () => {
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // optional, register only
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    if (mode === "register" && !/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
      setError(
        "Username must be 3–30 characters: letters, numbers, underscores only.",
      );
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
        // signUp now upserts the profile when email confirmation is disabled.
        // onAuthStateChange in AppContext will fire automatically if a session
        // was returned. We also call signIn to ensure the session is set.
        await signIn(email.trim(), password);
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("rate limit")) {
        setError(
          "Too many sign-up attempts. Please wait a few minutes and try again.",
        );
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        setError(
          "Please check your email and confirm your account before signing in.",
        );
      } else if (
        msg.toLowerCase().includes("invalid login credentials") ||
        msg.toLowerCase().includes("invalid email or password")
      ) {
        setError("Invalid username/email or password.");
      } else if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already been registered")
      ) {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">📺</div>
        <h1 className="auth-title">IPTV Player</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Sign in to your account" : "Create an account"}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="auth-username">
              {mode === "login" ? "Username or Email" : "Username"}
            </label>
            <input
              id="auth-username"
              type="text"
              className="input-field"
              placeholder={
                mode === "login"
                  ? "your_username or you@example.com"
                  : "your_username"
              }
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading}
              autoFocus
            />
          </div>

          {mode === "register" && (
            <div className="auth-field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              disabled={loading}
            />
          </div>

          {mode === "register" && (
            <div className="auth-field">
              <label htmlFor="auth-confirm">Confirm Password</label>
              <input
                id="auth-confirm"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === "login" ? (
            <>
              <span>Don&apos;t have an account?</span>
              <button
                type="button"
                className="auth-link"
                onClick={() => switchMode("register")}
              >
                Register
              </button>
            </>
          ) : (
            <>
              <span>Already have an account?</span>
              <button
                type="button"
                className="auth-link"
                onClick={() => switchMode("login")}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
