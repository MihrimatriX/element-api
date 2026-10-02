import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureSection } from "./FeatureSection";

const LAB_PHOTO = "/brand/elementapi-lab-glass.jpg";

const STEPS = [
  { title: "Sürükle", text: "Paletten bir elementi tezgâha bırak." },
  { title: "Oranı ayarla", text: "Atom sayılarını + ve − ile değiştir: iki H, bir O." },
  { title: "Dene", text: "Katalogdaki bir molekülle eşleşirse kartı açılır ve deftere yazılır." },
];

/** Laboratory feature: the bench photo and the three steps of a try. */
export function LabFeature() {
  return (
    <FeatureSection
      mediaFirst
      eyebrow="Laboratuvar"
      title="Tezgâhta birleştir"
      media={
        <img
          src={LAB_PHOTO}
          alt=""
          width={1152}
          height={864}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-2xl border border-line bg-canvas object-cover shadow-lg"
        />
      }
      actions={
        <Button asChild size="lg">
          <Link to="/lab">
            <FlaskConical strokeWidth={1.75} />
            Laboratuvara gir
          </Link>
        </Button>
      }
    >
      <p>Elementleri gerçek oranlarıyla bir araya getir. Bir deneme üç adım sürer.</p>
      <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4 bg-canvas-2 px-5 py-4">
            <span className="font-mono text-xs leading-6 text-brand-ink tabular">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>
              <span className="block font-medium text-ink">{step.title}</span>
              <span className="block text-sm leading-6 text-ink-2">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[13px] leading-6 text-ink-3">
        Gerçek deney tarifi değil: tezgâh oranı ve bilinen molekülleri denetler,
        tepkime koşullarını hesaplamaz.
      </p>
    </FeatureSection>
  );
}
