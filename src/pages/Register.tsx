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
  IonButtons,
  IonBackButton,
} from "@ionic/react";
import {
  personAddOutline,
  mailOutline,
  lockClosedOutline,
  personOutline,
} from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

const Register: React.FC = () => {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const history = useHistory();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
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
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/login" text="" />
          </IonButtons>
          <IonTitle>Create Account</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="auth-container">
          <div className="auth-logo">
            <IonIcon icon={personAddOutline} />
            <h1>Join ChordShift</h1>
            <p>Create your free account</p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            {error && (
              <div className="auth-error">
                <IonText color="danger">{error}</IonText>
              </div>
            )}

            <IonItem className="auth-input">
              <IonIcon icon={personOutline} slot="start" />
              <IonInput
                id="register-name"
                type="text"
                placeholder="Display Name"
                value={displayName}
                onIonInput={(e) => setDisplayName(e.detail.value || "")}
                disabled={loading}
              />
            </IonItem>

            <IonItem className="auth-input">
              <IonIcon icon={mailOutline} slot="start" />
              <IonInput
                id="register-email"
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
                id="register-password"
                type="password"
                placeholder="Password"
                value={password}
                onIonInput={(e) => setPassword(e.detail.value || "")}
                disabled={loading}
              />
            </IonItem>

            <IonItem className="auth-input">
              <IonIcon icon={lockClosedOutline} slot="start" />
              <IonInput
                id="register-confirm-password"
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onIonInput={(e) => setConfirmPassword(e.detail.value || "")}
                disabled={loading}
              />
            </IonItem>

            <IonButton
              expand="block"
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? <IonSpinner name="crescent" /> : "Create Account"}
            </IonButton>

            <div className="auth-divider">
              <span>Already have an account?</span>
            </div>

            <IonButton
              expand="block"
              fill="outline"
              routerLink="/login"
              className="auth-button-secondary"
            >
              Login
            </IonButton>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;
