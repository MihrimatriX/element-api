# ElementAPI — yerel sunum

Bu sürümün odağı Türkçe kimya keşfi: kaynaklı atlas → laboratuvar → öğrenme rotası → koleksiyon. Kullanıcının tercihi doğrultusunda internet yayını yapılmadı.

## Açılış (tam platform)

Docker Desktop gerekir. Repo kökünde:

```powershell
./deploy/scripts/present-platform.ps1
```

Tarayıcı: **http://localhost:3000**. Her servis kendi konteynerinde. Hazır imajlarla: `-NoBuild`. Durdur: `./deploy/scripts/stop-local.ps1`.

Kayıt ol → laboratuvarda suyu keşfet → farklı tarayıcıda giriş yapıp koleksiyonu gör → Diğer/Demo üzerinden sanal mağazayı aç. İşlemler sanal KREDI ile yapılır. SMTP henüz yapılandırılmadığı için e-posta gönderimi kapalıdır.

## Bağımsız atlas

DB/broker istemiyorsan:

```powershell
./deploy/scripts/present-local.ps1
```

**http://127.0.0.1:5080** — tek science imajı; hesap/ticaret kapalı; misafir koleksiyonu çalışır.

Bu adres yalnız bu bilgisayardan erişilebilir. `localhost` ve `127.0.0.1` ayrı tarayıcı depolarıdır. Koleksiyonun JSON aktarımı adres/cihaz değişiminde kullanılabilir.

## Üç dakikalık ürün gösterimi

| Süre | Göster | Anlatılacak değer |
|---|---|---|
| 0:00–0:30 | Ana sayfada Demir ara, önizlemeyi ve ayrıntısını aç | Bir sembolden Türkçe açıklamaya, fotoğrafa ve kaynağa ulaşma |
| 0:30–1:15 | Laboratuvarda H + O seç, Birleştir | İlk anlamlı keşif: su ve formülü; hesap gerekmez |
| 1:15–2:00 | C + O ve N + H keşfet | Keşiflerle açılan yeni elementler ve ilerleme |
| 2:00–2:30 | Koleksiyonum → Günlük maddeler sorusu | Kart toplamanın öğrenme kontrolüne dönüşmesi |
| 2:30–3:00 | Yenile, koleksiyonu indir; kaynak kapsamını aç | Kalıcı ilerleme, taşınabilir veri ve bilginin dayanağı |

Hazır cevap ezberletmek yerine soru sor: “H₂O'daki 2 neyi gösteriyor?” Laboratuvar kartlarının miktar veya deney talimatı olmadığını arayüzdeki açıklamadan göster.

## Beş dakikalık teknik anlatım

1. `/docs` üzerinde açık v2 API'ye gerçek istek gönder. `fields=symbol,names` ile yanıtı küçült. Şema ve kaynak kapsamı bağlantılarını göster.
2. Bağımsız scientific host'un dosyadan okuduğunu, veritabanı veya kuyruk arızasının atlası kapatmadığını anlat (`present-local`).
3. `/demo` üzerinden sanal ticaretin ayrı kapsamını göster.
4. Test kanıtını göster: entegrasyon testleri gerçek PostgreSQL/Redis/RabbitMQ test konteynerlerine dayanır.
5. Hesap eşitlemesi, şifre değişince oturum/anahtar iptali ve misafir aktarımı kararlarını açıkla.

## Deneme ve geri bildirim

`/feedback` sayfasında isteğe bağlı yerel olay kaydını aç. Açılmadan önce olay toplanmaz. Son 200 olay cihazda tutulur; notlarla birlikte JSON indirilebilir. Kapatma kayıtları siler. Sunucuya analiz verisi gönderilmez.
