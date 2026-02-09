"use client";
import CreateGameForm from "@/app/components/game-components/create-game-form";
import GameList from "@/app/components/game-components/game-list";
import CreateUserForm from "@/app/components/create-user-form";
import { useState } from "react";

export default function Home() {
  const [refresh, setRefresh] = useState({});
  return (
    <div className="flex-1 flex flex-wrap lg:flex-nowrap gap-x-4 gap-y-10 overflow-auto">
      <CreateUserForm className="w-full lg:w-100 box" />
      <CreateGameForm
        className="w-full lg:w-100"
        onCreate={() => setRefresh({})}
      />
      <GameList className="w-full lg:w-100" refresh={refresh} />
    </div>
  );
}
