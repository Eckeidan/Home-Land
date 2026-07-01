import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return <span className={cn("ui-badge", `ui-badge-${tone}`, className)} {...props} />;
}
