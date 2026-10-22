import { useState } from "react";
import {
  Download,
  FileJson,
  FlaskConical,
  LoaderCircle,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { KeyValue } from "@/components/ui/key-value";
import { Section } from "@/components/ui/section";
import { toast } from "@/components/ui/toast";
import { Specimen } from "./Specimen";

const CONFIRM_PHRASE = "HESABIMI SİL";

function DeleteAccountDemo() {
  const [typed, setTyped] = useState("");
  return (
    <ConfirmDialog
      title="Hesabın silinsin mi?"
      description="Defterin, API anahtarların ve webhook'ların kalıcı olarak silinir. Bu işlem geri alınamaz."
      confirmLabel="Hesabı sil"
      confirmDisabled={typed !== CONFIRM_PHRASE}
      onConfirm={() =>
        new Promise<void>((resolve) => window.setTimeout(resolve, 900)).then(() => {
          toast("Hesap silindi", { tone: "success", description: "Demo: gerçek bir istek gönderilmedi." });
        })
      }
      onOpenChange={(open) => !open && setTyped("")}
      trigger={
        <Button variant="destructive">
          <Trash2 />
          Hesabı sil
        </Button>
      }
    >
      <Field label={`Onay için ${CONFIRM_PHRASE} yaz`}>
        <Input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
      </Field>
    </ConfirmDialog>
  );
}

/** Buttons, badges, menus, dialogs and toasts. */
export function ActionsSection() {
  return (
    <Section
      id="eylemler"
      eyebrow="02"
      title="Eylemler"
      description="Her görünümde tek birincil eylem (dolu kuprit). Diğerleri çizgili veya hayalet."
    >
      <div className="grid gap-5">
        <Specimen title="Düğme türleri" note="variant">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Bileşiği kaydet</Button>
            <Button variant="outline">Önizle</Button>
            <Button variant="secondary">Filtrele</Button>
            <Button variant="ghost">Vazgeç</Button>
            <Button variant="link">Kaynağı gör</Button>
            <Button variant="destructive">Anahtarı iptal et</Button>
          </div>
        </Specimen>

        <div className="grid gap-5 lg:grid-cols-2">
          <Specimen title="Boyutlar" note="xs · sm · default · lg · icon">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs" variant="outline">Küçük</Button>
              <Button size="sm" variant="outline">
                <Plus />
                Ekle
              </Button>
              <Button>
                <FlaskConical />
                Laboratuvar
              </Button>
              <Button size="lg">Tabloyu aç</Button>
              <Button size="icon-sm" variant="ghost" aria-label="Paylaş">
                <Share2 />
              </Button>
              <Button size="icon" variant="outline" aria-label="İndir">
                <Download />
              </Button>
            </div>
          </Specimen>
          <Specimen title="Durumlar" note="disabled · busy">
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>Gönderiliyor</Button>
              <Button variant="outline" disabled>
                Kapalı
              </Button>
              <Button aria-busy="true">
                <LoaderCircle className="animate-spin" />
                Kaydediliyor
              </Button>
            </div>
          </Specimen>
        </div>

        <Specimen title="Rozetler" note="Badge">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge>Yeni</Badge>
            <Badge variant="secondary">214 bileşik</Badge>
            <Badge variant="outline">v2</Badge>
            <Badge variant="success">Teslim edildi</Badge>
            <Badge variant="warning">Hazırlanıyor</Badge>
            <Badge variant="info">Kargoda</Badge>
            <Badge variant="destructive">İptal</Badge>
          </div>
        </Specimen>

        <Specimen title="Katmanlar" note="Dialog · DropdownMenu · ConfirmDialog · toast()">
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Demir önizlemesi</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <p className="eyebrow">Element 26</p>
                  <DialogTitle>Demir</DialogTitle>
                  <DialogDescription>
                    Yer kabuğunda en bol bulunan dördüncü element; çeliğin ana bileşeni.
                  </DialogDescription>
                </DialogHeader>
                <KeyValue
                  items={[
                    { label: "Atom kütlesi", value: <span className="font-mono tabular">55,845 g/mol</span> },
                    { label: "Grup / periyot", value: <span className="font-mono tabular">8 / 4</span> },
                    { label: "Faz", value: "Katı" },
                  ]}
                />
                <DialogFooter showCloseButton>
                  <Button>Kaydı aç</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download />
                  Dışa aktar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Biçim</DropdownMenuLabel>
                <DropdownMenuItem>
                  <FileJson />
                  JSON indir
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 />
                  Bağlantıyı paylaş
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>CSV (yakında)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DeleteAccountDemo />

            <Button
              variant="secondary"
              onClick={() => toast("Kopyalandı", { tone: "success" })}
            >
              Başarı bildirimi
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                toast("Bağlantı kurulamadı", {
                  tone: "danger",
                  description: "Fiyatlar 30 saniye sonra yeniden denenecek.",
                })
              }
            >
              Hata bildirimi
            </Button>
          </div>
        </Specimen>
      </div>
    </Section>
  );
}
