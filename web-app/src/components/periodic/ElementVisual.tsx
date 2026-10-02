import { useState } from "react";
import { Atom, Image as ImageIcon } from "lucide-react";
import { ExternalLink } from "@/components/ui/external-link";
import { Segmented } from "@/components/ui/segmented";
import type { AtlasMedia } from "@/services/science";
import { ShellDiagram } from "./ShellDiagram";

type VisualMode = "photo" | "shells";

interface ElementVisualProps {
  symbol: string;
  shells?: readonly number[];
  /** Licensed specimen photo, when the atlas has one. */
  photo?: AtlasMedia | null;
}

/**
 * Specimen photo with its credit and licence, switchable to the shell schematic. Falls back to the
 * schematic when there is no photo or the image fails to load.
 */
export function ElementVisual({ symbol, shells, photo }: ElementVisualProps) {
  const [mode, setMode] = useState<VisualMode>("photo");
  const [failedUrl, setFailedUrl] = useState<string>();
  const photoFailed = photo != null && failedUrl === photo.url;
  const shownPhoto = mode === "photo" && !photoFailed ? photo : null;
  const schematicCaption = photoFailed
    ? "Görsel yüklenemedi. Şematik gösterim."
    : "Şematik kabuk modeli, ölçekli değildir.";

  return (
    <figure className="grid gap-3">
      {photo && (
        <Segmented
          label="Görsel türü"
          size="sm"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "photo", label: "Fotoğraf", icon: ImageIcon },
            { value: "shells", label: "Atom şeması", icon: Atom },
          ]}
        />
      )}
      <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-lg border border-line bg-canvas md:aspect-square">
        {shownPhoto ? (
          <img
            src={shownPhoto.url}
            alt={shownPhoto.caption}
            loading="lazy"
            decoding="async"
            width={500}
            height={500}
            onError={() => setFailedUrl(shownPhoto.url)}
            className="size-full object-cover"
          />
        ) : (
          <ShellDiagram symbol={symbol} shells={shells} className="size-[82%]" />
        )}
      </div>
      <figcaption className="text-[13px] leading-5 text-ink-3">
        {shownPhoto ? <PhotoCredit photo={shownPhoto} /> : schematicCaption}
      </figcaption>
    </figure>
  );
}

/** Caption, author link and licence of a photo (both links open in a new tab). */
function PhotoCredit({ photo }: { photo: AtlasMedia }) {
  return (
    <>
      {photo.caption}.{" "}
      <ExternalLink href={photo.source_url}>
        {photo.creator || "Görsel kaynağı"}
      </ExternalLink>
      {" · "}
      {photo.license_url ? (
        <ExternalLink href={photo.license_url}>{photo.license}</ExternalLink>
      ) : (
        photo.license
      )}
    </>
  );
}
