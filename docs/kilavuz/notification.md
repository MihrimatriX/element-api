# Bildirim servisi (notification-service)

> Sipariş durumu her değiştiğinde, siparişin sahibi olan müşterinin kayıtlı HTTPS adreslerine imzalı bir `order.updated` webhook'u gönderir.

| Özellik | Değer |
|---|---|
| Teknoloji | .NET 10, ASP.NET Core, MassTransit + RabbitMQ, HttpClient |
| Port | `127.0.0.1:5006` (Docker Compose, yalnız bu makineden; konteyner içi `8080`; gateway yönlendirmez) · yerel `dotnet run`: `5062` |
| Klasör | `notification-service/` |
| Veri | yok (webhook kayıtları identity-service'te tutulur) |
| Mesajlaşma | yayınlar: yok (yalnızca HTTPS webhook `order.updated`) · dinler: UpdateOrderStatusEvent |

## Ne işe yarar?

order-service saga'sı bir siparişin durumunu her değiştirdiğinde (Submitted, Shipping, Completed, Failed …) `UpdateOrderStatusEvent` yayınlar. Bu servis olayı `notification-order-updates` kuyruğundan alır ve müşteriye haber verir. Kendi veritabanı yoktur; kime haber verileceğini her seferinde identity-service'e sorar.

Akış şöyledir: olayda müşteri kimliği yoksa hiçbir şey gönderilmez, çünkü sipariş bilgisi yalnızca sahibine gidebilir. Müşteri varsa identity-service'in iç ucu `GET /api/v1/internal/webhooks?event=order.updated&customerId=…` `INTERNAL_API_KEY` başlığıyla çağrılır. Bu çağrı başarısız olursa (bağlantı hatası, 401, 5xx) henüz hiçbir şey gönderilmediği için hata fırlatılır: MassTransit olayı 5, 15, 30 ve 60 saniye arayla (toplam ~110 sn) yeniden dener, yine olmazsa `notification-order-updates_error` kuyruğuna bırakır; olay sessizce kaybolmaz. Dönen hook'lardan en çok 10 tanesine (`MaxHooksPerEvent`; fazlası için uyarı loglanır) paralel gönderilir. JSON gövde (`OrderId`, `Status`, `ErrorMessage`, `TrackingNumber`, `Timestamp`) hook'un gizli anahtarıyla HMAC-SHA256 imzalanır ve `X-Element-Signature` + `X-Element-Event` başlıklarıyla POST edilir. `Timestamp` (unix saniye) imzalı gövdenin içindedir; alıcı eski veya tekrar oynatılan teslimleri reddedebilir. Başarısız gönderim 10 saniye sonra bir kez daha denenir; bu bekleme sırasında RabbitMQ mesajı onaylanmamış kalır. Paralel gönderim sayesinde bir olay en kötü durumda tek hook'un süresi kadar (4 + 10 + 4 sn) sürer.

Güvenlik (SSRF koruması): yalnızca `https://` adreslerine ve içinde `kullanıcı:parola@` olmayan URL'lere gönderilir. Özel adres kontrolü yalnızca bağlantı anında, gerçekten bağlanılacak IP'ler üzerinde yapılır (DNS rebinding için arada boşluk kalmaz): host çözülen adreslerden biri bile genel değilse bağlantı reddedilir. IPv4'te 0/8, 10/8, 127/8, 169.254/16, 172.16/12, 192.168/16, 192.0.0/24, 198.18/15, 100.64/10 ve 224 ile üstü (çok noktaya yayın, ayrılmış, yayın) engellenir; IPv6'da yalnızca genel unicast `2000::/3` serbesttir (loopback, `::`, ULA — AWS IMDS `fd00:ec2::254` dahil —, link-local, çok noktaya yayın, IPv4-uyumlu `::a.b.c.d` ve NAT64 `64:ff9b::/96` engellenir). IPv4-mapped IPv6 adresleri önce IPv4'e çevrilir. Yönlendirme izlenmez, proxy kullanılmaz, cevap gövdesi okunmaz (yalnız başlıklar). Hata loglarına URL'nin yalnız host kısmı yazılır, çünkü yol/sorgu kısmı çoğu zaman bir sırdır.

Bilerek yapmadıkları: e-posta, SMS veya anlık bildirim göndermez; sipariş oluşturmaz veya değiştirmez; canlı fiyat yayını yapmaz; dışarıya iş amaçlı HTTP API sunmaz (yalnızca `/info` ve `/health` uçları vardır); CORS tanımlamaz (tarayıcıdan çağrılmaz).

## Uç noktalar

| Yöntem | Yol | Yetki | Ne yapar |
|---|---|---|---|
| GET | `/info` | Herkese açık | Servis adı, sürümü ve ortamı döner. |
| GET | `/health/live` | Herkese açık | Süreç ayakta mı (bağımlılık kontrolü yok). |
| GET | `/health/ready` | Herkese açık | MassTransit'in `masstransit-bus` kontrolü: alıcı uç RabbitMQ'ya bağlanana kadar 503, yeniden bağlanınca tekrar sağlıklı. Her yoklamada ayrıca AMQP bağlantısı açılmaz. |
| GET | `/health` | Herkese açık | `/health/ready` ile aynı. |

## Mesajlar

| Yön | Olay | Ne zaman | Ne yapar |
|---|---|---|---|
| Dinler | `UpdateOrderStatusEvent` | Order saga sipariş durumunu her değiştirdiğinde (`notification-order-updates`) | Müşterinin `order.updated` webhook'larını identity'den alır ve en çok 10 tanesine paralel, imzalı POST gönderir; liste alınamazsa yeniden denenir, sonunda `notification-order-updates_error` kuyruğuna düşer. |
| Yayınlar | `order.updated` (HTTPS webhook, RabbitMQ değil) | Yukarıdaki olay müşteri kimliğiyle geldiğinde | Müşterinin sunucusuna sipariş numarası, durum, hata mesajı, takip numarası ve imzalı `Timestamp` iletir. |

## Kod haritası

### `notification-service/Element.Services.Notification.API/Program.cs`
Servisi ayağa kaldıran başlangıç kodu: loglama, iki adlandırılmış HttpClient, RabbitMQ tüketicisi ve sağlık uçları burada bağlanır.

| Fonksiyon | Ne yapar |
|---|---|
| Üst düzey başlangıç kodu | Serilog'u açar, `WebhookFanout`'u tekil kaydeder, `webhooks` (yalnız genel adreslere bağlanan, yönlendirmesiz, proxysiz) ve `webhooks-internal` istemcilerini 4 sn zaman aşımıyla tanımlar, sağlık kontrollerini açar (RabbitMQ kontrolünü MassTransit kaydeder), kapanma süresini 8 sn ile sınırlar (Docker'ın 10 sn SIGTERM→SIGKILL penceresi; onaylanmamış mesajlar kuyruğa döner), tüketiciyi `notification-order-updates` kuyruğuna 5/15/30/60 sn yeniden deneme aralıklarıyla bağlar ve `/info` + `/health` uçlarını kurar. |

### `notification-service/Element.Services.Notification.API/Consumers/UpdateOrderStatusConsumer.cs`
Sipariş durum olayını webhook gönderimine çeviren RabbitMQ tüketicisi.

| Fonksiyon | Ne yapar |
|---|---|
| `UpdateOrderStatusConsumer(webhooks, logger)` | Webhook göndericisini ve logger'ı alır. |
| `Consume(context)` | Olayı loglar; müşteri kimliği yoksa durur, varsa `OrderId`, `Status`, `ErrorMessage`, `TrackingNumber` ve o anki `Timestamp` (unix saniye) içeren gövdeyi `order.updated` olarak o müşterinin webhook'larına gönderir. |

### `notification-service/Element.Services.Notification.API/Webhooks/WebhookFanout.cs`
Webhook listesini identity'den alıp en çok 10 adrese paralel, imzalı ve SSRF korumalı POST gönderen sınıf.

| Fonksiyon | Ne yapar |
|---|---|
| `MaxHooksPerEvent` | Bir olayın gönderileceği en fazla hook sayısı (10). |
| `PublicClientName` / `InternalClientName` | Adlandırılmış HttpClient adları: müşteri webhook'ları için `webhooks`, identity iç ucu için `webhooks-internal`. |
| `WebhookFanout(httpFactory, configuration, logger)` | HttpClient fabrikasını, yapılandırmayı ve logger'ı alır. |
| `PublishAsync(eventName, payload, ct, customerId)` | Abonelikleri yükler (başarısızsa hata fırlatır), 10'dan fazlaysa uyarı loglar, gövdeyi bir kez JSON'a çevirir ve ilk 10 hook'a paralel gönderir. |
| `ConnectPublicAsync(context, ct)` | `webhooks` istemcisinin bağlantı adımı: hostu kendisi çözer, adreslerden biri bile özelse bağlanmayı reddeder, sonra adresleri sırayla dener. Özel adres kontrolünün yapıldığı tek yer burasıdır. |
| `IsPrivate(ip)` | Webhook'un gitmemesi gereken her adres için true döner (IPv4-mapped IPv6 önce IPv4'e çevrilir, sonra aileye göre aşağıdaki iki kontrole gider). |
| `IsNonGlobalIPv6(octets)` | IPv6 adres genel unicast `2000::/3` dışındaysa true döner. |
| `IsPrivateIPv4(octets)` | IPv4 adresin özel, loopback, link-local, CGNAT, benchmark (198.18/15), IETF (192.0.0/24), çok noktaya yayın veya ayrılmış aralıklardan birinde olup olmadığını söyler. |
| `LoadHooksAsync(eventName, customerId, ct)` | identity-service'in iç webhook ucunu `INTERNAL_API_KEY` başlığıyla çağırır; başarısız yanıtta `HttpRequestException` fırlatır (olay yeniden denensin diye). |
| `DeliverWithRetryAsync(hook, eventName, body, ct)` | Tek hook'a gönderir; başarısızsa 10 sn bekleyip bir kez daha dener. |
| `TrySendAsync(hook, eventName, body, ct)` | Tek bir hook'a imzalı POST gönderir ve yalnız yanıt başlıklarını bekler; gönderim başarısız olursa (özel adres reddi dahil) host'u loglayıp false (tekrar denenir), geçersiz URL'de true (atlandı) döner. |
| `IsAllowedWebhookUrl(url, destination)` | URL'nin mutlak, `https` ve içinde kullanıcı bilgisi olmayan bir adres olduğunu kontrol eder. |
| `ComputeSignature(secret, body)` | Gövde baytlarının hook gizli anahtarıyla HMAC-SHA256 özetini küçük harfli hex olarak üretir. |
| `Hook` | identity'den gelen tek bir abonelik (`Url`, `Secret`, `Events`). |

### `notification-service/Element.Services.Notification.API/appsettings.json`
Log seviyeleri, `AllowedHosts`, yerel geliştirme için `IdentityServiceInternalUrl` ve geliştirme `INTERNAL_API_KEY` değeri; `appsettings.Development.json` yalnızca log ayarlarını tekrarlar.

### `notification-service/Element.Services.Notification.API/Properties/launchSettings.json`
Yerel çalıştırma profilleri: `http://localhost:5062` ve `https://localhost:7163`, ortam `Development`.

### `notification-service/Element.Services.Notification.API/Dockerfile`
Önce yalnız proje dosyalarıyla `restore`, sonra kaynakla tek adımda `publish` yapar; `aspnet:10.0` imajında root olmayan `$APP_UID` kullanıcısıyla 8080 portundan çalıştırır; sağlık kontrolü için `curl` kurar.

## Yapılandırma

| Değişken | Varsayılan | Ne işe yarar |
|---|---|---|
| `IdentityServiceInternalUrl` | `http://localhost:5001` (Compose'ta `http://identity-service:8080`) | Webhook listesinin alındığı identity-service adresi. |
| `INTERNAL_API_KEY` | kodda boş, `appsettings.json`'da `element-internal-dev-key` | identity iç ucuna gönderilen servisler arası anahtar; `Production` ortamında 32 karakterden kısa veya geliştirme değeri ise servis açılmaz. |
| `RabbitMQ:Host` (`RabbitMQ__Host`) | `localhost` | RabbitMQ sunucusu. |
| `RabbitMQ:Port` | `5672` | RabbitMQ portu. |
| `RabbitMQ:Username` | `guest` | RabbitMQ kullanıcı adı. |
| `RabbitMQ:Password` | `guest` | RabbitMQ parolası. |
| `ASPNETCORE_ENVIRONMENT` | `Production` (Compose'ta `${ASPNETCORE_ENVIRONMENT:-Development}`) | `Production` ise ortak koruma geliştirme anahtarlarını reddeder. |

## Testler

- `deploy/tests/Element.Services.UnitTests/Notification/WebhookFanoutTests.cs`:
  - `BlocksPrivateDestinations`: IPv4 özel/loopback/link-local/CGNAT/benchmark/IETF/çok noktaya yayın/yayın adreslerinin (ör. 127.0.0.1, 10.1.2.3, 169.254.169.254, 0.0.0.0, 198.18.0.1, 255.255.255.255) ve IPv6 tarafında ::1, ::, fc00::1, fe80::1, ff02::1, `::ffff:` ve `::` ile gömülü IPv4, NAT64 `64:ff9b::…` ve AWS IMDS `fd00:ec2::254` adreslerinin engellendiğini doğrular.
  - `AllowsPublicDestinations`: 8.8.8.8, 100.63.255.255, 172.32.0.1, 2606:4700:4700::1111 ve ::ffff:8.8.8.8 gibi genel adreslerin engellenmediğini doğrular.
  - `OneEventReachesAtMostTheHookCap`: 15 abonelik dönse bile bir olayın tam `MaxHooksPerEvent` (10) hook'a gönderildiğini doğrular.
  - `DeliveryNamesOnlyCurrentEventAndSignsExactBody`: ağa çıkmadan (sahte HttpClient'larla) `X-Element-Event` başlığının yalnızca gönderilen olayı taşıdığını ve `X-Element-Signature` değerinin gövdenin tam HMAC-SHA256 imzası olduğunu doğrular.
  - `SubscriptionLookupFailureThrowsSoTheEventIsRetried`: identity iç ucu 503 dönünce `HttpRequestException` fırlatıldığını ve hiçbir webhook gönderilmediğini doğrular.

Birim testlerini çalıştırmak için:

```bash
dotnet test deploy/tests/Element.Services.UnitTests/Element.Services.UnitTests.csproj --filter "Category!=Integration"
```

Yalnızca bu servisin testleri:

```bash
dotnet test deploy/tests/Element.Services.UnitTests/Element.Services.UnitTests.csproj --filter "FullyQualifiedName~Element.Services.UnitTests.Notification"
```
