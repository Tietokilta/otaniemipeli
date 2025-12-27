import SimpleCard from "@/app/components/simple-card";

export default function TeamCard({
  team,
  className,
}: {
  team: Team;
  className?: string;
}) {
  return (
    <SimpleCard className={`${className} flex-wrap`} active={false}>
      {team.team_name}
    </SimpleCard>
  );
}
