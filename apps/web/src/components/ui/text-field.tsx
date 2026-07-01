import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function TextField({ className, label, ...props }: TextFieldProps) {
  if (!label) return <input className={cn("ui-field", className)} {...props} />;

  return (
    <label className="ui-field-label">
      <span>{label}</span>
      <input className={cn("ui-field", className)} {...props} />
    </label>
  );
}
