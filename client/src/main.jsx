import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import App from "./App.jsx";
import "./index.css";

// Point axios at the Railway backend in production, proxy handles it in dev
if (import.meta.env.VITE_SERVER_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
