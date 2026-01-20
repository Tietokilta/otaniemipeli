import { getUserTypeFromPath } from "@/utils/helpers";
import { usePathname } from "next/navigation";

export default function GameCard({
  game,
  link = false,
  className,
  go_to_games,
}: {
  game: Game;
  link?: boolean;
  className?: string;
  go_to_games?: boolean;
}) {
  const path = usePathname();
  console.log(path);
  console.log(`${path}/${game.id}`);
  console.log(go_to_games);
  return (
    <li
      key={game.id}
      className={`${className} box`}
      onClick={() =>
        link
          ? go_to_games
            ? (window.location.href = `/${getUserTypeFromPath(window.location.href)?.toLowerCase()}/games/${game.id}`)
            : (window.location.href = `${path}/${game.id}`)
          : null
      }
      style={{ cursor: "pointer" }}
    >
      <h2 className="text-xl font-semibold mb-2">{game.name}</h2>
      <p className="text-quaternary-500">Lauta: {game.board}</p>
      <p className="text-quaternary-500">
        Aloitusaika: {new Date(game.start_time).toLocaleString()}
      </p>
      <p
        className={`font-medium ${game.finished ? "text-confirm-500" : "text-alert-500"}`}
      >
        {game.started && !game.finished
          ? "Peli on käynnissä"
          : game.finished
            ? "Peli on päättynyt"
            : "Peli ei ole alkanut"}
      </p>
    </li>
  );
}
