import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getPrintAccess } from "@/api/memberPrint";

/**
 * Print bucket and Print cards are for members with an active
 * subscription. This asks the server (the real gate) and either renders
 * the screen or explains what's missing, with a link to My Subscription.
 */
export default function MemberPrintGate({ children }: { children: (creditCost: number) => ReactNode }) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ok"; creditCost: number } | { status: "denied"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    getPrintAccess()
      .then((access) => setState({ status: "ok", creditCost: access.credit_cost }))
      .catch((err) =>
        setState({
          status: "denied",
          message:
            err instanceof Error && err.name === "ApiMessageError"
              ? err.message
              : "Couldn't check your subscription. Try again in a moment.",
        })
      );
  }, []);

  if (state.status === "loading") return <p className="field-hint">Loading…</p>;
  if (state.status === "denied") {
    return (
      <div className="card-panel" style={{ maxWidth: 520 }}>
        <h2 style={{ marginTop: 0 }}>Active subscription needed</h2>
        <p className="field-hint">{state.message}</p>
        <p className="field-hint">Print bucket and Print cards are available to members with an active subscription.</p>
        <Link to="/member/subscription" className="btn btn-primary">
          Go to My Subscription
        </Link>
      </div>
    );
  }
  return <>{children(state.creditCost)}</>;
}
