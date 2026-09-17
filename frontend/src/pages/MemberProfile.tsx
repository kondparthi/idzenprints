import { useMemberAuth } from "@/auth/MemberAuthContext";
import "./MemberDashboard.css";

export default function MemberProfile() {
  const { member } = useMemberAuth();
  if (!member) return null;

  return (
    <div>
      <h1>Profile</h1>

      <div className="card-panel" style={{ maxWidth: 480 }}>
        <dl className="extracted-details-list">
          <div className="extracted-details-row">
            <dt>Full name</dt>
            <dd>{member.full_name}</dd>
          </div>
          <div className="extracted-details-row">
            <dt>User ID</dt>
            <dd>{member.login_id}</dd>
          </div>
          <div className="extracted-details-row">
            <dt>Phone</dt>
            <dd>{member.phone}</dd>
          </div>
          <div className="extracted-details-row">
            <dt>Email</dt>
            <dd>{member.email}</dd>
          </div>
          <div className="extracted-details-row">
            <dt>Member type</dt>
            <dd>{member.member_type.name}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
