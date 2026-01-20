"use client";
import CreateGameForm from "@/app/components/game-components/create-game-form";
import GameList from "@/app/components/game-components/game-list";
import CreateUserForm from "@/app/components/create-user-form";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-3.5 max-h-[90dvh] sm:px-10 sm:py-4 ">
      <div className="flex gap-4 w-full h-full">
        <CreateUserForm className="w-100 box" />
        <CreateGameForm className="w-100" />
        <GameList className="w-100" go_to_games={true} />
      </div>
    </div>
  );
}
