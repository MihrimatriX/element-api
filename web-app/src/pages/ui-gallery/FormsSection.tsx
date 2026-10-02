import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { ChipGroup } from "@/components/ui/chip-group";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SearchField } from "@/components/ui/search-field";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { matchesSearch } from "@/lib/text";
import { Specimen } from "./Specimen";

const SAMPLE_ELEMENTS = ["Hidrojen", "Çinko", "Demir", "Gümüş", "Silisyum", "İyot", "Kükürt", "Oksijen", "Sodyum", "Altın"];

const LENSES = [
  { value: "family", label: "Aile" },
  { value: "mass", label: "Kütle" },
  { value: "electronegativity", label: "Elektronegatiflik" },
  { value: "phase", label: "Faz" },
] as const;

const FAMILY_FILTERS = [
  { value: "alkali", label: "Alkali", color: "var(--color-family-alkali)", count: 6 },
  { value: "transition", label: "Geçiş", color: "var(--color-family-transition)", count: 38 },
  { value: "halogen", label: "Halojen", color: "var(--color-family-halogen)", count: 6 },
  { value: "noble", label: "Soy gaz", color: "var(--color-family-noble)", count: 7 },
  { value: "lanthanide", label: "Lantanit", color: "var(--color-family-lanthanide)", count: 15 },
] as const;

type Lens = (typeof LENSES)[number]["value"];
type Family = (typeof FAMILY_FILTERS)[number]["value"];

/** Field rows, search, chips, segmented control and tabs. */
export function FormsSection() {
  const [email, setEmail] = useState("ada@ornek");
  const [query, setQuery] = useState("cinko");
  const [lens, setLens] = useState<Lens | null>("family");
  const [families, setFamilies] = useState<Family[]>(["transition", "noble"]);
  const [view, setView] = useState<"table" | "cards">("table");
  const [scope, setScope] = useState<"all" | "elements" | "compounds">("all");
  const matches = SAMPLE_ELEMENTS.filter((name) => matchesSearch(query, name));
  const emailError = email.includes(".") ? undefined : "Geçerli bir e-posta adresi yaz (örnek: ada@ornek.com).";

  return (
    <Section
      id="formlar"
      eyebrow="03"
      title="Formlar ve filtreler"
      description="Etiket, ipucu ve hata kimlikleri Field tarafından bağlanır. Arama Türkçe harfleri katlar: “cinko” Çinko'yu bulur."
    >
      <div className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Specimen title="Alanlar" note="Field + Input / NativeSelect / Textarea" className="grid gap-5">
            <Field label="E-posta" required error={emailError} hint="Giriş ve kurtarma için kullanılır.">
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field
              label="Şifre"
              labelAction={<a href="#formlar" className="text-link">Şifremi unuttum</a>}
            >
              <Input type="password" placeholder="En az 8 karakter" />
            </Field>
            <Field label="Örnek dili">
              <NativeSelect defaultValue="js">
                <NativeSelectOption value="curl">curl</NativeSelectOption>
                <NativeSelectOption value="js">JavaScript</NativeSelectOption>
                <NativeSelectOption value="py">Python</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field label="Geri bildirim" hint="Kişisel bilgi yazma; mesaj anonim gönderilir.">
              <Textarea placeholder="Hangi sayfada, ne bekliyordun?" />
            </Field>
          </Specimen>

          <div className="grid content-start gap-5">
            <Specimen title="Arama" note="SearchField · canlı sonuç sayısı">
              <SearchField
                label="Element ara"
                placeholder="Ad veya sembol"
                value={query}
                onValueChange={setQuery}
                resultCount={matches.length}
              />
              <ul className="mt-4 flex flex-wrap gap-2">
                {matches.map((name) => (
                  <li key={name} className="rounded-sm border border-line bg-surface px-2 py-1 text-[13px] text-ink-2">
                    {name}
                  </li>
                ))}
              </ul>
            </Specimen>

            <Specimen title="Çipler" note="ChipGroup · tekli ve çoklu" className="grid gap-5">
              <div>
                <p className="eyebrow mb-3">Mercek</p>
                <ChipGroup type="single" label="Tablo merceği" options={LENSES} value={lens} onValueChange={setLens} />
              </div>
              <div>
                <p className="eyebrow mb-3">Aileler</p>
                <ChipGroup type="multiple" label="Element aileleri" options={FAMILY_FILTERS} value={families} onValueChange={setFamilies} />
              </div>
            </Specimen>

            <Specimen title="Bölümlü seçim" note="Segmented · radiogroup" className="flex flex-wrap items-center gap-4">
              <Segmented
                label="Görünüm"
                value={view}
                onValueChange={setView}
                options={[
                  { value: "table", label: "Tablo", icon: LayoutGrid },
                  { value: "cards", label: "Kartlar", icon: List },
                ]}
              />
              <Segmented
                label="Kapsam"
                size="sm"
                value={scope}
                onValueChange={setScope}
                options={[
                  { value: "all", label: "Tümü" },
                  { value: "elements", label: "Elementler" },
                  { value: "compounds", label: "Bileşikler" },
                ]}
              />
            </Specimen>
          </div>
        </div>
        <Specimen title="Sekmeler" note="Tabs · default ve line" className="grid gap-6 lg:grid-cols-2">
          <Tabs defaultValue="facts">
            <TabsList>
              <TabsTrigger value="facts">Özellikler</TabsTrigger>
              <TabsTrigger value="uses">Kullanım</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="facts" className="text-sm leading-6 text-ink-2">
              Gümüş, bilinen en iyi elektrik ve ısı iletkenidir.
            </TabsContent>
            <TabsContent value="uses" className="text-sm leading-6 text-ink-2">
              Takı, elektronik bağlantılar ve fotoğraf filmi.
            </TabsContent>
            <TabsContent value="json" className="font-mono text-sm text-ink-2">
              {'{ "symbol": "Ag" }'}
            </TabsContent>
          </Tabs>
          <Tabs defaultValue="v2">
            <TabsList variant="line">
              <TabsTrigger value="v2">Bilimsel API v2</TabsTrigger>
              <TabsTrigger value="v1">Platform API v1</TabsTrigger>
            </TabsList>
            <TabsContent value="v2" className="text-sm leading-6 text-ink-2">
              Herkese açık, anahtarsız; elementler, bileşikler ve kaynaklar.
            </TabsContent>
            <TabsContent value="v1" className="text-sm leading-6 text-ink-2">
              Hesap gerektirir; cüzdan, sipariş ve webhook uçları.
            </TabsContent>
          </Tabs>
        </Specimen>
      </div>
    </Section>
  );
}
