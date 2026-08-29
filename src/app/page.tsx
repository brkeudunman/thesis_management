import Workspace from "@/components/Workspace";
import { getStudies } from "@/lib/studies";

export const dynamic = "force-dynamic";

export default async function Page() {
  const studies = await getStudies();
  return <Workspace initialStudies={studies} />;
}
