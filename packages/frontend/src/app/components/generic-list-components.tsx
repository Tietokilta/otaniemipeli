export function HorizontalList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={`${className} flex gap-1 overflow-x-scroll overflow-y-hidden`}
    >
      {children}
    </div>
  );
}

export function VerticalList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={`${className} flex flex-col overflow-y-auto min-h-0`}>
      {children}
    </div>
  );
}
