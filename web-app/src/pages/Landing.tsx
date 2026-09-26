import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Code2, FlaskConical, Grid2X2, BookMarked } from "lucide-react";
import Seo from "../components/Seo";
import { Button } from "../components/ui/button";

const HERO_PHOTO = "/brand/elementapi-hero-void-cuprite.jpg";
const LAB_PHOTO = "/brand/elementapi-lab-glass.jpg";

const ORBIT = [
  "H",
  "C",
  "N",
  "O",
  "Fe",
  "Cu",
  "Au",
  "Ag",
  "Si",
  "P",
  "S",
  "Cl",
  "Na",
  "K",
  "Ca",
  "Mg",
  "Zn",
  "Pb",
  "Hg",
  "U",
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Landing() {
  const reduce = useReducedMotion();

  const enter = reduce
    ? undefined
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
  const reveal = reduce
    ? undefined
    : {
        initial: { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.25 },
        transition: { duration: 0.7, ease: EASE },
      };

  return (
    <main className="product-landing product-landing--void">
      <Seo
        title="ElementAPI · Kimya kayıtları ve açık API"
        description="118 element, 214 bileşik. Periyodik tablodan laboratuvara, deftere ve açık bilimsel API’ye."
        path="/"
      />

      <section className="product-hero" aria-label="ElementAPI">
        <div className="product-hero-visual" aria-hidden="true">
          <img
            src={HERO_PHOTO}
            alt=""
            width={1600}
            height={900}
            fetchPriority="high"
          />
        </div>
        <div className="product-hero-veil" aria-hidden="true" />
        <motion.div
          className="product-hero-copy"
          initial={enter?.initial}
          animate={enter?.animate}
          transition={{ duration: 0.8, delay: 0.05, ease: EASE }}
        >
          <div className="product-hero-brand-row">
            <img
              className="product-hero-mark"
              src="/brand/mark.svg"
              alt=""
              width={56}
              height={56}
            />
            <p className="product-hero-brand">ElementAPI</p>
          </div>
          <h1>Hücreden moleküle.</h1>
          <p className="product-hero-lead">
            118 element, 214 bileşik. Tabloyu aç, laboratuvara gir, kaydı kullan.
          </p>
          <div className="product-hero-cta">
            <Button asChild size="lg">
              <Link to="/periodic">
                <Grid2X2 size={17} />
                Tabloyu aç
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/lab">
                <FlaskConical size={17} />
                Laboratuvar
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <div className="product-orbit" aria-hidden="true">
        <div className="product-orbit-track">
          {[...ORBIT, ...ORBIT].map((sym, i) => (
            <span
              key={`${sym}-${i}`}
              className={sym === "Cu" ? "is-accent" : undefined}
            >
              {sym}
            </span>
          ))}
        </div>
      </div>

      <section className="product-measure" aria-label="Kapsam">
        <motion.div className="product-measure-inner" {...(reveal ?? {})}>
          <Link to="/periodic" className="product-measure-giant">
            <strong>118</strong>
            <span>element</span>
          </Link>
          <div className="product-measure-side">
            <Link to="/lab" className="product-measure-row">
              <strong>214</strong>
              <span>bileşik keşfi</span>
            </Link>
            <Link to="/developers" className="product-measure-row">
              <strong>API</strong>
              <span>anahtarsız uçlar</span>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="product-stage" aria-labelledby="stage-title">
        <div className="product-stage-visual" aria-hidden="true">
          <img
            src={LAB_PHOTO}
            alt=""
            width={1600}
            height={900}
            loading="lazy"
          />
        </div>
        <div className="product-stage-veil" aria-hidden="true" />
        <motion.div className="product-stage-copy" {...(reveal ?? {})}>
          <h2 id="stage-title">Karıştır. Dene. Gör.</h2>
          <p>
            Sürükle-bırak laboratuvar. Hit, almost, impossible. Gerçek tarif
            değil, gerçek stoikiometri.
          </p>
          <Button asChild size="lg">
            <Link to="/lab">
              <FlaskConical size={17} />
              Laboratuvara gir
            </Link>
          </Button>
        </motion.div>
      </section>

      <section className="product-signal" aria-labelledby="signal-title">
        <motion.div className="product-signal-inner" {...(reveal ?? {})}>
          <div className="product-signal-copy">
            <h2 id="signal-title">Açık bilimsel API</h2>
            <p>
              Alan seçimi, ETag, Türkçe kayıt. Anahtarsız uçlar uygulamana hazır.
            </p>
            <Button asChild>
              <Link to="/developers">
                <Code2 size={16} />
                API’yi incele
              </Link>
            </Button>
          </div>
          <pre className="product-api-sample" tabIndex={0}>
            <code>{`GET /api/v2/elements/cu?fields=symbol,name,mass
Accept-Language: tr`}</code>
          </pre>
        </motion.div>
      </section>

      <section className="product-close" aria-label="Kapanış">
        <motion.div className="product-close-inner" {...(reveal ?? {})}>
          <p className="product-close-tag">Atlası aç.</p>
          <p className="product-close-lead">
            Kaydı kendi uygulamanda kullan. Defterine yaz.
          </p>
          <div className="product-close-cta">
            <Button asChild size="lg">
              <Link to="/periodic">Tabloyu aç</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/collection">
                <BookMarked size={17} />
                Deftere git
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
