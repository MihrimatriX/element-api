# Açık işler ve sınırlar — 2 Ekim 2026

Esas kaynak: kök README'deki [Eksikler…](../../README.md#eksikler-ve-yapmak-istediklerimiz) bölümü ve [TODO.md](../../TODO.md).

## Sahip kararı bekleyen

- `/kilavuz` yerel varsayılan sırları gösteriyor: [altyapi.md](../kilavuz/altyapi.md) "Yapılandırma" tablosu compose'un yerel varsayılanlarını yazar: `POSTGRES_PASSWORD=mysecretpassword`, `RABBITMQ_DEFAULT_USER/PASS=guest/guest`, `INTERNAL_API_KEY=element-internal-dev-key`, `JWT_SECRET=ChangeMeInProduction_...`. Sayfa web paketine (`guide.json`) girer ve public sitede `/kilavuz/altyapi` adresinden okunur. Public overlay `JWT_SECRET` ve `INTERNAL_API_KEY` için değer zorunlu tutar (`${VAR:?}`) ve `present-public.ps1 -Server` 32 karakterden kısa ya da yer tutucu sırrı reddeder; Postgres/RabbitMQ şifresi zorunlu değildir ama portları dışarı kapalıdır. Yani doğru kurulmuş public yığında doğrudan sızıntı yok; yanlış yapılandırılmış bir kurulum için ise hazır bir liste. Seçenekler: (a) olduğu gibi bırak, (b) tabloda değerleri "yerel varsayılan, bkz. `docker/.env.example`" diye kısalt, (c) `altyapi` sayfasını public derlemeden çıkar.

## Yayın — operatör kalan

- DNS + TLS: `elements-api.ahmetfuzunkaya.com` hâlâ NXDOMAIN (2 Ekim 2026, 8.8.8.8). Apex Hostinger (`145.14.158.207`, NS dns-parking). A kaydı hPanel'de; deploy host IP seçilmeli (apex shared hosting ≠ bu stack). Probe: `deploy/scripts/probe-dns.ps1`. Runbook: [ops/DNS-TLS.md](../ops/DNS-TLS.md).
- Jenkins Multibranch: `Jenkinsfile` artık uzak `main`'de. Yerel controller `:8085` (admin `docker/.jenkins-local-admin.txt`), job `element-api` seed edildi. Kalan: `github-element-api` kimliği (PAT; anonim API hız sınırı beklemelerini önler), agent araç zinciri (Node/.NET/JDK/pwsh) ve ilk yeşil derleme; bunlar bu turda doğrulanmadı. Jenkins Playwright aşaması yalnız `test:e2e` koşar; `e2e-auth` ve `e2e-live` elle veya `test-all.ps1 -Browser` / `-Live` ile. [CI-JENKINS.md](../CI-JENKINS.md).
- Turnstile: anahtarlar boş olduğu için captcha kapalı. Cloudflare widget anahtarları kullanıcıda (`VITE_CAPTCHA_SITE_KEY` derleme anı, `CAPTCHA_SECRET_KEY` identity). [ops/TURNSTILE.md](../ops/TURNSTILE.md).
- Sırlar: `docker/.env.public.prod` yerelde üretildi (gitignore; JWT/INTERNAL/DB/Rabbit güçlü). SMTP boş (e-postasız beta). Sunucu şablonu: `fill-public-prod-env.ps1 -ServerTemplate`.
- Auth XSS kalıntısı: JWT ve API anahtarı hâlâ `localStorage`'da; bkz. runbook [AUTH-XSS.md](../runbooks/AUTH-XSS.md) + cookie backlog (hedef 2026-12-31).
- Geçmişte demo şifresi: eski `register_payload.json` commit'leri; dosya silindi. Gerçek host'ta kullanıldıysa değiştir.

## Bilinçli sınırlar (düzeltme değil)

- Observability: `/metrics` `/health-ui` 404 döner (ADR 0001). Correlation: `X-Request-Id`.
- Java wallet/inventory: Java'da kalır (ADR 0002). Notification kalıcı retry P3'e ertelendi.
- Fotoğraf: 75/118; kötü lisanslı görselle doldurulmaz.
- v2 açık: hız sınırı ve isteğe bağlı Cloudflare proxy.
- SEO/OG: Vite SPA; JS çalıştırmayan crawler'lar derin rota meta'sı yerine `index.html` + çalışma anı `__SITE_URL__` alır. Ayrı yasal sayfa rotası yok (API şartları docs'ta).

## Çalışma ağacı

2 Ekim 2026 işleri `redesign` dalında commit'li; `main`'e birleşmedi. Kullanıcı istemeden merge/push yok.
