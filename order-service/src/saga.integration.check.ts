// Real PostgreSQL transactions in an isolated schema. No RabbitMQ or live customer data.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL to the local PostgreSQL test connection.");
const dbUrl = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(dbUrl.hostname))
  throw new Error("Local database required.");
const schema = `saga_test_${randomUUID().replaceAll("-", "")}`;
const admin = new pg.Pool({ connectionString: dbUrl.href });
await admin.query(`CREATE SCHEMA ${schema}`);
process.env.PGOPTIONS = `-c search_path=${schema}`;
const { pool, initDb } = await import("./db/pool.js");
const orders = await import("./db/orders.js");
const { handleSagaMessage } = await import("./saga/orchestrator.js");
const { sweepExpiredSagas } = await import("./saga/timeoutSweeper.js");
const { Order } = await import("./domain/order.js");
type NewOrder = { id: string; customerId: string; elementSymbol: string; quantity: number; totalPrice: number; compoundSlug?: string; productLabel?: string };
const place = (facts: NewOrder) =>
  orders.createOrderWithSaga(
    Order.place({ compoundSlug: null, compoundFormula: null, productLabel: null, ...facts }),
  );
const outboxCount = async (type: string, orderId: string) =>
  (
    await pool.query(
      `SELECT count(*)::int AS c FROM outbox_messages WHERE message_type=$1 AND payload->>'orderId'=$2`,
      [type, orderId],
    )
  ).rows[0].c as number;
let count = 0;
const check = (name: string, test: () => void) => {
  test();
  count++;
  console.log(`PASS ${name}`);
};
const event = (type: string, orderId: string, messageId = randomUUID()) =>
  Buffer.from(
    JSON.stringify({
      messageId,
      messageType: [`urn:message:Element.Shared.Events:${type}`],
      message: { orderId, trackingNumber: "TRK-TEST", reason: "test failure" },
    }),
  );
try {
  assert.equal(
    (await pool.query("SELECT current_schema() AS schema")).rows[0].schema,
    schema,
  );
  await initDb();
  const userId = randomUUID();

  const first = randomUUID();
  await place({
    id: first,
    customerId: userId,
    elementSymbol: "AU",
    quantity: 1,
    totalPrice: 100,
  });
  await handleSagaMessage(event("StockReservedEvent", first));
  assert.equal((await orders.getOrderById(first))?.status, "StockReserved");
  const payReq = await pool.query(
    `SELECT payload FROM outbox_messages WHERE message_type='PaymentRequestedEvent' AND payload->>'orderId'=$1`,
    [first],
  );
  check("stock reserved emits PaymentRequested", () =>
    assert.equal(payReq.rowCount, 1),
  );

  await handleSagaMessage(event("PaymentProcessedEvent", first));
  assert.equal((await orders.getOrderById(first))?.status, "Shipping");
  const failed = event("ShipmentFailedEvent", first);
  await Promise.all([handleSagaMessage(failed), handleSagaMessage(failed)]);
  assert.equal((await orders.getOrderById(first))?.status, "Failed");
  const refunds = await pool.query(
    `SELECT count(*)::int AS c FROM outbox_messages WHERE message_type='PaymentRefundRequestedEvent' AND payload->>'orderId'=$1`,
    [first],
  );
  check("shipment failure requests wallet refund once", () =>
    assert.equal(refunds.rows[0].c, 1),
  );
  await handleSagaMessage(event("ShipmentDispatchedEvent", first));
  assert.equal((await orders.getOrderById(first))?.status, "Failed");
  check("late completion cannot revive a failed order", () => {});

  const second = randomUUID();
  await place({
    id: second,
    customerId: userId,
    elementSymbol: "NA",
    quantity: 10,
    totalPrice: 5,
    compoundSlug: "nacl",
    productLabel: "NaCl",
  });
  await handleSagaMessage(event("StockReservedEvent", second));
  assert.equal((await orders.getOrderById(second))?.status, "StockReserved");
  await handleSagaMessage(event("PaymentProcessedEvent", second));
  assert.equal((await orders.getOrderById(second))?.status, "Shipping");
  await pool.query(
    "UPDATE saga_state SET deadline_at=NOW()-INTERVAL '1 second' WHERE order_id=$1",
    [second],
  );
  await sweepExpiredSagas();
  await sweepExpiredSagas();
  assert.equal((await orders.getOrderById(second))?.status, "Failed");
  check("timeout fails shipping order", () => {});

  const third = randomUUID();
  await place({
    id: third,
    customerId: userId,
    elementSymbol: "NA",
    quantity: 10,
    totalPrice: 5,
    compoundSlug: "nacl",
    productLabel: "NaCl",
  });
  await handleSagaMessage(event("StockReservedEvent", third));
  await handleSagaMessage(event("PaymentProcessedEvent", third));
  const shipped = event("ShipmentDispatchedEvent", third);
  await Promise.all([handleSagaMessage(shipped), handleSagaMessage(shipped)]);
  await handleSagaMessage(event("ShipmentFailedEvent", third));
  assert.equal((await orders.getOrderById(third))?.status, "Completed");
  const assets = await pool.query(
    `SELECT payload FROM outbox_messages WHERE message_type='AssetsCreditedEvent' AND payload->>'orderId'=$1`,
    [third],
  );
  check("completion emits AssetsCredited once", () => {
    assert.equal(assets.rowCount, 1);
    assert.equal(assets.rows[0].payload.compoundSlug, "nacl");
    assert.equal(Number(assets.rows[0].payload.quantity), 10);
  });
  const late = randomUUID();
  await place({
    id: late,
    customerId: userId,
    elementSymbol: "AU",
    quantity: 1,
    totalPrice: 100,
  });
  await handleSagaMessage(event("StockReservedEvent", late));
  await pool.query(
    "UPDATE saga_state SET deadline_at=NOW()-INTERVAL '1 second' WHERE order_id=$1",
    [late],
  );
  await sweepExpiredSagas();
  await handleSagaMessage(event("PaymentProcessedEvent", late));
  const lateRefunds = await pool.query(
    `SELECT count(*)::int AS c FROM outbox_messages WHERE message_type='PaymentRefundRequestedEvent' AND payload->>'orderId'=$1`,
    [late],
  );
  check("late debit after timeout re-requests refund and stays Failed", () =>
    assert.equal(lateRefunds.rows[0].c, 2),
  );
  assert.equal((await orders.getOrderById(late))?.status, "Failed");

  const twice = randomUUID();
  const again = { id: twice, customerId: userId, elementSymbol: "AU", quantity: 1, totalPrice: 100 };
  const placedFirst = await place(again);
  const placedSecond = await place(again);
  const submitted = await outboxCount("OrderSubmittedEvent", twice);
  check("placing the same order id twice stores and announces it once", () => {
    assert.equal(placedFirst, true);
    assert.equal(placedSecond, false);
    assert.equal(submitted, 1);
  });

  // Legacy row above today's credit limit: the Order fails it instead of requesting payment.
  const legacy = randomUUID();
  await place({ id: legacy, customerId: userId, elementSymbol: "AU", quantity: 1, totalPrice: 100 });
  await pool.query("UPDATE orders SET total_price = 60000 WHERE id = $1", [legacy]);
  await handleSagaMessage(event("StockReservedEvent", legacy));
  const legacySaga = await pool.query("SELECT current_state, error_message FROM saga_state WHERE order_id = $1", [legacy]);
  const legacyStatuses = await pool.query(
    `SELECT payload->>'status' AS status FROM outbox_messages
     WHERE message_type='UpdateOrderStatusEvent' AND payload->>'orderId'=$1 ORDER BY created_at`,
    [legacy],
  );
  const legacyPayments = await outboxCount("PaymentRequestedEvent", legacy);
  const legacyReleases = await outboxCount("OrderStockReleaseEvent", legacy);
  check("over-limit order fails with compensation and outbox keeps decision order", () => {
    assert.equal(legacySaga.rows[0].current_state, "Failed");
    assert.equal(legacySaga.rows[0].error_message, "Credit limit exceeded (50000 KREDI limit).");
    assert.equal(legacyPayments, 0);
    assert.equal(legacyReleases, 1);
    assert.deepEqual(legacyStatuses.rows.map((r) => r.status), ["Submitted", "StockReserved", "Failed"]);
  });

  // State, inbox mark and outbox commit or roll back together: make the outbox write fail once.
  const atomic = randomUUID();
  await place({ id: atomic, customerId: userId, elementSymbol: "AU", quantity: 1, totalPrice: 100 });
  await handleSagaMessage(event("StockReservedEvent", atomic));
  await pool.query(`
    CREATE FUNCTION refuse_shipment_request() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.message_type = 'ShipmentRequestedEvent' THEN RAISE EXCEPTION 'outbox down'; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER refuse_shipment_request BEFORE INSERT ON outbox_messages
      FOR EACH ROW EXECUTE FUNCTION refuse_shipment_request();`);
  const paid = event("PaymentProcessedEvent", atomic);
  await assert.rejects(handleSagaMessage(paid), /outbox down/);
  const afterFailure = (await orders.getOrderById(atomic))?.status;
  const inboxAfterFailure = await pool.query("SELECT 1 FROM processed_messages WHERE order_id = $1 AND event_type = 'PaymentProcessedEvent'", [atomic]);
  await pool.query("DROP TRIGGER refuse_shipment_request ON outbox_messages");
  await handleSagaMessage(paid);
  check("failed outbox write rolls back state and inbox; the redelivery succeeds", () => {
    assert.equal(afterFailure, "StockReserved");
    assert.equal(inboxAfterFailure.rowCount, 0);
  });
  assert.equal((await orders.getOrderById(atomic))?.status, "Shipping");
  assert.equal(await outboxCount("ShipmentRequestedEvent", atomic), 1);

  await assert.rejects(
    pool.query("UPDATE orders SET status = 'Lost' WHERE id = $1", [atomic]),
    /orders_valid/,
  );
  check("database refuses an unknown order status", () => {});

  const notifications = await pool.query(
    "SELECT payload FROM outbox_messages WHERE message_type='UpdateOrderStatusEvent'",
  );
  check("private status events always carry their owner", () =>
    assert.ok(notifications.rows.every((r) => r.payload.customerId === userId)),
  );
  console.log(`\n${count} PostgreSQL saga regression checks passed.`);
} finally {
  await pool.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
}
