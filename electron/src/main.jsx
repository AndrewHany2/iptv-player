import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "@iptv/shared/src/tamagui.config.js";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TamaguiProvider config={tamaguiConfig}>
      <App />
    </TamaguiProvider>
  </StrictMode>,
);
