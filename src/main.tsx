// main.tsx - Temporarily disable StrictMode to prevent double-mount issues
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/auth.css";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  // ⚠️ StrictMode causes double-mounting which can interfere with auth
  // Temporarily disabled - re-enable after testing
  // <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  // </React.StrictMode>
);