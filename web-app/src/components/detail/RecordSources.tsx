import { LinkCard } from "@/components/ui/link-card";
import { Section } from "@/components/ui/section";
import { formatRetrievedAt, type SourceLink } from "./record";

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** "Kaynaklar ve veri kapsamı": retrieval date and one card per cited source. */
export function RecordSources({
  sources,
  retrievedAt,
}: {
  sources: SourceLink[];
  /** `provenance.retrieved_at`: an ISO date, or "catalog" for the offline copy. */
  retrievedAt: unknown;
}) {
  const date = formatRetrievedAt(retrievedAt);
  return (
    <Section
      id="sources"
      title="Kaynaklar ve veri kapsamı"
      description={
        date
          ? `Bilimsel veri ${date} tarihinde alındı. Türkçe anlatım editöryeldir; sayısal verinin kaynakları aşağıda.`
          : "Bu kayıt çevrimdışı katalog kopyasından gösteriliyor. Türkçe anlatım editöryeldir; sayısal verinin kaynakları aşağıda."
      }
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {sources.map((source) => (
          <li key={source.url}>
            <LinkCard href={source.url} title={source.name} meta={hostOf(source.url)} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
