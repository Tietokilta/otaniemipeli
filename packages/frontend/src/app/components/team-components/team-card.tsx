import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TeamCard({
  team,
  className,
  link,
}: {
  team: Team;
  className?: string;
  link?: boolean;
}) {
  const path = usePathname();
  return link ? (
    <Link
      className={`${className} flex-wrap box-hover list-none center`}
      href={`${path}/${team.team_id}`}
    >
      {team.team_name}
    </Link>
  ) : (
    <div className={`${className} flex-wrap box list-none center`}>
      {team.team_name}
    </div>
  );
}
