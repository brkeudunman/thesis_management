import ImportPanel from "@/components/ImportPanel";
import { getStudies } from "@/lib/studies";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const studies = await getStudies();
  return <ImportPanel studies={studies} />;
}
