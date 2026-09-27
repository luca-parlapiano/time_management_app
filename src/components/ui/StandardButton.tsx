import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface StandardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Pulsante testuale standard con una variante semantica del tema. */
export function StandardButton({ variant = "secondary", className, ...props }: StandardButtonProps) {
  const classes = [`${variant}-button`, className].filter(Boolean).join(" ");
  return <button {...props} className={classes} />;
}
