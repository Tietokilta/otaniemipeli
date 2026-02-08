import { getUserTypeFromPath } from "@/utils/helpers";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GameCard({
  game,
  link = false,
  className,
  relativePath = false,
}: {
  game: Game;
  link?: boolean;
  className?: string;
  relativePath?: boolean;
}) {
  const path = usePathname();
  const content = (
    <>
      <h2 className="text-xl font-semibold mb-2">{game.name}</h2>
      <p className="text-quaternary-500">{game.board.name}</p>
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
    </>
  );
  return link ? (
    <Link
      className={`${className} box-hover`}
      href={
        relativePath
          ? `${path}/${game.id}`
          : `/${getUserTypeFromPath(window.location.href)?.toLowerCase()}/games/${game.id}`
      }
    >
      {content}
    </Link>
  ) : (
    <div className={`${className} box`}>{content}</div>
  );
}
