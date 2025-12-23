export default function TeamCard({
  team,
  className,
}: {
  team: Team;
  className?: string;
}) {
  return (
    <div className={`${className}flex-wrap box list-none center`}>
      {team.team_name}
    </div>
  );
}
