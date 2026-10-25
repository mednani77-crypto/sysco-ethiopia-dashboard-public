import test from "node:test";
import assert from "node:assert/strict";
import { START } from "../src/model";
import {
  initialPeriodSelection,
  masterDateRange,
  periodReducer,
  selectedPeriod,
} from "../src/period";

test("Entry covers June through the latest business date, including stock-only dates", () => {
  const range = masterDateRange([
    "2026-08-31", // sales
    "2026-09-15", // payments
    "2026-10-22", // warehouse receipt
    "2026-06-03", // earliest available business row
  ]);
  assert.deepEqual(selectedPeriod(initialPeriodSelection(), range), {
    from: "2026-06-01",
    to: "2026-10-22",
    branch: "",
    currency: "ETB",
  });
});

test("The current clock and snapshot timestamp are not substituted for business dates", () => {
  assert.deepEqual(masterDateRange(["2026-08-31"]), {
    from: START,
    to: "2026-08-31",
  });
});

test("No valid business dates has a stable boundary and expands on asynchronous arrival", () => {
  const selection = initialPeriodSelection();
  const empty = masterDateRange([
    null,
    "",
    "invalid",
    "2026-02-30",
    NaN,
    1e300,
  ]);
  assert.deepEqual(empty, { from: START, to: START });
  assert.equal(selectedPeriod(selection, empty).to, START);
  assert.equal(
    selectedPeriod(selection, masterDateRange(["2026-10-22"])).to,
    "2026-10-22",
  );
});

test("Valid Sheet serials and calendar dates are normalized; impossible dates are ignored", () => {
  const serial = (Date.UTC(2026, 8, 11) - Date.UTC(1899, 11, 30)) / 86400000;
  assert.deepEqual(
    masterDateRange([serial, "2026/09/15", "2026-09-31", "2026-10-00"]),
    {
      from: START,
      to: "2026-09-15",
    },
  );
  assert.equal(masterDateRange(["2028-02-29", "2028-02-30"]).to, "2028-02-29");
});

test("June follows the available data year and a growing ledger retains its original start", () => {
  assert.equal(masterDateRange(["2027-09-11"]).from, "2027-06-01");
  assert.equal(masterDateRange(["2027-02-11"]).from, START);
  assert.deepEqual(masterDateRange(["2026-06-03", "2027-10-22"]), {
    from: START,
    to: "2027-10-22",
  });
  assert.deepEqual(masterDateRange(["2025-08-01", "2026-05-31"]), {
    from: START,
    to: START,
  });
});

test("Full-period mode follows later dates without a reload", () => {
  const selection = initialPeriodSelection();
  assert.equal(
    selectedPeriod(selection, masterDateRange(["2026-10-22"])).to,
    "2026-10-22",
  );
  assert.equal(
    selectedPeriod(selection, masterDateRange(["2026-10-24"])).to,
    "2026-10-24",
  );
});

test("A manual period survives data refresh and latest-date growth", () => {
  const range = masterDateRange(["2026-10-22"]);
  let selection = initialPeriodSelection();
  selection = periodReducer(selection, {
    type: "date",
    field: "from",
    value: "2026-09-01",
    range,
  });
  selection = periodReducer(selection, {
    type: "date",
    field: "to",
    value: "2026-09-30",
    range,
  });
  assert.deepEqual(selectedPeriod(selection, masterDateRange(["2026-10-24"])), {
    from: "2026-09-01",
    to: "2026-09-30",
    branch: "",
    currency: "ETB",
  });
});

test("A manual choice made before snapshot arrival is preserved", () => {
  const range = masterDateRange([]);
  let selection = initialPeriodSelection();
  selection = periodReducer(selection, {
    type: "date",
    field: "to",
    value: "2026-09-30",
    range,
  });
  selection = periodReducer(selection, {
    type: "date",
    field: "from",
    value: "2026-09-01",
    range,
  });
  assert.equal(
    selectedPeriod(selection, masterDateRange(["2026-10-24"])).to,
    "2026-09-30",
  );
});

test("Reset returns to the latest full period and preserves branch and currency", () => {
  const range = masterDateRange(["2026-10-22"]);
  let selection = initialPeriodSelection();
  selection = periodReducer(selection, {
    type: "date",
    field: "from",
    value: "2026-09-01",
    range,
  });
  selection = periodReducer(selection, { type: "branch", value: "Dire Dawa" });
  selection = periodReducer(selection, { type: "currency", value: "USD" });
  selection = periodReducer(selection, { type: "full" });
  assert.deepEqual(selectedPeriod(selection, masterDateRange(["2026-10-24"])), {
    from: START,
    to: "2026-10-24",
    branch: "Dire Dawa",
    currency: "USD",
  });
});

test("Invalid, empty, reversed and pre-ledger manual ranges are rejected", () => {
  const range = masterDateRange(["2026-10-22"]);
  const selection = initialPeriodSelection();
  for (const value of ["", "bad", "2026-09-31", "2026-05-31", "2026-10-23"])
    assert.equal(
      periodReducer(selection, { type: "date", field: "from", value, range }),
      selection,
    );
  assert.equal(
    periodReducer(selection, {
      type: "date",
      field: "to",
      value: "2026-05-31",
      range,
    }),
    selection,
  );
});

test("A new visit starts in full mode; a deliberate same-value manual choice stays custom", () => {
  const range = masterDateRange(["2026-10-22"]);
  const custom = periodReducer(initialPeriodSelection(), {
    type: "date",
    field: "to",
    value: range.to,
    range,
  });
  const grown = masterDateRange(["2026-10-24"]);
  assert.equal(selectedPeriod(custom, grown).to, "2026-10-22");
  assert.equal(
    selectedPeriod(initialPeriodSelection(), grown).to,
    "2026-10-24",
  );
});
