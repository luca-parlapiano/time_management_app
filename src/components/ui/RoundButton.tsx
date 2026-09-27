import type { ButtonHTMLAttributes } from "react";
import { AppIcon, type AppIconName } from "../../icons/AppIcon";
import type { ButtonVariant } from "./StandardButton";

interface RoundButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children" | "type"> {
  icon: AppIconName;
  label: string;
  iconSize?: number;
  variant?: ButtonVariant;
}

/** Pulsante circolare della barra laterale; mostra esclusivamente un’icona accessibile. */
export function RoundButton({ icon, label, iconSize = 24, variant = "secondary", className, title = label, ...props }: RoundButtonProps) {
  const classes = [`${variant}-button`, "round-button", className].filter(Boolean).join(" ");
  return <button {...props} type="button" className={classes} aria-label={label} title={title}>
    <AppIcon name={icon} size={iconSize} />
  </button>;
}
