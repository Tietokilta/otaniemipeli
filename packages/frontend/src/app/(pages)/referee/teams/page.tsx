import GameList from "@/app/components/game-components/game-list";

export default function Page() {
  return (
    <div className="center w-full">
      <h1>Get teams for game</h1>
      <GameList go_to_games={false} />
    </div>
  );
}
