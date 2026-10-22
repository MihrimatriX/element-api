import { Link } from "react-router-dom";
import { ArrowRight, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import lessons from "@/data/lessons.json";
import { FeatureSection } from "./FeatureSection";

/**
 * Notebook and learning routes: how discoveries are kept, and the real route
 * list from `data/lessons.json`, each row opening the lab on that route.
 */
export function NotebookFeature() {
  return (
    <FeatureSection
      eyebrow="Defter ve rotalar"
      title="Keşiflerin deftere yazılır"
      media={
        <ol
          aria-label="Öğrenme rotaları"
          className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
        >
          {lessons.map((lesson, index) => (
            <li key={lesson.id}>
              <Link
                to={`/lab?lesson=${lesson.id}`}
                className="group flex items-start gap-4 px-5 py-4 transition-colors duration-150 hover:bg-surface-2 focus-visible:-outline-offset-2"
              >
                <span className="font-mono text-xs leading-6 text-ink-3 tabular">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-6 font-medium text-ink">{lesson.title}</span>
                  <span className="mt-0.5 hidden text-sm leading-6 text-ink-3 sm:block">
                    {lesson.description}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs leading-6 text-ink-3 tabular">
                  {lesson.discoveries.length} keşif
                </span>
                <ArrowRight
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="mt-1 size-4 shrink-0 text-ink-3 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            </li>
          ))}
        </ol>
      }
      actions={
        <>
          <Button asChild size="lg" variant="outline">
            <Link to="/collection">
              <BookMarked strokeWidth={1.75} />
              Deftere git
            </Link>
          </Button>
          <Button asChild variant="link">
            <Link to="/nasil">
              El kitabı
              <ArrowRight strokeWidth={1.75} />
            </Link>
          </Button>
        </>
      }
    >
      <p>
        Laboratuvarda bulduğun her molekül defterine eklenir. {lessons.length}{" "}
        rota seni konudan konuya götürür: her birinde birkaç keşif ve kısa
        sorular var.
      </p>
      <p>
        Hesapsız defter bu tarayıcıda durur. JSON olarak indirip başka bir
        tarayıcıya geri yükleyebilirsin.
      </p>
    </FeatureSection>
  );
}
