import type { ReactNode } from "react";
import {
  Gauge,
  Globe,
  KeyRound,
  ListFilter,
  Quote,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { InlineCode } from "./InlineCode";

interface Fact {
  icon: LucideIcon;
  title: string;
  text: ReactNode;
}

const FACTS: readonly Fact[] = [
  {
    icon: KeyRound,
    title: "Anahtar gerekmez",
    text: (
      <>
        <InlineCode>GET /api/v2</InlineCode> herkese açık; hesap, anahtar veya
        kayıt istemez.
      </>
    ),
  },
  {
    icon: Gauge,
    title: "Hız sınırı",
    text: (
      <>
        IP başına: atlas ana bilgisayarında dakikada 300, kapı arkasında 10
        saniyede 60 istek. 429 gelirse <InlineCode>Retry-After</InlineCode>{" "}
        kadar bekle.
      </>
    ),
  },
  {
    icon: Globe,
    title: "CORS açık",
    text: (
      <>
        Her origin’den GET ve OPTIONS. <InlineCode>ETag</InlineCode> başlığı
        tarayıcıdan okunabilir.
      </>
    ),
  },
  {
    icon: RefreshCw,
    title: "ETag ve 304",
    text: (
      <>
        Zayıf ETag ve <InlineCode>max-age=3600</InlineCode>. Aynı parmak izini{" "}
        <InlineCode>If-None-Match</InlineCode> ile gönderirsen 304 gelir, gövde
        gelmez.
      </>
    ),
  },
  {
    icon: ListFilter,
    title: "Alan seçimi",
    text: (
      <>
        <InlineCode>fields</InlineCode> yalnız gereken yolları döndürür.{" "}
        <InlineCode>view=summary</InlineCode> kısa özet verir,{" "}
        <InlineCode>include</InlineCode> özete bölüm ekler.
      </>
    ),
  },
  {
    icon: Quote,
    title: "Kaynaklı, Türkçe kayıt",
    text: (
      <>
        Anlatım Türkçe; sayılar PubChem, RSC ve NIST kaynaklı. Eksik değer{" "}
        <InlineCode>null</InlineCode> kalır, sıfır uydurulmaz.
      </>
    ),
  },
];

/** The six rules a v2 client needs: no key, rate limit, CORS, ETag, field selection, sourced data. */
export function ApiFacts() {
  return (
    <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
      {FACTS.map(({ icon: Icon, title, text }) => (
        <li key={title} className="border-t border-line py-6">
          <Icon aria-hidden="true" strokeWidth={1.75} className="size-5 text-brand-ink" />
          <h3 className="mt-4 font-sans text-base font-semibold tracking-normal text-ink">
            {title}
          </h3>
          <p className="mt-1.5 text-[15px] leading-7 text-ink-2">{text}</p>
        </li>
      ))}
    </ul>
  );
}
