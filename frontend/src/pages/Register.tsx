import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerMember } from "@/api/memberAuth";
import { setMemberToken } from "@/api/memberClient";
import { useMemberAuth } from "@/auth/MemberAuthContext";
import "./Register.css";
import idzenLogo from "@/assets/brand/idzen-logo.png";

export default function Register() {
  const navigate = useNavigate();
  const { setMember } = useMemberAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!agreeTerms || !agreePrivacy) {
      setError("You must agree to the Terms & Conditions and Privacy Policy.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerMember({
        full_name: fullName,
        phone,
        email,
        login_id: loginId,
        password,
        agree_terms: agreeTerms,
        agree_privacy: agreePrivacy,
      });
      setMemberToken(result.access_token);
      setMember(result.member);
      setRegisteredName(result.member.full_name);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = Array.isArray(detail) ? detail[0]?.msg : detail;
      setError(message || "Registration failed. Check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (registeredName) {
    return (
      <div className="register-page">
        <div className="register-success-card">
          <span className="register-success-icon">✓</span>
          <h1>Welcome, {registeredName}</h1>
          <p>Your account has been created — you're all set to start using IDZEN Prints.</p>
          <button className="btn btn-primary" onClick={() => navigate("/member/dashboard")}>
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <form className="register-card" onSubmit={handleSubmit}>
        <div className="register-header">
          <img src={idzenLogo} alt="IDZEN" className="register-logo-mark" />
          <h1>Create your account</h1>
          <p>Registration is free — start generating PVC cards right away.</p>
        </div>

        <h2 className="register-section-heading">Personal information</h2>
        <div className="field-row">
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="9876543210" />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="email">Email ID</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="loginId">User ID</label>
            <input id="loginId" value={loginId} onChange={(e) => setLoginId(e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <h2 className="register-section-heading">Terms</h2>
        <label className="register-checkbox">
          <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
          I agree to the Terms &amp; Conditions
        </label>
        <label className="register-checkbox">
          <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
          I agree to the Privacy Policy
        </label>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary register-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registering…" : "Register Now"}
        </button>

        <p className="register-login-link">
          Already have an account? <Link to="/member/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
