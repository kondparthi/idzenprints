import { DYNAMIC_VARIABLES } from "./types";

interface VariablePickerProps {
  onInsert: (token: string) => void;
}

export default function VariablePicker({ onInsert }: VariablePickerProps) {
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
        {DYNAMIC_VARIABLES.map((token) => (
          <option key={token} value={token}>
            {token}
          </option>
        ))}
      </select>
    </div>
  );
}
