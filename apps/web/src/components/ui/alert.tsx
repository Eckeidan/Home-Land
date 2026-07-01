import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type AlertTone = "info" | "success" | "warning" | "danger";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
}

export function Alert({ className, tone = "info", ...props }: AlertProps) {
  return <div className={cn("ui-alert", `ui-alert-${tone}`, className)} role="alert" {...props} />;
}
