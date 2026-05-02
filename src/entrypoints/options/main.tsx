import React from "react";
import { createRoot } from "react-dom/client";
import { OptionsApp } from "@/ui/options/App";
import "@/ui/styles/options/options-base.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Options root not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>,
);
