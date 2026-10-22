import { CircleAlert, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyValue } from "@/components/ui/key-value";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountAction } from "./accountApi";
import { SettingsSection } from "./SettingsSection";

/** `GET /auth/profile` response. */
export interface AccountProfile {
  email: string;
  firstName: string;
  lastName: string;
  emailConfirmed: boolean;
  createdAt: string;
}

interface ProfileSettingsProps {
  /** `null` while loading. */
  profile: AccountProfile | null;
  failed: boolean;
  onRetry: () => void;
  /** Whether the server can send mail; `null` while unknown. */
  emailVerification: boolean | null;
}

const panelClass = "panel px-5 py-1";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(date);
}

/** Profile facts and the e-mail verification status, as two settings sections. */
export function ProfileSettings({
  profile,
  failed,
  onRetry,
  emailVerification,
}: ProfileSettingsProps) {
  return (
    <>
      <SettingsSection
        title="Profil"
        description="Kayıtta verdiğin ad ve e-posta adresi."
      >
        {failed && (
          <Notice
            tone="danger"
            title="Hesap bilgileri yüklenemedi."
            action={
              <Button variant="outline" size="sm" onClick={onRetry}>
                Yeniden dene
              </Button>
            }
          >
            Bağlantıyı kontrol edip yeniden dene.
          </Notice>
        )}
        {!failed && !profile && <ProfileSkeleton />}
        {profile && (
          <div className={panelClass}>
            <KeyValue
              className="border-t-0 [&>div:last-child]:border-b-0"
              items={[
                {
                  label: "Ad soyad",
                  value: `${profile.firstName} ${profile.lastName}`,
                },
                {
                  label: "E-posta",
                  value: <span className="break-all">{profile.email}</span>,
                },
                { label: "Üyelik", value: formatDate(profile.createdAt) },
              ]}
            />
          </div>
        )}
      </SettingsSection>
      {!failed && (
        <SettingsSection
          title="E-posta doğrulama"
          description="Doğrulanmış adres, hesabın sana ait olduğunu gösterir."
        >
          {profile && emailVerification !== null ? (
            <EmailVerification
              confirmed={profile.emailConfirmed}
              canSendMail={emailVerification}
            />
          ) : (
            <Skeleton className="h-[4.5rem] rounded-xl" />
          )}
        </SettingsSection>
      )}
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className={panelClass}>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="grid grid-cols-[minmax(7rem,2fr)_3fr] gap-4 border-b border-line py-4 last:border-b-0"
        >
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Verified or not, and the button that mails a new verification link when the server can. */
function EmailVerification({
  confirmed,
  canSendMail,
}: {
  confirmed: boolean;
  canSendMail: boolean;
}) {
  const { busy, result, run } = useAccountAction();
  const StatusIcon = confirmed ? CircleCheck : CircleAlert;
  return (
    <div className="grid gap-3">
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="flex items-center gap-2.5 text-sm text-ink">
          <StatusIcon
            aria-hidden="true"
            strokeWidth={1.75}
            className={
              confirmed ? "size-4 text-success" : "size-4 text-warning"
            }
          />
          {confirmed ? "E-posta doğrulandı." : "E-posta henüz doğrulanmadı."}
        </p>
        {!confirmed &&
          (canSendMail ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void run("/auth/email/send-verification")}
            >
              Doğrulama bağlantısı gönder
            </Button>
          ) : (
            <span className="text-[13px] text-ink-3">
              E-posta gönderimi bu kurulumda kapalı.
            </span>
          ))}
      </div>
      {result && (
        <Notice tone={result.ok ? "success" : "danger"}>
          {result.message}
        </Notice>
      )}
    </div>
  );
}
