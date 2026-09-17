import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { updateProfile } from "@/api/auth";
import "./Profile.css";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const updated = await updateProfile(name, email);
      setUser(updated);
      setSuccessMessage("Profile updated.");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError("That email is already in use by another account.");
      } else {
        setError("Could not update your profile. Try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="profile-page">
      <h1>Profile</h1>
      <p className="dashboard-subtitle">Manage your account details.</p>

      <div className="card-panel profile-card">
        <div className="profile-header">
          <span className="avatar avatar-lg">{initials}</span>
          <div>
            <div className="profile-header-name">{user?.name}</div>
            <span className="badge badge-accent">{user?.role.replace("_", " ")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          {error && <p className="error-text">{error}</p>}
          {successMessage && <p className="success-text">{successMessage}</p>}

          <div className="profile-actions">
            <Link to="/change-password" className="btn btn-secondary">
              Change password
            </Link>
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
