import { Link } from "react-router-dom";
import { BookOpen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Formula } from "@/components/ui/formula";
import { Section } from "@/components/ui/section";
import { catalogSize, knownCompounds } from "@/services/lab";

interface DiscoveryNotebookProps {
  /** Discovered compound slugs. */
  found: string[];
  /** Where progress is stored ("Keşiflerin bu tarayıcıda saklanır."). */
  status: string;
  /** Guests can wipe their browser notebook; signed-in progress is not reset here. */
  canReset: boolean;
  onReset: () => void;
}

/** Discovered compounds in catalogue order, each linking to its record, plus the guest reset. */
export function DiscoveryNotebook({ found, status, canReset, onReset }: DiscoveryNotebookProps) {
  const entries = knownCompounds.filter((c) => found.includes(c.slug));
  const complete = found.length === catalogSize;
  return (
    <Section
      eyebrow="Sonuçlar"
      title={complete ? "Katalog tamamlandı" : "Keşif defteri"}
      description={entries.length > 0 ? `${entries.length} bileşik kaydı açıldı.` : undefined}
      actions={
        canReset &&
        entries.length > 0 && (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm">
                İlerlemeyi sıfırla
              </Button>
            }
            title="Keşif defteri sıfırlansın mı?"
            description="Bu tarayıcıdaki keşif defteri silinecek. Baştan başlamak istiyor musun?"
            confirmLabel="Evet, sıfırla"
            onConfirm={onReset}
          />
        )
      }
    >
      {entries.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {entries.map((compound) => (
            <li key={compound.slug}>
              <Link
                to={`/compound/${compound.slug}`}
                className="focus-ring group flex h-full items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-3 transition-[background-color,border-color,transform] duration-150 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]"
              >
                <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" strokeWidth={2} />
                <Formula value={compound.formula} className="text-[15px] text-ink" />
                <span className="min-w-0 truncate text-[13px] text-ink-2 group-hover:text-ink">
                  {compound.nameTr}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={BookOpen} title="Defter boş" titleAs="h3">
          Yukarıda bir karışım dene; eşleşen molekül burada belirir.
        </EmptyState>
      )}
      <p className="mt-5 text-[13px] leading-5 text-ink-3">
        {status}{" "}
        <Link to="/collection" className="text-link">
          Defterim ve öğrenme rotaları
        </Link>
      </p>
    </Section>
  );
}
