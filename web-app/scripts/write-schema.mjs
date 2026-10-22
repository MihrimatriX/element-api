// Writes public/schema/{elements,compounds}.schema.json: JSON Schemas inferred
// from the full records in the bundled snapshots. Projected API responses
// (summary/fields/include) may omit fields, so they need not satisfy `required`.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const typeOf = (value) =>
  value === null ? "null" : Array.isArray(value) ? "array" : typeof value;

/** Infers a draft-07 schema that every value in `values` satisfies. */
function inferSchema(values) {
  const valuesByType = new Map();
  for (const value of values) {
    const type = typeOf(value);
    if (!valuesByType.has(type)) valuesByType.set(type, []);
    valuesByType.get(type).push(value);
  }
  // Never assert a type nobody has observed: an always-null field stays untyped.
  if (valuesByType.size === 1 && valuesByType.has("null"))
    return {
      description:
        "No populated value in this snapshot. Null means unavailable, not zero.",
    };
  const variants = [...valuesByType].map(([type, rows]) => {
    if (type === "object") {
      const keys = [...new Set(rows.flatMap(Object.keys))];
      return {
        type,
        properties: Object.fromEntries(
          keys.map((key) => [
            key,
            inferSchema(rows.filter((row) => key in row).map((row) => row[key])),
          ]),
        ),
        required: keys.filter((key) => rows.every((row) => key in row)),
        additionalProperties: false,
      };
    }
    if (type === "array") {
      const items = rows.flat();
      return { type, items: items.length ? inferSchema(items) : {} };
    }
    return { type };
  });
  return variants.length === 1 ? variants[0] : { anyOf: variants };
}

const snapshots = {
  elements: "../../catalog-service/Element.Services.Element.Infrastructure/Data/",
  compounds: "../../compound-service/Element.Services.Compound.Infrastructure/Data/",
};
const output = new URL("../public/schema/", import.meta.url);
mkdirSync(output, { recursive: true });

for (const [kind, directory] of Object.entries(snapshots)) {
  const records = JSON.parse(
    readFileSync(
      new URL(`${directory}scientific-${kind}.json`, import.meta.url),
      "utf8",
    ),
  );
  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: `ElementAPI v2 full ${kind} snapshot`,
    description:
      "Schema for unprojected full records in the bundled snapshot. Summary/fields/include projections do not necessarily satisfy required fields. Entirely null fields intentionally do not assert an unverified type.",
    ...inferSchema(records),
  };
  writeFileSync(
    new URL(`${kind}.schema.json`, output),
    JSON.stringify(schema, null, 2) + "\n",
  );
}
