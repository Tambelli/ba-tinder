import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetCents, escapeHtml, nextStages } from "../src/assets/domain.js";
test("conversão monetária exata e limites", () => {
  assert.equal(budgetCents("10000.01"), 1000001);
  assert.equal(budgetCents("1.10"), 110);
  for (const v of ["0", "-2", "1.001", "NaN", "1e4", "1000001"])
    assert.throws(() => budgetCents(v));
});
test("conteúdo de usuários não pode injetar HTML", () =>
  assert.equal(
    escapeHtml("<img src=\"x\" onerror='x'>&"),
    "&lt;img src=&quot;x&quot; onerror=&#39;x&#39;&gt;&amp;",
  ));
test("aceite de creator no app não pode ser registrado pela operação", () => {
  assert.deepEqual(
    nextStages({ status: "CONTACTING", matchMode: "DOUBLE_OPT_IN" }),
    ["AWAITING_CREATOR", "CANCELLED"],
  );
  assert.deepEqual(nextStages({ status: "CLOSED", matchMode: "MEDIATED" }), []);
});
