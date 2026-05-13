type LogoProps = {
  size?: number;
  title?: string;
};

export function Logo({ size = 20, title = "mdview" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
      style={{ display: "block" }}
    >
      <path d="M4 19 V5 L12 13 L20 5 V19" />
      <circle cx={4} cy={19} r={1.6} fill="var(--accent)" stroke="none" />
    </svg>
  );
}
