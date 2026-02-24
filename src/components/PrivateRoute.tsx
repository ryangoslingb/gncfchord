import React, { useEffect } from "react";
import { Route, RouteProps, useHistory } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { IonSpinner } from "@ionic/react";

interface PrivateRouteProps extends RouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, ...rest }) => {
  const { currentUser, loading } = useAuth();
  const history = useHistory();

  // Imperatively navigate instead of declarative <Redirect> to avoid
  // Ionic lifecycle + React Router simultaneous state-update loops.
  useEffect(() => {
    if (!loading && !currentUser) {
      history.replace("/login");
    }
  }, [currentUser, loading, history]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "var(--c-bg, #0f0f1a)",
        }}
      >
        <IonSpinner name="crescent" color="primary" />
      </div>
    );
  }

  return <Route {...rest} render={() => (currentUser ? children : null)} />;
};

export default PrivateRoute;
