import logoUrl from "@/assets/mascot/mdview-transpa-bg.png";

type LogoProps = {
  size?: number;
  title?: string;
};

export function Logo({ size = 22, title = "AZedit" }: LogoProps) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt={title}
      draggable={false}
      style={{ display: "block", userSelect: "none" }}
    />
  );
}
