import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import Seo from "../components/Seo";
import { GuideArticle } from "../components/system-guide/GuideArticle";
import { GuideLayout } from "../components/system-guide/GuideLayout";
import { GuideNav, GuidePicker } from "../components/system-guide/GuideNav";
import { GuideSearchResults } from "../components/system-guide/GuideSearchResults";
import { GuideSkeleton } from "../components/system-guide/GuideSkeleton";
import {
  inlineText,
  searchGuide,
  splitGuideTitle,
  type GuidePage,
} from "../components/system-guide/guide-model";
import { useAnchorScroll } from "../components/system-guide/hooks";
import { useGuide, type GuideData } from "../components/system-guide/useGuide";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { Notice } from "../components/ui/notice";
import { PageHeader } from "../components/ui/page-header";
import { SearchField } from "../components/ui/search-field";

const GUIDE_TITLE = "Sistem kılavuzu · ElementAPI";
const GUIDE_DESCRIPTION = "ElementAPI'nin servisleri, fonksiyonları ve birlikte nasıl çalıştıkları.";

/** "Ticaret demosu · order-service": the sidebar group and the folder the page documents. */
function eyebrowOf(guide: GuideData, page: GuidePage): string {
  const group = guide.groups.find((candidate) => candidate.pages.includes(page));
  const { tag } = splitGuideTitle(page.title);
  return [group?.label ?? "Sistem kılavuzu", tag].filter(Boolean).join(" · ");
}

function seoTitle(guide: GuideData, page: GuidePage | undefined): string {
  if (!page) return `Bölüm bulunamadı · ${GUIDE_TITLE}`;
  if (page === guide.overview) return GUIDE_TITLE;
  return `${splitGuideTitle(page.title).name} · ${GUIDE_TITLE}`;
}

/**
 * The loaded guide: grouped sidebar with a search across every function (a
 * select and the search field above the content below `lg`), the chosen page
 * or the search results on the right, deep links down to single table rows.
 */
function GuideBrowser({ guide }: { guide: GuideData }) {
  const { slug } = useParams();
  const { pathname, key } = useLocation();
  // The query belongs to the location it was typed at, so any navigation
  // (sidebar link, section link, result) closes the results.
  const [typed, setTyped] = useState({ query: "", key });
  const query = typed.key === key ? typed.query : "";
  const setQuery = (value: string) => setTyped({ query: value, key });
  const resultsRef = useRef<HTMLOListElement>(null);
  useAnchorScroll();

  const page = slug ? guide.pages.find((candidate) => candidate.slug === slug) : guide.overview;
  const searching = query.trim() !== "";
  const search = searchGuide(guide.searchIndex, query);

  // Results replace the article at the top of the column; start reading them from the top.
  useEffect(() => {
    if (searching) window.scrollTo({ top: 0, behavior: "instant" });
  }, [searching]);

  function focusFirstResult(event: KeyboardEvent<HTMLInputElement>) {
    const first = resultsRef.current?.querySelector("a");
    if (event.key !== "ArrowDown" || !first) return;
    event.preventDefault();
    first.focus();
  }

  const searchField = (
    <SearchField
      value={query}
      onValueChange={setQuery}
      label="Kılavuzda ara"
      placeholder="Fonksiyon, dosya, uç nokta"
      resultCount={search.total}
      onKeyDown={focusFirstResult}
    />
  );
  const navigation = { overview: guide.overview, groups: guide.groups, current: page };

  let content: ReactNode;
  if (searching) {
    content = (
      <GuideSearchResults
        query={query.trim()}
        total={search.total}
        results={search.results}
        onSelect={() => setQuery("")}
        listRef={resultsRef}
      />
    );
  } else if (page) {
    content = <GuideArticle key={page.slug} page={page} eyebrow={eyebrowOf(guide, page)} />;
  } else {
    content = (
      <EmptyState
        icon={FileQuestion}
        title="Bu bölüm yok"
        titleAs="h1"
        size="page"
        actions={
          <Button asChild variant="outline">
            <Link to="/kilavuz">Genel bakışa dön</Link>
          </Button>
        }
      >
        “{slug}” adında bir kılavuz sayfası bulunamadı. Listeden bir bölüm seç ya da genel
        bakıştan başla.
      </EmptyState>
    );
  }

  return (
    <>
      <Seo
        title={seoTitle(guide, page)}
        description={page ? inlineText(page.summary) : GUIDE_DESCRIPTION}
        path={page?.path ?? pathname}
        noIndex
      />
      <GuideLayout
        sidebar={
          <>
            {searchField}
            <div className="mt-6">
              <GuideNav {...navigation} />
            </div>
          </>
        }
        toolbar={
          <>
            <GuidePicker {...navigation} />
            {searchField}
          </>
        }
      >
        {content}
      </GuideLayout>
    </>
  );
}

/**
 * /kilavuz and /kilavuz/:slug — the in-app system guide. Its content is
 * docs/kilavuz, turned into src/data/guide.json by scripts/write-guide.mjs
 * (predev, build, pretest) and fetched when the page opens.
 */
export default function SystemGuide() {
  const guide = useGuide();
  const { pathname } = useLocation();

  let body: ReactNode;
  if (guide.status === "ready") {
    body = <GuideBrowser guide={guide.data} />;
  } else if (guide.status === "error") {
    body = (
      <>
        <PageHeader eyebrow="Geliştirici" title="Sistem kılavuzu" />
        <Notice
          tone="danger"
          title="Kılavuz yüklenemedi"
          className="mt-10"
          action={
            <Button variant="outline" size="sm" onClick={guide.retry}>
              Yeniden dene
            </Button>
          }
        >
          Kılavuz dosyası alınamadı. Bağlantını kontrol edip yeniden dene.
        </Notice>
      </>
    );
  } else {
    body = <GuideSkeleton />;
  }

  return (
    <main className="container-page pt-10 pb-24 lg:pt-14">
      {guide.status !== "ready" && (
        <Seo title={GUIDE_TITLE} description={GUIDE_DESCRIPTION} path={pathname} noIndex />
      )}
      {body}
    </main>
  );
}
