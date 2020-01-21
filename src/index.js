import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./components/App";
import { WalletProvider } from "./utils/context";

ReactDOM.render(
  <WalletProvider>
    <App />
  </WalletProvider>,
  document.getElementById("root")
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/serviceWorker.js").catch(() => null)
  );
}

if (module.hot) {
  module.hot.accept();
}
