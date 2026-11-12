import ActivityDetail from "@/components/ActivityDetail";

export default async function ActivityPage({ params }: PageProps<"/activities/[id]">) {
  const { id } = await params;
  return <ActivityDetail id={id} />;
}
