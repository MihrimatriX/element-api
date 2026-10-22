import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AtlasVisual from "@/components/AtlasVisual";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyValue, type KeyValueItem } from "@/components/ui/key-value";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryLabels, familyColor, familyOf, type ElementItem } from "@/services/elementData";
import { formatScience, useScience, type ScientificElement } from "@/services/science";
import { phaseLabel } from "./lenses";

interface ElementPreviewDialogProps {
  element: ElementItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Moves focus back to the tile that opened the dialog. */
  onReturnFocus: () => void;
}

/**
 * Modal preview of one element: summary, key facts and the specimen photo or shell schematic,
 * with a link to the full record. Scrolls inside itself on short screens; nothing is truncated.
 */
export function ElementPreviewDialog({
  element,
  open,
  onOpenChange,
  onReturnFocus,
}: ElementPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel="Önizlemeyi kapat"
        className="gap-0 p-0 sm:max-w-3xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <PreviewBody element={element} />
      </DialogContent>
    </Dialog>
  );
}

function PreviewBody({ element }: { element: ElementItem }) {
  const { data: record, error, retry } = useScience<ScientificElement>(
    "elements",
    element.symbol.toLowerCase(),
  );
  const loadFailed = Boolean(error) && !record;

  return (
    <div
      style={{ "--family": familyColor(familyOf(element.category)) }}
      className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
    >
      <div className="p-6 sm:p-7">
        <p className="eyebrow flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-(--family)" />
          {categoryLabels[element.category]} · {element.atomicNumber}
        </p>
        <DialogTitle className="mt-3 pr-8 text-2xl">
          {record?.names.tr ?? element.name}{" "}
          <span className="font-mono text-xl font-medium text-ink-3">{element.symbol}</span>
        </DialogTitle>
        {record?.names.en && (
          <p className="mt-1 text-[13px] text-ink-3">{record.names.en}</p>
        )}

        <DialogDescription asChild>
          <div className="mt-4 text-[15px] leading-7 text-ink-2">
            {record?.editorial.summary ?? (loadFailed ? null : "Kayıt yükleniyor…")}
          </div>
        </DialogDescription>
        {loadFailed && (
          <Notice
            tone="warning"
            className="mt-4"
            action={
              <Button variant="outline" size="sm" onClick={retry}>
                Yeniden dene
              </Button>
            }
          >
            Ayrıntı yüklenemedi. Temel tabloyu kullanmaya devam edebilirsin.
          </Notice>
        )}

        <KeyValue className="mt-5" items={facts(record)} />

        <Button asChild className="mt-6">
          <Link to={`/element/${element.symbol.toLowerCase()}`}>
            Tam kaydı aç
            <ArrowRight aria-hidden="true" strokeWidth={1.75} />
          </Link>
        </Button>
      </div>

      <div className="border-t border-line bg-canvas-2 p-6 sm:p-7 md:rounded-r-xl md:border-t-0 md:border-l">
        <AtlasVisual
          key={element.symbol}
          symbol={element.symbol}
          shells={record?.atomic_properties.electrons_per_shell}
          photo={record?.media?.photo}
        />
      </div>
    </div>
  );
}

/** Key facts of the record; skeleton values while it loads. */
function facts(record: ScientificElement | undefined): KeyValueItem[] {
  const value = (text: string | null | undefined) =>
    record ? <span className="font-mono tabular">{text ?? "—"}</span> : <Skeleton className="h-4 w-24" />;
  const thermo = record?.thermodynamic_properties;
  const atomic = record?.atomic_properties;
  return [
    { label: "Atom kütlesi", value: value(formatScience(atomic?.atomic_mass, "u")) },
    { label: "Standart hâl", value: record ? phaseLabel(thermo?.standard_state) : value(null) },
    {
      label: "Elektronegatiflik",
      value: value(formatScience(atomic?.electronegativity.pauling)),
      hint: record ? "Pauling ölçeği" : undefined,
    },
    { label: "Elektron dizilimi", value: value(atomic?.electron_configuration.short) },
    { label: "Erime noktası", value: value(formatScience(thermo?.melting_point.c, "°C")) },
    { label: "Yoğunluk", value: value(formatScience(thermo?.density_g_cm3.reported, "g/cm³")) },
  ];
}
