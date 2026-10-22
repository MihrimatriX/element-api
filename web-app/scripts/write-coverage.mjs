// Writes src/data/coverage.json: record counts and which element sections have
// no data at all, computed from the bundled scientific snapshots.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const webApp = new URL("../", import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, webApp), "utf8"));

const elements = readJson(
  "../catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json",
);
const compounds = readJson(
  "../compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json",
);
const records = [...elements, ...compounds];

/** True when the value, or anything nested in it, holds data (not null and not ""). */
const isPopulated = (value) =>
  value != null &&
  (typeof value === "object"
    ? Object.values(value).some(isPopulated)
    : value !== "");

const coverage = {
  unavailableElementSections: Object.keys(elements[0]).filter(
    (section) => !elements.some((record) => isPopulated(record[section])),
  ),
  elements: elements.length,
  compounds: compounds.length,
  editorial: records.filter((record) => record.editorial?.summary).length,
  photos: elements.filter((record) => record.media?.photo).length,
  structures: compounds.filter((record) => record.media?.structure).length,
  retrievedAt: [...new Set(records.map((record) => record.provenance.retrieved_at))]
    .sort()
    .join(" / "),
};

mkdirSync(new URL("src/data/", webApp), { recursive: true });
writeFileSync(
  new URL("src/data/coverage.json", webApp),
  JSON.stringify(coverage, null, 2) + "\n",
);
