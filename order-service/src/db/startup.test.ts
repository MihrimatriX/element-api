import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isTransientDbError, waitForDatabase } from "./startup.js";

const pgError = (code: string) => Object.assign(new Error(code), { code });

describe("isTransientDbError", () => {
  it("waits for Postgres that is booting, unreachable or not yet in DNS", () => {
    for (const code of ["57P03", "08006", "08001", "53300", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND"]) {
      assert.equal(isTransientDbError(pgError(code)), true, code);
    }
  });

  it("fails fast on errors waiting cannot fix", () => {
    for (const code of ["28P01", "3D000", "42P07", "42601"]) {
      assert.equal(isTransientDbError(pgError(code)), false, code);
    }
    assert.equal(isTransientDbError(new Error("no code")), false);
    assert.equal(isTransientDbError("not an error"), false);
  });
});

describe("waitForDatabase", () => {
  const noSleep = async () => {};

  it("retries transient failures until the database answers", async () => {
    let calls = 0;
    await waitForDatabase(async () => {
      calls += 1;
      if (calls < 3) throw pgError("57P03");
    }, { attempts: 5, delayMs: 0, sleep: noSleep });
    assert.equal(calls, 3);
  });

  it("rethrows a permanent error at once", async () => {
    let calls = 0;
    await assert.rejects(
      waitForDatabase(async () => {
        calls += 1;
        throw pgError("28P01");
      }, { attempts: 5, delayMs: 0, sleep: noSleep }),
      /28P01/,
    );
    assert.equal(calls, 1);
  });

  it("gives up after the last attempt so Docker can restart the service", async () => {
    let calls = 0;
    await assert.rejects(
      waitForDatabase(async () => {
        calls += 1;
        throw pgError("ECONNREFUSED");
      }, { attempts: 4, delayMs: 0, sleep: noSleep }),
      /ECONNREFUSED/,
    );
    assert.equal(calls, 4);
  });
});
