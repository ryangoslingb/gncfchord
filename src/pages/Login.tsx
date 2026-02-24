import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonSpinner,
  IonIcon,
  IonToast,
} from "@ionic/react";
import {
  musicalNotesOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  arrowForwardOutline,
} from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const { login, resetPassword } = useAuth();
  const history = useHistory();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      history.push("/home");
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later");
      } else {
        setError("Failed to login. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setToastMessage("Password reset email sent! Check your inbox.");
      setShowToast(true);
    } catch (err: any) {
      console.error("Reset password error:", err);
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email");
      } else {
        setError("Failed to send reset email");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage className="auth-page">
      <IonContent fullscreen scrollY={false} className="auth-content">
        {/* Background glow orbs */}
        <div className="auth-glow auth-glow--1" />
        <div className="auth-glow auth-glow--2" />

        <div className="auth-container">
          {/* ── Hero ── */}
          <div className="auth-hero">
            <div className="auth-icon-wrap">
              <IonIcon icon={musicalNotesOutline} className="auth-main-icon" />
            </div>
            <h1 className="auth-app-name">GNCFMusicTeam</h1>
            <p className="auth-tagline">Sign in to your account</p>
          </div>

          {/* ── Card ── */}
          <div className="auth-card">
            {error && (
              <div className="auth-error">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="auth-form">
              {/* Email */}
              <div className="auth-field">
                <label className="auth-field-label">EMAIL</label>
                <div className="auth-field-wrap">
                  <IonIcon icon={mailOutline} className="auth-field-icon" />
                  <input
                    className="auth-field-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-field">
                <label className="auth-field-label">PASSWORD</label>
                <div className="auth-field-wrap">
                  <IonIcon
                    icon={lockClosedOutline}
                    className="auth-field-icon"
                  />
                  <input
                    className="auth-field-input"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowPw((v) => !v)}
                    tabIndex={-1}
                  >
                    <IonIcon icon={showPw ? eyeOffOutline : eyeOutline} />
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="auth-forgot-row">
                <button
                  type="button"
                  className="auth-forgot-btn"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <IonSpinner name="crescent" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <IonIcon icon={arrowForwardOutline} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="auth-divider">
              <span>New here?</span>
            </div>

            {/* Register link */}
            <button
              className="auth-register-btn"
              onClick={() => history.push("/register")}
              disabled={loading}
            >
              Create an Account
            </button>
          </div>
        </div>

        <IonToast
          isOpen={showToast}
          message={toastMessage}
          duration={3000}
          onDidDismiss={() => setShowToast(false)}
          color="success"
        />
      </IonContent>
    </IonPage>
  );
};

export default Login;
