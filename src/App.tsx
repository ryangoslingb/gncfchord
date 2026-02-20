import { Redirect, Route } from "react-router-dom";
import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Home from "./pages/Home";
import SongEditor from "./pages/SongEditor";
import SongView from "./pages/SongView";
import SetListHome from "./pages/SetListHome";
import SetListEditor from "./pages/SetListEditor";
import SetListView from "./pages/SetListView";
import SetListPlay from "./pages/SetListPlay";
import Login from "./pages/Login";
import Register from "./pages/Register";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import "@ionic/react/css/palettes/dark.system.css";

/* Theme variables */
import "./theme/variables.css";

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* Public Routes */}
          <Route exact path="/login">
            <Login />
          </Route>
          <Route exact path="/register">
            <Register />
          </Route>

          {/* Protected Routes */}
          <PrivateRoute exact path="/home">
            <Home />
          </PrivateRoute>
          <PrivateRoute exact path="/editor/:id">
            <SongEditor />
          </PrivateRoute>
          <PrivateRoute exact path="/song/:id">
            <SongView />
          </PrivateRoute>
          <PrivateRoute exact path="/setlists">
            <SetListHome />
          </PrivateRoute>
          <PrivateRoute exact path="/setlist-editor/:id">
            <SetListEditor />
          </PrivateRoute>
          <PrivateRoute exact path="/setlist/:id">
            <SetListView />
          </PrivateRoute>
          <PrivateRoute exact path="/setlist-play/:id/:songIndex?">
            <SetListPlay />
          </PrivateRoute>

          {/* Default redirect */}
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;
