import { memberPrintBucketApi } from "@/api/memberPrint";
import MemberPrintGate from "./MemberPrintGate";
import PrintBucket from "./PrintBucket";

export default function MemberPrintBucket() {
  return (
    <MemberPrintGate>
      {(creditCost) => (
        <PrintBucket api={memberPrintBucketApi} creditCost={creditCost} generatePath="/member/cards/aadhaar-pvc" />
      )}
    </MemberPrintGate>
  );
}
