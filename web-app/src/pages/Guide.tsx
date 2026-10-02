import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/ui/disclosure";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { WorkshopMarks } from "../components/AtlasVisual";
import {
  guideQuestions,
  guideSteps,
  type GuideQuestion,
} from "../components/reference/guide-content";
import { GuideSteps } from "../components/reference/GuideSteps";
import Seo from "../components/Seo";
import { ACCOUNTS_ENABLED, publicApiUrl } from "../config";

const steps = guideSteps(ACCOUNTS_ENABLED);
const questions = guideQuestions(ACCOUNTS_ENABLED);

const API_SAMPLES = [
  {
    title: "Element · Fe",
    path: "/api/v2/elements/fe?fields=symbol,names,editorial.summary",
  },
  {
    title: "Bileşik · H₂O",
    path: "/api/v2/compounds/h2o?fields=slug,names,display_formula,composition",
  },
];

/** FAQ as progressive disclosure: questions stay scannable, answers open on demand. */
function GuideFaq({ items }: { items: readonly GuideQuestion[] }) {
  return (
    <div className="border-t border-line">
      {items.map((item) => (
        <Disclosure key={item.question} className="border-b border-line">
          <h3 className="font-sans text-[15px] font-medium tracking-normal">
            <DisclosureTrigger className="py-4">{item.question}</DisclosureTrigger>
          </h3>
          <DisclosureContent>
            <p className="max-w-prose pb-5 text-[15px] leading-7 text-ink-2">
              {item.answer}
            </p>
          </DisclosureContent>
        </Disclosure>
      ))}
    </div>
  );
}

/** Side panel: back to the notebook, plus the KREDI demo as a quiet note when accounts are off. */
function ProgressAside() {
  return (
    <aside
      aria-labelledby="guide-aside-title"
      className="panel p-5 lg:sticky lg:top-24 lg:self-start"
    >
      <WorkshopMarks beat="salt" className="mb-4" />
      <h2
        id="guide-aside-title"
        className="font-sans text-sm font-semibold tracking-normal text-ink"
      >
        Kaldığın yer
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-2">
        Rotalar, kalan keşifler, indirdiğin JSON. Oyun skorları burada görünmez,
        ayrı kutu.
      </p>
      <div className="mt-5 grid gap-2">
        <Button asChild>
          <Link to="/collection">Defterime git</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/lab?lesson=everyday">
            İki H, bir O
            <ArrowRight aria-hidden="true" strokeWidth={1.75} />
          </Link>
        </Button>
      </div>
      {!ACCOUNTS_ENABLED && (
        <p className="mt-5 border-t border-line pt-4 text-[13px] leading-5 text-ink-3">
          Sanal krediyle alım satım ayrı bir gösteri:{" "}
          <Link to="/demo" className="text-link">
            KREDI demosunu tanı
          </Link>
          .
        </p>
      )}
    </aside>
  );
}

/** /nasil, "El kitabı": first ten minutes step by step, FAQ and the same records over curl. */
export default function Guide() {
  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="El kitabı · ElementAPI"
        description="İlk 10 dakika: Demir'i bul, suyu kur, ilk rotayı bitir, Formülü kur ve Dedektifi oyna, defteri yedekle."
        path="/nasil"
      />
      <PageHeader
        eyebrow="El kitabı"
        title="İlk 10 dakika"
        lead={
          ACCOUNTS_ENABLED
            ? "Demir’i bul, suyu kur, defteri yedekle. Hesap şart değil; piyasa ayrı bir kredi demosu."
            : "Demir’i bul, suyu kur, defteri yedekle. Hesap gerekmez; her şey bu tarayıcıda durur."
        }
      />

      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-16">
        <div className="min-w-0">
          <Section
            title="Adım adım"
            description="Sırayla git ya da istediğin adımdan başla; hiçbiri ötekini kilitlemez."
          >
            <GuideSteps steps={steps} />
          </Section>

          <Section title="Sık sorulanlar">
            <GuideFaq items={questions} />
          </Section>

          <Section
            title="Aynı kaydı kabloyla"
            description="Tablonun ve laboratuvarın okuduğu kayıtlar açık API’de; bilimsel v2 için anahtar gerekmez."
          >
            <div className="grid gap-4">
              {API_SAMPLES.map((sample) => (
                <CodeBlock
                  key={sample.path}
                  title={sample.title}
                  language="bash"
                  code={`curl -s "${publicApiUrl(sample.path)}"`}
                />
              ))}
            </div>
            <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link to="/docs" className="text-link">
                API tezgâhı
              </Link>
              <Link to="/sozluk" className="text-link">
                Sözlük
              </Link>
              <Link to="/data" className="text-link">
                Kaynaklar
              </Link>
            </p>
          </Section>
        </div>

        <ProgressAside />
      </div>
    </main>
  );
}
