import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "@/ui/popup/App";
import "@/ui/styles/popup/popup.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Popup root not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);
