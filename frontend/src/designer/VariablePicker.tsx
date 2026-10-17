import { DYNAMIC_VARIABLES, variablesForCardType } from "./types";

interface VariablePickerProps {
  onInsert: (token: string) => void;
  /** The template's card type name (e.g. "FSC / Ration Card") — narrows
   * the list to the fields that actually apply. Omit to show everything. */
  cardTypeName?: string | null;
}

export default function VariablePicker({ onInsert, cardTypeName }: VariablePickerProps) {
  const tokens = cardTypeName ? variablesForCardType(cardTypeName) : DYNAMIC_VARIABLES;
  return (
    <div className="variable-picker">
      <label>Insert variable</label>
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onInsert(e.target.value);
          e.target.value = "";
        }}
      >
        <option value="">Choose a field…</option>
        {tokens.map((token) => (
          <option key={token} value={token}>
            {token}
          </option>
        ))}
      </select>
    </div>
  );
}
