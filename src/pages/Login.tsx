import React, { useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  IonIcon,
  IonToast,
} from "@ionic/react";
import { logInOutline, mailOutline, lockClosedOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="auth-container">
          <div className="auth-logo">
            <IonIcon icon={logInOutline} />
            <h1>GNCFMusicTeam</h1>
            <p>Sign in to continue</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            {error && (
              <div className="auth-error">
                <IonText color="danger">{error}</IonText>
              </div>
            )}

            <IonItem className="auth-input">
              <IonIcon icon={mailOutline} slot="start" />
              <IonInput
                id="login-email"
                type="email"
                placeholder="Email"
                value={email}
                onIonInput={(e) => setEmail(e.detail.value || "")}
                disabled={loading}
              />
            </IonItem>

            <IonItem className="auth-input">
              <IonIcon icon={lockClosedOutline} slot="start" />
              <IonInput
                id="login-password"
                type="password"
                placeholder="Password"
                value={password}
                onIonInput={(e) => setPassword(e.detail.value || "")}
                disabled={loading}
              />
            </IonItem>

            <IonButton
              expand="block"
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? <IonSpinner name="crescent" /> : "Login"}
            </IonButton>

            <div className="auth-link">
              <IonButton
                fill="clear"
                size="small"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot Password?
              </IonButton>
            </div>

            <div className="auth-divider">
              <span>Don't have an account?</span>
            </div>

            <IonButton
              expand="block"
              fill="outline"
              routerLink="/register"
              className="auth-button-secondary"
            >
              Create Account
            </IonButton>
          </form>
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
