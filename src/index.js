import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./components/App";
import { WalletProvider } from "./utils/context";
import { HashRouter as Router } from "react-router-dom";

ReactDOM.render(
  <WalletProvider>
    <Router>
      <App />
    </Router>
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
