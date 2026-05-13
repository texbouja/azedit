import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "solid";
  size?: "sm" | "md";
  icon?: ReactNode;
};

/**
 * Base button. Two variants — `ghost` (default, transparent with hover) and
 * `solid` (accent-filled CTA). Pair `icon` + optional `children` for label.
 *
 * <Button icon={<Icon icon={Save} />} title="save (⌘S)" onClick={save} />
 */
export function Button({
  variant = "ghost",
  size = "sm",
  icon,
  children,
  className,
  ...rest
}: ButtonProps) {
  const classes = ["mdv-btn", `mdv-btn--${variant}`, `mdv-btn--${size}`];
  if (className) classes.push(className);
  return (
    <button {...rest} className={classes.join(" ")}>
      {icon ? <span className="mdv-btn__icon">{icon}</span> : null}
      {children ? <span className="mdv-btn__label">{children}</span> : null}
    </button>
  );
}
