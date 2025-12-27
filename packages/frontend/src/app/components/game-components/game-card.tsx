import { getUserTypeFromPath } from "@/utils/helpers";

export default function GameCard({
  game,
  link = false,
  className,
}: {
  game: Game;
  link?: boolean;
  className?: string;
}) {
  return (
    <li
      key={game.id}
      className={`${className} box`}
      onClick={() =>
        link
          ? (window.location.href = `/${getUserTypeFromPath(window.location.href)?.toLowerCase()}/games/${game.id}`)
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
