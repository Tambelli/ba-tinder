import { test } from "node:test";
import assert from "node:assert/strict";
import {
  budgetCents,
  nextStages,
  swipeDirection,
  terminal,
} from "../src/domain.ts";
test("conversão monetária exata e limites", () => {
  assert.equal(budgetCents("10000.01"), 1000001);
  assert.equal(budgetCents("1.10"), 110);
  assert.equal(budgetCents("1000000"), 100000000);
  for (const v of ["0", "-2", "1.001", "NaN", "1e4", "1000001", "1,25", ""])
    assert.throws(() => budgetCents(v));
});
test("operação não pode pular a dupla aprovação", () => {
  assert.deepEqual(
    nextStages({ status: "CONTACTING", matchMode: "DOUBLE_OPT_IN" }),
    ["AWAITING_CREATOR", "CANCELLED"],
  );
  assert.deepEqual(
    nextStages({ status: "CONTACTING", matchMode: "MEDIATED" }),
    ["ACCEPTED", "DECLINED", "CANCELLED"],
  );
  assert.deepEqual(nextStages({ status: "CLOSED", matchMode: "MEDIATED" }), []);
});
test("gestos ignoram movimentos curtos e rolagem vertical", () => {
  assert.equal(swipeDirection(140, 20), "interest");
  assert.equal(swipeDirection(-140, 20), "skip");
  assert.equal(swipeDirection(40, 0), null);
  assert.equal(swipeDirection(140, 90), null);
});
test("negociações concluídas não aparecem em andamento", () => {
  assert.equal(terminal("CLOSED"), true);
  assert.equal(terminal("DECLINED"), true);
  assert.equal(terminal("CANCELLED"), true);
  assert.equal(terminal("AWAITING_CREATOR"), false);
});
