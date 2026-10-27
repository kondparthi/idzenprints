import QuickCard from "./QuickCard";
import { memberQuickApi } from "@/api/quickCardApi";

export default function MemberAadhaarPvc() {
  return <QuickCard api={memberQuickApi} />;
}
