import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { KeyValue } from "@/components/ui/key-value";
import { Section } from "@/components/ui/section";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_KEY_ENV } from "@/services/apiDocs";
import { InlineCode } from "./InlineCode";

/** How the keyed v1 endpoints authenticate and how fast they may be called. */
export function KeyedEndpointsSection() {
  return (
    <Section
      id="v1-auth"
      title="Anahtarlı uçlar · v1"
      description="Cüzdan, sipariş ve webhook uçları hesap ister. Bilimsel v2 ile karışmaz."
    >
      <KeyValue
        items={[
          {
            label: "Başlık",
            value: <InlineCode>X-API-Key: &lt;anahtar&gt;</InlineCode>,
          },
          {
            label: "Anahtar",
            value: (
              <>
                <Link to="/account" className="text-link">
                  Hesap sayfasında
                </Link>{" "}
                oluşturulur. Bu tarayıcıda oluşturulan anahtarı tezgâh kendiliğinden kullanır.
              </>
            ),
          },
          {
            label: "Hız sınırı",
            value: (
              <>
                Anahtar başına saniyede 1–10 istek.{" "}
                <InlineCode>X-RateLimit-Limit</InlineCode> ve{" "}
                <InlineCode>X-RateLimit-Remaining</InlineCode> başlıkları kalan
                hakkı gösterir.
              </>
            ),
          },
          {
            label: "Güvenlik",
            value: (
              <>
                Anahtarı istemci koduna, herkese açık depoya veya URL’ye koyma.
                Örnekler onu <InlineCode>{API_KEY_ENV}</InlineCode> ortam
                değişkeninden okur.
              </>
            ),
          },
        ]}
      />
    </Section>
  );
}

const WEBHOOK_EVENTS = [
  { name: "price.updated", body: "{ Symbol, Price, Timestamp }" },
  {
    name: "order.updated",
    body: "{ OrderId, Status, ErrorMessage, TrackingNumber, Timestamp }",
  },
];

/** The two webhook events, their signature and the delivery rules a receiver must follow. */
export function WebhooksSection() {
  const rules = [
    <>
      Her POST <InlineCode>X-Element-Event</InlineCode> başlığını ve gövdenin
      secret ile HMAC-SHA256 imzasını (<InlineCode>X-Element-Signature</InlineCode>,
      küçük harf hex) taşır. İmzayı doğrula.
    </>,
    <>
      <InlineCode>Timestamp</InlineCode> (Unix saniye) 5 dakikadan eskiyse
      isteği reddet.
    </>,
    <>
      Aynı <InlineCode>OrderId + Status</InlineCode> ikinci kez gelirse yok say:
      teslimat en az bir kez yapılır.
    </>,
    "URL, DNS adı olan herkese açık bir HTTPS adresi olmalı; IP adresi, localhost ve özel ağ kabul edilmez.",
    "Hesap başına en çok 10 webhook. Başarısız gönderim 10 saniye sonra bir kez daha denenir.",
    <>
      Kurulum{" "}
      <Link to="/account" className="text-link">
        hesap
      </Link>{" "}
      sayfasından veya <InlineCode>POST /api/v1/webhooks</InlineCode>{" "}
      <InlineCode>{"{ url, events, secret }"}</InlineCode> ile.
    </>,
  ];

  return (
    <Section
      id="webhooks"
      title="Webhooklar"
      description="v1, anahtarlı kurulum. İki olay; her gönderim imzalıdır."
    >
      <div className="panel px-5 py-2 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Olay</TableHead>
              <TableHead>Gövde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {WEBHOOK_EVENTS.map((event) => (
              <TableRow key={event.name}>
                <TableCell className="font-mono text-[13px] whitespace-nowrap text-ink">
                  {event.name}
                </TableCell>
                <TableCell className="font-mono text-[13px] whitespace-nowrap">
                  {event.body}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="mt-6 grid max-w-prose gap-3 text-[15px] leading-7 text-ink-2">
        {rules.map((rule, index) => (
          <li key={index} className="flex gap-3">
            <Check
              aria-hidden="true"
              strokeWidth={1.75}
              className="mt-1.5 size-4 shrink-0 text-success"
            />
            <span className="min-w-0">{rule}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
