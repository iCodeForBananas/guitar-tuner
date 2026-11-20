import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import TunerApp from "./TunerApp";
import { initPwa } from "./pwa";

initPwa();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TunerApp />
  </StrictMode>,
);
