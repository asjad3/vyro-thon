import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
};

const variants: Record<string, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary/85 active:bg-primary/75 disabled:opacity-40",
  secondary:
    "bg-surface text-foreground border border-cardBorder hover:bg-muted active:bg-muted/80 disabled:opacity-40",
  ghost:
    "text-mutedForeground hover:text-foreground hover:bg-muted/60 active:bg-muted",
  destructive:
    "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 disabled:opacity-40",
};

const sizes: Record<string, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
