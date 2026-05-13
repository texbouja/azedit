import type { HTMLAttributes, ReactNode } from "react";

type PaneProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function Pane({ children, className, ...rest }: PaneProps) {
  const classes = ["mdv-pane"];
  if (className) classes.push(className);
  return (
    <div {...rest} className={classes.join(" ")}>
      {children}
    </div>
  );
}
