import RefereePage from "@/app/(pages)/referee/games/[game_id]/teams/all/page";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  return <RefereePage params={params} caster />;
}
