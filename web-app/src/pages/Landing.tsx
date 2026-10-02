import Seo from "../components/Seo";
import { ApiFeature } from "../components/landing/ApiFeature";
import { ClosingBand } from "../components/landing/ClosingBand";
import { CoverageBand } from "../components/landing/CoverageBand";
import { LabFeature } from "../components/landing/LabFeature";
import { LandingHero } from "../components/landing/LandingHero";
import { NotebookFeature } from "../components/landing/NotebookFeature";
import { TableFeature } from "../components/landing/TableFeature";
import { getPublicSiteUrl } from "../config";
import coverage from "../data/coverage.json";

const SITE = getPublicSiteUrl();
const LANDING_DESCRIPTION = `${coverage.elements} element, ${coverage.compounds} bileşik. Periyodik tablodan laboratuvara, deftere ve açık bilimsel API’ye.`;

/**
 * Public landing page (eager-loaded): hero, coverage figures, the four
 * product areas in a zig-zag rhythm and a closing call to action.
 */
export default function Landing() {
  return (
    <main className="container-page pt-10 pb-24 lg:pt-14">
      <Seo
        title="ElementAPI · Kimya kayıtları ve açık API"
        description={LANDING_DESCRIPTION}
        path="/"
        jsonLd={[
          {
            "@type": "Organization",
            name: "ElementAPI",
            url: `${SITE}/`,
            logo: `${SITE}/brand/mark.svg`,
          },
          {
            "@type": "WebSite",
            name: "ElementAPI",
            url: `${SITE}/`,
            inLanguage: "tr",
            description: LANDING_DESCRIPTION,
          },
        ]}
      />
      <LandingHero />
      <CoverageBand />
      <TableFeature />
      <LabFeature />
      <NotebookFeature />
      <ApiFeature />
      <ClosingBand />
    </main>
  );
}
