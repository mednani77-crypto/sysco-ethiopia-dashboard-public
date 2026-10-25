export type Cell = string | number | boolean | null;
export type Snapshot = {
  schemaVersion: number;
  spreadsheetId: string;
  title: string;
  capturedAt: string;
  sheets: { name: string; gid: number; values: Cell[][] }[];
};
export type Row = Record<string, Cell> & {
  _sheet: string;
  _row: number;
  _gid: number;
  _key: string;
};
export type Entry = {
  key: string;
  id: string;
  date: string;
  type: string;
  currency: string;
  branch: string;
  in: number;
  out: number;
  ref: string;
  description: string;
  source: Row;
  bank?: string;
  customer?: string;
  item?: string;
  account?: string;
  internal?: boolean;
};
export type Entity = {
  id: string;
  name: string;
  currency: string;
  branch: string;
  opening: number | null;
  sheetBalance: number | null;
  source: Row;
  kind: "bank" | "customer" | "item" | "account";
  unit?: string;
  smallUnit?: string;
  factor?: number;
  packing?: string;
};
export type Period = {
  from: string;
  to: string;
  branch: string;
  currency: string;
};
export type Ledger = {
  entity: Entity;
  opening: number | null;
  closing: number | null;
  incoming: number;
  outgoing: number;
  undated: number;
  allBalance: number | null;
  difference: number | null;
  lines: (Entry & { balance: number | null })[];
};
export type Issue = {
  id: string;
  severity: "high" | "medium" | "info";
  title: string;
  detail: string;
  source?: Row;
};
export const MASTER_ID = "SYNTHETIC-DEMO";
export const START = "2026-06-01";
export const CORE_SHEETS = [
  "Customers",
  "Banks",
  "Items",
  "customer payments",
  "Expenses",
  "Customer adjustments",
  "Sales invoice",
  "Store",
  "Bank transfers",
  "Accounts",
  "Account movements",
];
export const str = (v: unknown) => (v == null ? "" : String(v).trim());
export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(str(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
export const n = (v: unknown) => num(v) ?? 0;
export const total = <T>(rs: T[], f: (r: T) => number) =>
  rs.reduce((s, r) => s + f(r), 0);
export const fmt = (v: number | null | undefined, d = 2) =>
  v == null
    ? "غير مكتمل"
    : new Intl.NumberFormat("en-US", {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      }).format(Math.abs(v) < 1e-7 ? 0 : v);
export const short = (v: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
export function date(v: unknown): string {
  if (v === "" || v == null) return "";
  const numeric =
    typeof v === "number"
      ? v
      : /^\d{5}(\.\d+)?$/.test(str(v))
        ? Number(v)
        : NaN;
  if (Number.isFinite(numeric)) {
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(numeric) * 86400000)
      .toISOString()
      .slice(0, 10);
  }
  const s = str(v).replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, "$1-$2-$3");
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!match) return "";
  const iso = match[0],
    parsed = new Date(iso + "T00:00:00Z");
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === iso
    ? iso
    : "";
}
export const inPeriod = (d: string, p: Period) =>
  !!d && d >= p.from && d <= p.to;
export const sourceUrl = (r: Row) =>
  `#demo-row-${r._gid}-${r._row}`;
export const branchName = (s: string) =>
  ({
    "Dire Dawa": "دردوا",
    "Addis Ababa": "أديس أبابا",
    Addis: "أديس أبابا",
    Mekel: "مقليه",
    Harar: "هرر",
    "Dase & kombolcha": "داسي وكومبولشا",
    "": "غير محدد",
  })[s] || s;
export function branch(v: unknown) {
  const s = str(v);
  if (/^(addis|addis ababa)$/i.test(s)) return "Addis Ababa";
  if (/^dire dawa$/i.test(s)) return "Dire Dawa";
  return s === "-" ? "" : s;
}
const ROW_IDS: Record<string, string> = {
  Customers: "Customer ID",
  Banks: "Bank ID",
  Items: "Item ID",
  Accounts: "Account ID",
  "customer payments": "Payment ID",
  Expenses: "Expense ID",
  "Customer adjustments": "Adjustment ID",
  "Sales invoice": "Invoice ID",
  Store: "Store ID",
  "Bank transfers": "Transfer ID",
  "Account movements": "Movement ID",
};
const rowId = (r: Row) => str(r[ROW_IDS[r._sheet]]);
export function rows(s: Snapshot, name: string, header = 1): Row[] {
  const sh = s.sheets.find((x) => x.name === name);
  if (!sh) return [];
  const names = (sh.values[header - 1] || []).map(str);
  return sh.values
    .slice(header)
    .map((v, i) =>
      Object.assign(
        Object.fromEntries(names.map((k, j) => [k, v[j] ?? null])),
        {
          _sheet: name,
          _row: header + i + 1,
          _gid: sh.gid,
          _key: `${sh.gid}:${header + i + 1}`,
        },
      ),
    )
    .filter((r) => str(r[ROW_IDS[name] || names[0]]) !== "") as Row[];
}
export const unitName = (v: string) =>
  ({
    Carton: "كرتون",
    Piece: "حبة",
    Bag: "جونية",
    Kintal: "قنطار",
    Dozen: "دزينة",
  })[v] ||
  v ||
  "وحدة";
export function quantity(q: number | null, e: Entity) {
  if (q === null) return "غير مكتمل";
  if (e.packing !== "CONFIRMED" || !e.factor)
    return `${fmt(q, 4)} ${unitName(e.smallUnit || e.unit || "")}`;
  const sign = q < 0 ? "−" : "",
    a = Math.abs(q),
    whole = Math.floor((a + 1e-7) / e.factor),
    rest = a - whole * e.factor;
  return (
    sign +
      [
        whole ? `${fmt(whole, 0)} ${unitName(e.unit || "")}` : "",
        Math.abs(rest) > 1e-6
          ? `${fmt(rest, 3).replace(/\.?0+$/, "")} ${unitName(e.smallUnit || "")}`
          : "",
      ]
        .filter(Boolean)
        .join(" + ") || sign + "0 " + unitName(e.unit || "")
  );
}
export function makeModel(s: Snapshot) {
  const issues: Issue[] = [];
  for (const name of CORE_SHEETS)
    if (!s.sheets.some((x) => x.name === name))
      throw new Error(`صفحة مطلوبة غير موجودة: ${name}`);
  const sets = {
    customers: rows(s, "Customers"),
    banks: rows(s, "Banks"),
    items: rows(s, "Items"),
    payments: rows(s, "customer payments"),
    expenses: rows(s, "Expenses"),
    adjustments: rows(s, "Customer adjustments"),
    sales: rows(s, "Sales invoice"),
    store: rows(s, "Store"),
    transfers: rows(s, "Bank transfers"),
    accounts: rows(s, "Accounts"),
    movements: rows(s, "Account movements"),
  };
  const required: Record<string, string[]> = {
    Banks: ["Bank ID", "Bank Name", "Currency", "Opening Balance", "Balance"],
    Customers: ["Customer ID", "Customer Name", "Opening Balance", "Balance"],
    Items: [
      "Item ID",
      "Item Name",
      "Opening (Small Unit)",
      "Current (Small Unit)",
      "Small / Main",
      "Packing Status",
      "Main Unit",
      "Small Unit",
    ],
    Accounts: [
      "Account ID",
      "Account Name",
      "Opening Balance ETB",
      "Opening Balance USD",
      "Balance ETB",
      "Balance USD",
    ],
    "Account movements": [
      "Movement ID",
      "Date",
      "Account",
      "Bank",
      "Currency",
      "له",
      "عليه",
      "USD له",
      "USD عليه",
    ],
    "Sales invoice": [
      "Invoice ID",
      "Date",
      "Customer",
      "Item",
      "Total",
      "Currency",
    ],
    "customer payments": [
      "Payment ID",
      "Date",
      "Customer",
      "Bank",
      "Amount",
      "Currency",
    ],
    Expenses: ["Expense ID", "Date", "Bank", "Amount", "Currency"],
    "Customer adjustments": [
      "Adjustment ID",
      "Date",
      "Customer",
      "Amount",
      "Currency",
    ],
    Store: [
      "Store ID",
      "Date",
      "Item",
      "Qty In (Small Unit)",
      "Qty Out (Small Unit)",
    ],
    "Bank transfers": [
      "Transfer ID",
      "Date",
      "From Bank",
      "To Bank",
      "Amount",
      "To Amount",
      "From Currency",
      "To Currency",
    ],
  };
  // Validate only schema keys actually used; preserve row identities separately from historical IDs.
  for (const [name, keys] of Object.entries(required)) {
    const sh = s.sheets.find((x) => x.name === name)!;
    for (const k of keys) {
      if (!(sh.values[0] || []).includes(k))
        throw new Error(`تغيرت بنية ${name}: العمود ${k} مفقود`);
    }
  }
  const allRows = Object.values(sets).flat();
  const entities: Entity[] = [];
  for (const r of sets.banks)
    entities.push({
      id: str(r["Bank ID"]),
      name: str(r["Bank Name"]),
      currency: str(r.Currency),
      branch: "",
      opening: num(r["Opening Balance"]),
      sheetBalance: num(r.Balance),
      source: r,
      kind: "bank",
    });
  for (const r of sets.customers)
    entities.push({
      id: str(r["Customer ID"]),
      name: str(r["Customer Name"]),
      currency: "ETB",
      branch: branch(r.Branch),
      opening: num(r["Opening Balance"]),
      sheetBalance: num(r.Balance),
      source: r,
      kind: "customer",
    });
  for (const r of sets.items)
    entities.push({
      id: str(r["Item ID"]),
      name: str(r["Item Name"]),
      currency: "QTY",
      branch: branch(r.Branch),
      opening: num(r["Opening (Small Unit)"]),
      sheetBalance: num(r["Current (Small Unit)"]),
      source: r,
      kind: "item",
      unit: str(r["Main Unit"]),
      smallUnit: str(r["Small Unit"]),
      factor: n(r["Small / Main"]),
      packing: str(r["Packing Status"]),
    });
  for (const r of sets.accounts)
    for (const currency of ["ETB", "USD"])
      entities.push({
        id: str(r["Account ID"]),
        name: str(r["Account Name"]),
        currency,
        branch: "",
        opening: num(r[`Opening Balance ${currency}`]),
        sheetBalance: num(r[`Balance ${currency}`]),
        source: r,
        kind: "account",
      });
  const resolve = (kind: Entity["kind"], value: unknown) =>
    entities.find(
      (e) => e.kind === kind && (e.id === str(value) || e.name === str(value)),
    )?.id || str(value);
  const base = (
    r: Row,
    type: string,
    currency: unknown,
    incoming = 0,
    outgoing = 0,
  ): Entry => ({
    key: r._key,
    id: rowId(r),
    date: date(r.Date),
    type,
    currency: str(currency),
    branch: branch(r.Branch),
    in: incoming,
    out: outgoing,
    ref: str(r.Reference) || rowId(r),
    description: str(r.Reason) || str(r["Movement Type"]) || type,
    source: r,
  });
  const bankEntries: Entry[] = [],
    customerEntries: Entry[] = [],
    stockEntries: Entry[] = [],
    accountEntries: Entry[] = [],
    operations: Entry[] = [];
  for (const r of sets.payments) {
    let e = {
      ...base(r, "سداد عميل", r.Currency, n(r.Amount)),
      bank: resolve("bank", r.Bank),
      customer: resolve("customer", r.Customer),
    };
    operations.push(e);
    bankEntries.push(e);
    customerEntries.push({ ...e, in: 0, out: n(r.Amount) });
  }
  for (const r of sets.expenses) {
    let e = {
      ...base(r, "مصروف", r.Currency, 0, n(r.Amount)),
      bank: resolve("bank", r.Bank),
      account: resolve("account", r["Related Account"]),
    };
    operations.push(e);
    if (e.bank) bankEntries.push(e);
  }
  for (const r of sets.sales) {
    let e = {
      ...base(r, "فاتورة مبيعات", r.Currency, n(r.Total)),
      customer: resolve("customer", r.Customer),
      item: resolve("item", r.Item),
    };
    operations.push(e);
    customerEntries.push(e);
  }
  for (const r of sets.adjustments) {
    let amount = n(r.Amount),
      e = {
        ...base(
          r,
          "تسوية عميل",
          r.Currency,
          Math.max(-amount, 0),
          Math.max(amount, 0),
        ),
        customer: resolve("customer", r.Customer),
      };
    operations.push(e);
    customerEntries.push(e);
  }
  for (const r of sets.store) {
    let e = {
      ...base(
        r,
        "حركة مخزون",
        "QTY",
        n(r["Qty In (Small Unit)"]),
        n(r["Qty Out (Small Unit)"]),
      ),
      item: resolve("item", r.Item),
    };
    operations.push(e);
    stockEntries.push(e);
  }
  for (const r of sets.transfers) {
    let outgoing = n(r.Amount),
      incoming = num(r["To Amount"]) ?? outgoing;
    const e = {
      ...base(r, "تحويل بنكي", r["From Currency"], 0, outgoing),
      bank: resolve("bank", r["From Bank"]),
      internal: str(r["Transfer Type"]) === "Internal",
      ref: str(r.Reference) || str(r["Transfer ID"]),
    };
    operations.push(e);
    bankEntries.push(e, {
      ...e,
      key: e.key + ":in",
      in: incoming,
      out: 0,
      currency: str(r["To Currency"]),
      bank: resolve("bank", r["To Bank"]),
    });
  }
  for (const r of sets.movements) {
    const e = {
      ...base(r, "حركة حساب", r.Currency, n(r["له"]), n(r["عليه"])),
      account: resolve("account", r.Account),
      bank: resolve("bank", r.Bank),
      ref: str(r["Settlement Ref"]) || str(r.Reference) || rowId(r),
    };
    operations.push(e);
    accountEntries.push(e);
    if (e.bank) bankEntries.push(e);
    if (n(r["USD له"]) || n(r["USD عليه"]))
      accountEntries.push({
        ...e,
        key: e.key + ":usd",
        currency: "USD",
        in: n(r["USD له"]),
        out: n(r["USD عليه"]),
        bank: "",
      });
  }
  const entries = (e: Entity) =>
    ({
      bank: bankEntries,
      customer: customerEntries,
      item: stockEntries,
      account: accountEntries,
    })[e.kind].filter((t) => t[e.kind] === e.id && t.currency === e.currency);
  function ledger(e: Entity, p: Period, includeUndated = false): Ledger {
    const all = entries(e).sort(
      (a, b) =>
        (a.date || "9999").localeCompare(b.date || "9999") ||
        a.source._row - b.source._row,
    );
    const valid = all.filter((t) => t.date && t.date >= START);
    const before = total(
      valid.filter((t) => t.date < p.from),
      (t) => t.in - t.out,
    );
    const opening = e.opening === null ? null : e.opening + before;
    let running = opening;
    const lines = valid
      .filter((t) => inPeriod(t.date, p))
      .map((t) => {
        running = running === null ? null : running + t.in - t.out;
        return { ...t, balance: running };
      });
    const undated = total(
      all.filter((t) => !t.date),
      (t) => t.in - t.out,
    );
    const allBalance =
      e.opening === null ? null : e.opening + total(all, (t) => t.in - t.out);
    return {
      entity: e,
      opening,
      closing:
        running === null ? null : running + (includeUndated ? undated : 0),
      incoming: total(lines, (t) => t.in),
      outgoing: total(lines, (t) => t.out),
      undated,
      allBalance,
      difference:
        allBalance === null || e.sheetBalance === null
          ? null
          : allBalance - e.sheetBalance,
      lines,
    };
  }
  for (const e of entities) {
    const l = ledger(e, {
      from: START,
      to: "9999-12-31",
      branch: "",
      currency: "",
    });
    if (e.opening === null)
      issues.push({
        id: `opening:${e.kind}:${e.id}:${e.currency}`,
        severity: "high",
        title: `افتتاحي غير مكتمل: ${e.name}`,
        detail: "الرصيد يبقى غير مكتمل حتى اعتماد الافتتاحي؛ صافي الحركة متاح.",
        source: e.source,
      });
    if (
      l.difference !== null &&
      Math.abs(l.difference) > (e.kind === "item" ? 0.01 : 0.02)
    )
      issues.push({
        id: `diff:${e.kind}:${e.id}:${e.currency}`,
        severity: "high",
        title: `فرق مع الماستر: ${e.name}`,
        detail: `${fmt(l.difference, 4)} ${e.currency}`,
        source: e.source,
      });
    if (e.kind === "item" && e.packing !== "CONFIRMED")
      issues.push({
        id: `packing:${e.id}`,
        severity: "info",
        title: `تعبئة غير مؤكدة: ${e.name}`,
        detail: "عرض الكمية بوحدة الماستر؛ لن نفترض معامل تحويل جديدًا.",
        source: e.source,
      });
  }
  const seen = new Set<string>();
  for (const r of allRows) {
    const id = rowId(r),
      key = r._sheet + ":" + id;
    if (seen.has(key))
      issues.push({
        id: r._key,
        severity: "medium",
        title: "معرف مكرر يحتاج مراجعة",
        detail: id,
        source: r,
      });
    seen.add(key);
    for (const [k, v] of Object.entries(r)) {
      if (
        typeof v === "string" &&
        /^#(REF!|VALUE!|DIV\/0!|N\/A|ERROR!|NUM!|NAME\?)/.test(v)
      )
        issues.push({
          id: r._key + k,
          severity: "high",
          title: "خطأ معادلة في المصدر",
          detail: `${r._sheet} — ${k}: ${v}`,
          source: r,
        });
    }
  }
  for (const e of operations) {
    if (!e.date)
      issues.push({
        id: "date:" + e.key,
        severity: "high",
        title: "عملية بلا تاريخ",
        detail: `${e.type} · ${fmt(e.in || e.out)} ${e.currency} — مستبعدة من الفترات`,
        source: e.source,
      });
    else if (e.date < START)
      issues.push({
        id: "early:" + e.key,
        severity: "medium",
        title: "حركة قبل بداية الماستر",
        detail: e.id,
        source: e.source,
      });
    for (const kind of ["bank", "customer", "item", "account"] as const) {
      if (e[kind] && !entities.some((x) => x.kind === kind && x.id === e[kind]))
        issues.push({
          id: `unknown:${e.key}:${kind}`,
          severity: "high",
          title: "ربط غير معروف",
          detail: `${e.type}: ${e[kind]}`,
          source: e.source,
        });
    }
  }
  const close = rows(s, "August Close Control", 7).filter(
    (r) =>
      str(r["Bank ID"]).includes("DEMO-A") ||
      str(r["Bank ID"]).includes("DEMO-B") ||
      str(r["Bank ID"]) === "TRANSFER-CLEARING",
  );
  return {
    snapshot: s,
    sets,
    entities,
    operations,
    issues,
    ledger,
    entries,
    close,
    allRows,
  };
}
export type Model = ReturnType<typeof makeModel>;
export function periodOperations(m: Model, p: Period) {
  return m.operations.filter(
    (e) =>
      inPeriod(e.date, p) &&
      (!p.branch || e.branch === p.branch) &&
      (!p.currency || e.currency === p.currency),
  );
}
export function settlements(m: Model, p: Period) {
  const s = m.snapshot;
  const a = rows(s, "Settlement Control", 6).map((r) => ({
    id: str(r["Settlement Ref"]),
    date: date(r.Date),
    method: str(r.Method),
    etb: num(r["ETB Paid"]),
    gross: num(r["Expected / Gross USD"]),
    rate: num(r["Confirmed FX Rate"]),
    wajaleFee: num(r["Route Commission USD"]),
    djFee: num(r["Djibouti Commission USD"]),
    net: num(r["Confirmed Net USD"]),
    pendingUSD: null as number | null,
    status: str(r.Status),
    evidence: str(r["Special Group Evidence"]),
    refs: str(r["Bank / Main Ref"]),
    source: r,
  }));
  const b = rows(s, "August Settlement Review", 4).map((r) => ({
    id: str(r["Group / Settlement Ref"]),
    date: date(r["Earliest Date"]),
    method: str(r.Method),
    etb: num(r["ETB bank outflow"]),
    gross: null,
    rate: num(r["Confirmed rate (input)"]),
    wajaleFee: null,
    djFee: num(r["Confirmed fees USD (input)"]),
    net: num(r["Confirmed Net USD (input)"]),
    pendingUSD: num(r["USD clearing net"]),
    status: str(r.Status),
    evidence: str(r["Evidence (input)"]),
    refs: str(r["Posted Movement IDs"]),
    source: r,
  }));
  return [...a, ...b.filter((x) => !a.some((y) => y.id === x.id))].filter((x) =>
    inPeriod(x.date, p),
  );
}
export function periodTotals(m: Model, p: Period) {
  const op = periodOperations(m, p);
  const sales = op.filter((x) => x.type === "فاتورة مبيعات"),
    payments = op.filter((x) => x.type === "سداد عميل"),
    expenses = op.filter((x) => x.type === "مصروف");
  return {
    sales: total(sales, (x) => x.in),
    payments: total(payments, (x) => x.in),
    expenses: total(expenses, (x) => x.out),
    salesRows: sales.length,
    paymentRows: payments.length,
    expenseRows: expenses.length,
  };
}
