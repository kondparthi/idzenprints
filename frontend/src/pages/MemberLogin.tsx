import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMemberAuth } from "@/auth/MemberAuthContext";
import "./Register.css";
import idzenLogo from "@/assets/brand/idzen-logo.png";

export default function MemberLogin() {
  const { login } = useMemberAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(loginId, password);
      navigate("/member/dashboard", { replace: true });
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError(err.response.data?.detail || "Device limit reached. Log out from another device before continuing.");
      } else {
        setError("Incorrect User ID or password.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="register-page">
      <form className="register-card" onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <div className="register-header">
          <img src={idzenLogo} alt="IDZEN" className="register-logo-mark" />
          <h1>Member login</h1>
          <p>Sign in to your subscription account.</p>
        </div>

        <div className="field">
          <label htmlFor="loginId">User ID</label>
          <input id="loginId" value={loginId} onChange={(e) => setLoginId(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary register-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="register-login-link">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
