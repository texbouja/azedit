import type { LucideIcon } from "lucide-react";

type IconProps = {
  icon: LucideIcon;
  size?: number;
  strokeWidth?: number;
  title?: string;
};

export function Icon({ icon: Component, size = 16, strokeWidth = 1.75, title }: IconProps) {
  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
