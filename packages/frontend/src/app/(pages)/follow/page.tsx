export const dynamic = "force-dynamic";

import { FlickerText } from "@/app/components/flicker-text";

export default async function Home() {
  return (
    <div className="flex flex-col items-center gap-3.5 max-h-[90dvh] w-full sm:px-10 sm:py-4">
      <FlickerText>
        <h1 className="text-tertiary-900 !text-5xl">
          Museobileet?.Otaniemipeli.await;
        </h1>
      </FlickerText>
    </div>
  );
}
