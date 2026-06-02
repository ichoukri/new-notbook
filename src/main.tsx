import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { env } from "@/config/env";
import "./global.css";
import Router from "./pages/router";

if (env.VITE_NODE_ENV === "development" && env.VITE_ENABLE_REACT_SCAN) {
  void import("react-scan").then(({ scan }) => {
    scan({ enabled: true });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
