"use client";

interface SimpleCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function SimpleCard({
  children,
  className = "",
  onClick,
  active = true,
}: SimpleCardProps): JSX.Element {
  const baseClassName = active ? "button" : "box";
  const cursorStyle = active && onClick ? { cursor: "pointer" } : undefined;

  return (
    <div
      className={`${className} ${baseClassName} list-none center`}
      onClick={onClick && active ? onClick : undefined}
      style={cursorStyle}
    >
      {children}
    </div>
  );
}
