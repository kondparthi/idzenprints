import { memberPrintCardsApi } from "@/api/memberPrint";
import MemberPrintGate from "./MemberPrintGate";
import PrintCards from "./PrintCards";

export default function MemberPrintCards() {
  return (
    <MemberPrintGate>
      {(creditCost) => <PrintCards api={memberPrintCardsApi} creditCost={creditCost} />}
    </MemberPrintGate>
  );
}
