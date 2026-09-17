import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import idzenIcon from "@/assets/brand/idzen-icon.png";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Email or password is incorrect.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-brand-panel">
        <div className="login-brand-top">
          <span className="login-logo">
            <span className="login-logo-mark" aria-hidden="true">
              <img src={idzenIcon} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </span>
            IDZEN
          </span>
        </div>

        <div className="login-brand-deck" aria-hidden="true">
          <div className="login-card login-card-1">
            <div className="login-card-row"><span className="login-card-chip"></span></div>
            <div className="login-card-lines"><span></span><span></span></div>
          </div>
          <div className="login-card login-card-2">
            <div className="login-card-row"><span className="login-card-photo"></span></div>
            <div className="login-card-lines"><span></span><span></span></div>
          </div>
        </div>

        <div className="login-brand-bottom">
          <h2>Operator console</h2>
          <p>Upload, verify, design, and generate print-ready PVC cards — all from one place.</p>
        </div>
      </div>

      <div className="login-form-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <h1>Welcome back</h1>
          <p className="login-subtitle">Sign in to the IDZEN operator console.</p>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@idzen.com"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="btn btn-primary login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
