import { toJson, toMarkdown } from "@/lib/export";
import { getStudies } from "@/lib/studies";
import { buildForest } from "@/lib/tree";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") ?? "md";
  const studies = await getStudies();
  const forest = buildForest(studies);

  const json = format === "json";
  const body = json ? toJson(forest) : toMarkdown(forest, studies);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type": json
        ? "application/json; charset=utf-8"
        : "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="ablation-studies-${stamp}.${
        json ? "json" : "md"
      }"`,
    },
  });
}
