import React from "react";
import { createRoot } from "react-dom/client";

import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import App from "./App";
import { HouseGate } from "./HouseGate";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <HouseGate><App /></HouseGate>
  </React.StrictMode>,
);
