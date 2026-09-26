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
  await orders.createOrderWithSaga({
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
  await orders.createOrderWithSaga({
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
  await orders.createOrderWithSaga({
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
