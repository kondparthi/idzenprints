import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { MemberAuthProvider } from "./auth/MemberAuthContext";
import { CartProvider } from "./cart/CartContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MemberAuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </MemberAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
