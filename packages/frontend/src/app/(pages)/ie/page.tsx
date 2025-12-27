export const dynamic = "force-dynamic";

export default async function Home() {
  if (!process.env.API_URL_BASE) {
    throw new Error("No API URL_BASE environment variable");
  }
  const res = await fetch(process.env.API_URL_BASE);

  if (!res.ok) console.error("Failed to fetch API URL_BASE:", res.status);

  const text = await res.text();

  return (
    <div className="flex flex-col items-center gap-3.5 max-h-[90dvh] sm:px-10 sm:py-4">
      <h1 className="text-tertiary-900 text-2xl font-bold">
        Tervetuloa Otaniemipeli-Adminiin!
      </h1>
      <p className="text-quaternary-500">{text}</p>
    </div>
  );
}
