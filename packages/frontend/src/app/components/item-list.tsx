export default function ItemList({
  title,
  children,
  addDialog,
  className,
}: {
  title: string;
  children: React.ReactNode;
  addDialog: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={`${className} box mb-auto h-full flex flex-col min-h-0`}>
      <div className="flex items-center justify-between px-2 gap-2 w-full shrink-0">
        <h1 className="text-center w-full">{title}</h1>
        {addDialog}
      </div>
      <ul className="flex flex-col gap-2 px-2 py-2 overflow-y-auto flex-1 min-h-0">
        {children}
      </ul>
    </div>
  );
}
