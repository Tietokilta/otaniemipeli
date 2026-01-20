export default function ErrorDisplay({
  message,
  status,
  className = "",
}: {
  message: string;
  status?: number | string;
  className?: string;
}): JSX.Element {
  return (
    <div className={`${className} center p-4`}>
      <h1 className="text-2xl font-bold text-alert-500">{message}</h1>
      {status && <p className="text-sm text-tertiary-900">{status}</p>}
    </div>
  );
}
