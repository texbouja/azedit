type DividerProps = {
  orientation?: "horizontal" | "vertical";
};

export function Divider({ orientation = "horizontal" }: DividerProps) {
  return <div className={`mdv-divider mdv-divider--${orientation}`} aria-hidden />;
}
