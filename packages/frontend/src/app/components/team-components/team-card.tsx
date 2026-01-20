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
  let path = usePathname();
  return (
    <div
      className={`${className}flex-wrap box list-none center`}
      onClick={() => {
        link ? (window.location.href = `${path}/${team.team_id}`) : null;
      }}
    >
      {team.team_name}
    </div>
  );
}
