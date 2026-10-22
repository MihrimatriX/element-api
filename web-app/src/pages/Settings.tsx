import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, KeyRound, LockKeyhole, Wallet } from "lucide-react";
import Seo from "../components/Seo";
import { accountRequest } from "../components/auth/accountApi";
import { DataExportSettings } from "../components/auth/DataExportSettings";
import { DeleteAccountSettings } from "../components/auth/DeleteAccountSettings";
import { PasswordSettings } from "../components/auth/PasswordSettings";
import {
  ProfileSettings,
  type AccountProfile,
} from "../components/auth/ProfileSettings";
import { SettingsSection } from "../components/auth/SettingsSection";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { LinkCard } from "../components/ui/link-card";
import { PageHeader } from "../components/ui/page-header";
import { useSelectedElement } from "../context/selection";
import { useAuthCapabilities } from "../hooks/useAuthCapabilities";

const PROFILE_TIMEOUT_MS = 10_000;

/** Loads `GET /auth/profile` while signed in; `retry` asks again after a failure. */
function useProfile(enabled: boolean) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    accountRequest<AccountProfile>("/auth/profile", {
      signal: controller.signal,
      timeoutMs: PROFILE_TIMEOUT_MS,
    })
      .then((response) => {
        if (!response.ok || !response.data)
          throw new Error(`HTTP ${response.status}`);
        setProfile(response.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [enabled, attempt]);

  return {
    profile,
    failed,
    retry() {
      setFailed(false);
      setAttempt((count) => count + 1);
    },
  };
}

/** Account settings: profile, e-mail verification, password, keys, data export and deletion. */
export default function Settings() {
  const { isAuthenticated } = useSelectedElement();
  const { loading: capabilitiesLoading, capabilities } = useAuthCapabilities({
    enabled: isAuthenticated,
  });
  const { profile, failed, retry } = useProfile(isAuthenticated);

  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="Hesap ayarları · ElementAPI"
        description="Profil, şifre ve hesap verisi."
        path="/settings"
        noIndex
      />
      <PageHeader
        eyebrow="Hesap"
        title="Ayarlar"
        lead="Profil, güvenlik ve hesap verilerin. Şifre değiştirmek keşif defterine dokunmaz."
        actions={
          isAuthenticated && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link to="/collection">
                  <BookOpen strokeWidth={1.75} /> Defterim
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/account">
                  <Wallet strokeWidth={1.75} /> Hesabım
                </Link>
              </Button>
            </>
          )
        }
      />

      {isAuthenticated ? (
        <div className="mt-10 divide-y divide-line border-y border-line">
          <ProfileSettings
            profile={profile}
            failed={failed}
            onRetry={retry}
            emailVerification={
              capabilitiesLoading ? null : capabilities.emailVerification
            }
          />
          <PasswordSettings />
          <SettingsSection
            title="API anahtarları"
            description="Anahtarlar, webhook adresleri ve sanal cüzdan hesap sayfasında yönetilir."
          >
            <LinkCard
              to="/account"
              icon={KeyRound}
              title="Hesabım"
              description="Cüzdan, API anahtarları ve webhook adresleri."
              meta="/account"
            />
          </SettingsSection>
          <DataExportSettings />
          <DeleteAccountSettings />
        </div>
      ) : (
        <EmptyState
          icon={LockKeyhole}
          title="Ayarlarını görmek için giriş yap"
          className="mt-12"
          actions={
            <>
              <Button asChild>
                <Link to="/login?returnTo=/settings">Giriş yap</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/register?returnTo=/settings">Hesap aç</Link>
              </Button>
            </>
          }
        >
          <p>Profil, şifre ve hesap verilerin hesabına bağlıdır.</p>
        </EmptyState>
      )}
    </main>
  );
}
