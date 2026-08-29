/**
 * Handed to the user (and pasted into Claude in their ablation repo) so the
 * JSON that comes back is importable without editing.
 */
export const IMPORT_PROMPT = `Read this repository and write out my ablation studies as a single JSON file.

Format: an array of study objects, nested through \`children\`. Each study is
nested under the run it builds on.

[
  {
    "title": "Baseline",
    "summary": "Full model, no ablations",
    "status": "done",
    "notes": "## Setup\\n\\n- 4x A100, 12 epochs, lr 3e-4\\n\\n**Finding:** reference point.",
    "metrics": [
      { "name": "accuracy", "value": 0.871 },
      { "name": "params", "value": 124, "unit": "M" }
    ],
    "children": [
      {
        "title": "no cross-attention",
        "summary": "Remove cross-attention block",
        "status": "done",
        "notes": "**Finding:** accuracy drops ~3 points.",
        "metrics": [{ "name": "accuracy", "value": 0.842 }],
        "children": []
      }
    ]
  }
]

Rules:
- \`title\` is required. Everything else is optional.
- \`status\` is one of: planned, running, done, failed. Defaults to done.
- \`notes\` is markdown — setup, the command that was run, and what the ablation showed.
- \`metrics[].value\` must be a number, never a string. \`unit\` is optional ("M", "%", "ms").
- Use the same metric \`name\` across studies so they can be compared against their parent.
- Multiple roots are allowed (top-level array with more than one entry).
- Output only the JSON, nothing else.`;
