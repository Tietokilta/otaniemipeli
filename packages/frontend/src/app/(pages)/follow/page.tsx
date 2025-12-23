import Image from "next/image";
import TikLogo from "@/public/TiKprofiilikuva.png";
import { FlickerText } from "@/app/components/flicker-text";

export default async function Home() {
  if (!process.env.API_URL_BASE) {
    throw new Error("No API URL_BASE environment variable");
  }
  const res = await fetch(process.env.API_URL_BASE);

  if (!res.ok) console.error("Failed to fetch API URL_BASE:", res.status);

  return (
    <div className="flex flex-col items-center gap-3.5 max-h-[90dvh] w-full sm:px-10 sm:py-4">
      <FlickerText>
        <h1 className="text-gray-900 !text-5xl">
          Museobileet?.Otaniemipeli.await;
        </h1>
      </FlickerText>

      <Image
        src={TikLogo}
        alt="logo"
        className="w-auto h-[75dvh] rounded-full"
      />
    </div>
  );
}
