import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "@iptv/shared/src/tamagui.config.js";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TamaguiProvider config={tamaguiConfig}>
      <App />
    </TamaguiProvider>
  </StrictMode>
);
