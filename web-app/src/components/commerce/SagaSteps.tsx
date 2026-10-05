import { RotateCcw } from "lucide-react";
import { orderStatusLabel } from "../../services/api";
import { ORDER_FLOW } from "./model";

/** What happens at each saga status, in plain words. */
const STEP_TEXT: Record<(typeof ORDER_FLOW)[number], string> = {
  Submitted:
    "Sipariş alınır. Sepetteki her satır ayrı bir siparişe dönüşür; Idempotency-Key aynı isteğin iki kez işlenmesini önler.",
  StockReserved: "Envanter gramı ayırır, ardından cüzdandan kredi düşülür.",
  Shipping: "Ödeme onaylanınca sanal bir kargo numarası verilir. Fiziksel gönderim yok.",
  Completed: "Gramlar kasana yazılır; piyasa sayfasından geri satabilirsin.",
};

/**
 * The order saga as a four-step diagram (same labels and statuses as the order lists)
 * plus the compensation path taken when a step fails.
 */
export function SagaSteps() {
  return (
    <div className="panel p-5 md:p-6">
      <ol className="grid gap-6 md:grid-cols-4 md:gap-4">
        {ORDER_FLOW.map((status, index) => (
          <li key={status} className="relative flex gap-4 md:flex-col md:gap-3">
            {index < ORDER_FLOW.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-9 bottom-[-1.5rem] left-4 w-px bg-line-strong md:top-4 md:right-[-1rem] md:bottom-auto md:left-9 md:h-px md:w-auto"
              />
            )}
            <span className="relative grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-2 font-mono text-[13px] text-ink tabular">
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-ink">
                {orderStatusLabel[status]}
              </h3>
              <p className="font-mono text-xs text-ink-3">{status}</p>
              <p className="mt-2 text-sm leading-6 text-ink-2">{STEP_TEXT[status]}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex gap-3 rounded-lg border border-dashed border-danger/35 bg-danger-soft/40 p-4">
        <RotateCcw
          aria-hidden="true"
          strokeWidth={1.75}
          className="mt-0.5 size-4 shrink-0 text-danger"
        />
        <div className="text-sm leading-6 text-ink-2">
          <p className="font-medium text-ink">
            {orderStatusLabel.Failed}{" "}
            <span className="font-mono text-xs font-normal text-ink-3">
              Failed · Compensated
            </span>
          </p>
          <p>
            Bir adım başarısız olursa önceki adımlar geri alınır: ayrılan stok bırakılır,
            düşülen kredi cüzdana iade edilir.
          </p>
        </div>
      </div>
    </div>
  );
}
