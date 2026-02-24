import React, { useState } from "react";
import { IonPage, IonContent, IonSpinner, IonIcon } from "@ionic/react";
import {
  musicalNotesOutline,
  personOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  arrowForwardOutline,
  chevronBackOutline,
} from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

const Register: React.FC = () => {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const history = useHistory();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!displayName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (displayName.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await register(email, password, displayName);
      history.push("/home");
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak");
      } else {
        setError("Failed to create account. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage className="auth-page">
      <IonContent fullscreen scrollY className="auth-content">
        {/* Background glow orbs */}
        <div className="auth-glow auth-glow--1" />
        <div className="auth-glow auth-glow--2" />

        <div className="auth-container">
          {/* ── Back button ── */}
          <div className="auth-back-row">
            <button
              className="auth-back-btn"
              onClick={() => history.push("/login")}
              disabled={loading}
            >
              <IonIcon icon={chevronBackOutline} />
              <span>Back to Sign In</span>
            </button>
          </div>

          {/* ── Hero ── */}
          <div className="auth-hero">
            <div className="auth-icon-wrap">
              <IonIcon icon={musicalNotesOutline} className="auth-main-icon" />
            </div>
            <h1 className="auth-app-name">Create Account</h1>
            <p className="auth-tagline">Join GNCFMusicTeam for free</p>
          </div>

          {/* ── Card ── */}
          <div className="auth-card">
            {error && (
              <div className="auth-error">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="auth-form">
              {/* Name */}
              <div className="auth-field">
                <label className="auth-field-label">DISPLAY NAME</label>
                <div className="auth-field-wrap">
                  <IonIcon icon={personOutline} className="auth-field-icon" />
                  <input
                    className="auth-field-input"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={loading}
                    autoComplete="name"
                  />
                </div>
              </div>

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
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div className="auth-field">
                <label className="auth-field-label">CONFIRM PASSWORD</label>
                <div className="auth-field-wrap">
                  <IonIcon
                    icon={lockClosedOutline}
                    className="auth-field-icon"
                  />
                  <input
                    className="auth-field-input"
                    type={showCpw ? "text" : "password"}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowCpw((v) => !v)}
                    tabIndex={-1}
                  >
                    <IonIcon icon={showCpw ? eyeOffOutline : eyeOutline} />
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 8 }} />

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
                    <span>Create Account</span>
                    <IonIcon icon={arrowForwardOutline} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="auth-divider">
              <span>Already have an account?</span>
            </div>

            <button
              className="auth-register-btn"
              onClick={() => history.push("/login")}
              disabled={loading}
            >
              Sign In
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;
