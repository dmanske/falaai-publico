import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OnboardingApp } from "@/features/onboarding";
import "./estilos.css";

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <OnboardingApp />
  </StrictMode>,
);
