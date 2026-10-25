import React, { useMemo, useState } from "react";
import {
  Users,
  Package,
  Receipt,
  ArrowUpLeft,
  Landmark,
  Download,
  List,
  LayoutGrid,
  Search,
  ArrowLeftRight,
  Ship,
  CheckCircle2,
  Clock3,
  SlidersHorizontal,
  Coins,
} from "lucide-react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Model,
  Period,
  Entity,
  Row,
  Entry,
  Ledger,
  fmt,
  str,
  n,
  num,
  total,
  quantity,
  sourceUrl,
  branchName,
  branch,
  periodOperations,
  periodTotals,
  settlements,
  rows,
  date,
  inPeriod,
  START,
  unitName,
} from "./model";
import {
  Metric,
  Panel,
  Pill,
  Money,
  Table,
  Source,
  Empty,
  Report,
  Modal,
} from "./ui";
export type ViewProps = {
  m: Model;
  p: Period;
  onEntity: (e: Entity) => void;
  onRow: (r: Row) => void;
  onReport: (r: Report) => void;
  onNav: (s: string) => void;
};
const match = (q: string, ...vs: unknown[]) =>
  vs.some((v) => str(v).toLowerCase().includes(q.toLowerCase()));
const remaining = (l: Ledger) => l.closing ?? 0;
export function Home(v: ViewProps) {
  const { m, p, onNav, onEntity } = v;
  const [fxRate, setFxRate] = useState("180");
  const etbPeriod = { ...p, currency: "ETB" };
  const t = periodTotals(m, etbPeriod);
  const banks = m.entities
    .filter(
      (e) =>
        e.kind === "bank" &&
        e.currency === "ETB" &&
        e.id !== "TRANSFER-CLEARING",
    )
    .map((e) => m.ledger(e, etbPeriod));
  const customers = m.entities
    .filter((e) => e.kind === "customer")
    .map((e) => m.ledger(e, etbPeriod));
  const debt = total(
      customers.filter((l) => (l.closing || 0) > 0),
      remaining,
    ),
    credit = -total(
      customers.filter((l) => (l.closing || 0) < 0),
      remaining,
    );
  const list = periodOperations(m, etbPeriod),
    daily = [];
  for (
    let d = new Date(p.from + "T00:00:00Z");
    d <= new Date(p.to + "T00:00:00Z") && daily.length < 366;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const iso = d.toISOString().slice(0, 10);
    const es = list.filter((x) => x.date === iso);
    daily.push({
      date: iso.slice(5),
      sales: total(
        es.filter((x) => x.type === "فاتورة مبيعات"),
        (x) => x.in,
      ),
      payments: total(
        es.filter((x) => x.type === "سداد عميل"),
        (x) => x.in,
      ),
    });
  }
  const latestSale = new Map<string, Entry>();
  m.operations
    .filter(
      (e) =>
        e.type === "فاتورة مبيعات" &&
        e.currency === "ETB" &&
        !!e.item &&
        !!e.date &&
        e.date <= p.to,
    )
    .forEach((e) => {
      const current = latestSale.get(e.item!);
      if (
        !current ||
        e.date > current.date ||
        (e.date === current.date && e.source._row > current.source._row)
      )
        latestSale.set(e.item!, e);
    });
  const itemRows = m.entities
    .filter((e) => e.kind === "item")
    .map((entity) => {
      const ledger = m.ledger(entity, etbPeriod);
      const sale = latestSale.get(entity.id);
      const soldSmall = sale ? num(sale.source["Qty (Small Unit)"]) : null;
      const soldTotal = sale ? num(sale.source.Total) : null;
      const unitPrice = sale ? num(sale.source["Unit Price"]) : null;
      const perSmall =
        soldSmall && soldTotal !== null
          ? soldTotal / soldSmall
          : unitPrice !== null
            ? unitPrice /
              (str(sale?.source.Unit) === entity.smallUnit
                ? 1
                : entity.factor || 1)
            : null;
      const closing = ledger.closing;
      return {
        entity,
        ledger,
        closing,
        perSmall,
        mainPrice: perSmall === null ? null : perSmall * (entity.factor || 1),
        value:
          closing === null || perSmall === null ? null : closing * perSmall,
        mainQuantity: closing === null ? null : closing / (entity.factor || 1),
      };
    });
  const valuedItems = itemRows.filter((x) => x.value !== null);
  const inventoryValue = total(valuedItems, (x) => x.value || 0);
  const bankValue = total(banks, remaining);
  const netAssets = bankValue + debt + inventoryValue;
  const fx = num(fxRate) || 0;
  const accounts = [
    ...new Map(
      m.entities.filter((e) => e.kind === "account").map((e) => [e.id, e]),
    ).values(),
  ];
  const featuredAccounts = [
    "DEMO-ACCOUNT-A",
    "DEMO-ACCOUNT-B",
    "DEMO-ACCOUNT-C",
    "DEMO-ACCOUNT-D",
  ]
    .map((id) => accounts.find((e) => e.id === id)?.name)
    .filter(Boolean)
    .join(" · ");
  const lastActivity = m.operations
    .map((e) => e.date)
    .filter((d) => d && d <= p.to)
    .sort()
    .at(-1);
  const bankMax = Math.max(1, ...banks.map((l) => Math.max(0, l.closing || 0)));
  const warehouseGroups = ["Dire Dawa", "Addis Ababa"]
    .map((branch) => ({
      branch,
      rows: itemRows.filter(
        (x) => x.entity.branch === branch && Math.abs(x.closing || 0) > 1e-7,
      ),
    }))
    .filter((group) => group.rows.length);
  const missingPrice = itemRows.filter(
    (x) => Math.abs(x.closing || 0) > 1e-7 && x.perSmall === null,
  );
  const lowStock = [...itemRows]
    .filter((x) => x.mainQuantity !== null)
    .sort((a, b) => (a.mainQuantity || 0) - (b.mainQuantity || 0))
    .slice(0, 5);
  return (
    <>
      <section className="executive-hero">
        <div className="executive-hero-head">
          <div className="executive-title">
            <span className="hero-brand-mark">SY</span>
            <div>
              <span className="eyebrow">SYSCO ETHIOPIA</span>
              <h1>لوحة التحكم الحية</h1>
              <p>أرصدة مباشرة · آخر حركة {lastActivity || "غير متوفرة"}</p>
            </div>
          </div>
          <div className="hero-actions">
            <button
              className="accounts-shortcut"
              onClick={() => onNav("clearing")}
            >
              <Receipt size={21} />
              <span>
                <strong>الحوالات والمعلقات</strong>
                <small>إشعارات البنك · عرض وتحميل</small>
              </span>
              <ArrowUpLeft size={17} />
            </button>
            <Pill tone="teal">Live</Pill>
            <Pill>ملف إداري</Pill>
            <button
              className="accounts-shortcut"
              onClick={() => onNav("accounts")}
            >
              <Coins size={21} />
              <span>
                <strong>الحسابات الجديدة</strong>
                <small>{featuredAccounts || "الحسابات الوسيطة والشخصية"}</small>
              </span>
              <ArrowUpLeft size={17} />
            </button>
          </div>
        </div>
        <div className="net-assets-card">
          <div className="net-assets-label">
            <span>صافي الأصول</span>
            <small>LIVE · حتى {p.to}</small>
          </div>
          <p>إجمالي الأصول المالية</p>
          <div className="net-assets-value">
            <Money value={netAssets} />
          </div>
          <div className="asset-breakdown">
            <button onClick={() => onNav("banks")}>
              <Landmark size={18} />
              <span>البنوك</span>
              <Money value={bankValue} />
            </button>
            <button onClick={() => onNav("customers")}>
              <Users size={18} />
              <span>العملاء</span>
              <Money value={debt} />
            </button>
            <button onClick={() => onNav("inventory")}>
              <Package size={18} />
              <span>المخزون</span>
              <Money value={inventoryValue} />
            </button>
          </div>
          <div className="fx-converter">
            <label>
              <span>سعر الصرف التقديري</span>
              <input
                aria-label="سعر الصرف التقديري"
                inputMode="decimal"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
              />
            </label>
            <div>
              <span>المعادل بالدولار</span>
              <Money value={fx ? netAssets / fx : null} currency="USD" />
            </div>
          </div>
        </div>
      </section>
      <div className="dashboard-section-heading">
        <div>
          <span className="eyebrow">EXECUTIVE OVERVIEW</span>
          <h2>الأداء والسيولة</h2>
        </div>
        <Pill tone="amber">إقفال الشهر قيد المراجعة</Pill>
      </div>
      <div className="home-grid legacy-home-grid">
        <Panel
          title="المبيعات مقابل المدفوعات"
          subtitle="التدفق والتحصيل · ETB"
          action={
            <div className="chart-key">
              <span className="violet-dot" />
              مبيعات <span className="teal-dot" />
              تحصيل
            </div>
          }
        >
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#8b7bff" stopOpacity={0.3} />
                    <stop offset="1" stopColor="#8b7bff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={(x) =>
                    new Intl.NumberFormat("en-US", {
                      notation: "compact",
                    }).format(x)
                  }
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    color: "var(--text)",
                  }}
                  formatter={(value: number, name: string) => [
                    fmt(value) + " ETB",
                    name === "sales" ? "المبيعات" : "التحصيل",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#9b8cff"
                  fill="url(#salesFill)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="payments"
                  stroke="#4bd5be"
                  fill="transparent"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flow-totals">
            <div>
              <span>المبيعات</span>
              <Money value={t.sales} />
            </div>
            <div>
              <span>التحصيل</span>
              <Money value={t.payments} />
            </div>
            <div>
              <span>المصاريف</span>
              <Money value={t.expenses} />
            </div>
          </div>
        </Panel>
        <Panel title="حصة الحسابات البنكية" subtitle="توزيع السيولة">
          <div className="bank-share-list">
            {[...banks]
              .sort((a, b) => (b.closing || 0) - (a.closing || 0))
              .map((ledger) => {
                const value = Math.max(0, ledger.closing || 0);
                return (
                  <button
                    key={ledger.entity.id}
                    onClick={() => onEntity(ledger.entity)}
                  >
                    <span>{ledger.entity.name}</span>
                    <Money value={value} />
                    <i style={{ width: `${(value / bankMax) * 100}%` }} />
                  </button>
                );
              })}
          </div>
          <button className="full-button" onClick={() => onNav("banks")}>
            عرض كل البنوك <Landmark size={17} />
          </button>
        </Panel>
      </div>
      <Panel
        title="أعلى أرصدة العملاء"
        subtitle={`مستحقات ${fmt(debt)} ETB · أرصدة دائنة ${fmt(credit)} ETB`}
        action={
          <button className="text-button" onClick={() => onNav("customers")}>
            عرض الكل
          </button>
        }
      >
        <div className="rank-list">
          {[...customers]
            .sort((a, b) => remaining(b) - remaining(a))
            .filter((ledger) => (ledger.closing || 0) > 0)
            .slice(0, 4)
            .map((l, i) => (
              <button key={l.entity.id} onClick={() => onEntity(l.entity)}>
                <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <strong>{l.entity.name}</strong>
                  <small>{branchName(l.entity.branch)}</small>
                </span>
                <Money value={l.closing} />
                <ArrowUpLeft size={17} />
              </button>
            ))}
        </div>
      </Panel>
      <div className="warehouse-grid">
        {warehouseGroups.map((group) => {
          const valued = group.rows.filter((x) => x.value !== null);
          const branchValue = total(valued, (x) => x.value || 0);
          return (
            <Panel
              key={group.branch}
              title={branchName(group.branch)}
              subtitle="Warehouse Value · الأصناف المسعّرة"
            >
              <div className="inventory-value-list">
                {[...valued]
                  .sort((a, b) => (b.value || 0) - (a.value || 0))
                  .slice(0, 5)
                  .map((item) => (
                    <button
                      key={item.entity.id}
                      onClick={() => onEntity(item.entity)}
                    >
                      <span>
                        <strong>{item.entity.name}</strong>
                        <small>{quantity(item.closing, item.entity)}</small>
                      </span>
                      <span>
                        <small>
                          سعر البيع الحالي: {fmt(item.mainPrice)} ETB
                        </small>
                        <Money value={item.value} />
                      </span>
                    </button>
                  ))}
              </div>
              <div className="panel-total">
                <span>{group.rows.length} صنف برصيد حالي</span>
                <Money value={branchValue} />
              </div>
            </Panel>
          );
        })}
      </div>
      <div className="two-col dashboard-bottom-grid">
        <Panel
          title="أصناف لم تدخل في الأصول"
          subtitle="بسبب عدم وجود سعر بيع سابق للصنف"
        >
          {missingPrice.length ? (
            <div className="compact-ledger-list">
              {missingPrice.slice(0, 5).map((item) => (
                <button
                  key={item.entity.id}
                  onClick={() => onEntity(item.entity)}
                >
                  <span>
                    <strong>{item.entity.name}</strong>
                    <small>{branchName(item.entity.branch)}</small>
                  </span>
                  <span>{quantity(item.closing, item.entity)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="health-number">
              <CheckCircle2 />
              <strong>كل الأصناف الحالية لها سعر</strong>
            </div>
          )}
          <div className="panel-total">
            <span>{missingPrice.length} صنف بدون سعر بيع</span>
          </div>
        </Panel>
        <Panel
          title="الأصناف الأقرب للحد الحرج"
          subtitle="مراقبة المخزون حتى نهاية الفترة"
          action={
            <button className="text-button" onClick={() => onNav("inventory")}>
              عرض الكل
            </button>
          }
        >
          <div className="compact-ledger-list">
            {lowStock.map((item) => (
              <button
                key={item.entity.id}
                onClick={() => onEntity(item.entity)}
              >
                <span>
                  <strong>{item.entity.name}</strong>
                  <small>{branchName(item.entity.branch)}</small>
                </span>
                <span>{quantity(item.closing, item.entity)}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
function ledgerReport(title: string, ls: Ledger[], kind: string): Report {
  return {
    title,
    headers: [
      "الاسم",
      "العملة / الوحدة",
      "بداية الفترة",
      "وارد / مدين",
      "صادر / دائن",
      "نهاية الفترة",
      "بلا تاريخ — منفصل",
    ],
    rows: ls.map((l) => [
      l.entity.name,
      l.entity.kind === "item"
        ? unitName(l.entity.smallUnit || "")
        : l.entity.currency,
      l.opening,
      l.incoming,
      l.outgoing,
      l.closing,
      l.undated,
    ]),
    notes:
      kind === "account"
        ? "رصيد الحساب = الافتتاحي + له − عليه. الموجب التزام على سيسكو، والسالب رصيد على الطرف."
        : "الأرصدة المؤرخة فقط؛ العمليات بلا تاريخ معروضة منفصلة. الحساب غير المكتمل لا يفترض افتتاحيًا صفريًا.",
  };
}
export function Entities(
  v: ViewProps & { kind: "bank" | "customer" | "account" },
) {
  const { m, p, kind, onEntity, onReport } = v;
  const [q, setQ] = useState(""),
    [layout, setLayout] = useState("cards");
  const titles = {
      bank: "البنوك والسيولة",
      customer: "العملاء والتحصيل",
      account: "الحسابات والدولار",
    },
    icons = { bank: Landmark, customer: Users, account: Coins };
  const Icon = icons[kind];
  const ls = m.entities
    .filter(
      (e) =>
        e.kind === kind && (kind === "account" || e.currency === p.currency),
    )
    .map((e) => m.ledger(e, p));
  const filtered = ls.filter((l) =>
    match(q, l.entity.name, l.entity.id, l.entity.branch),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>{titles[kind]}</h1>
          <p>
            {kind === "account"
              ? "له وعليه بالبر والدولار؛ الموجب التزام على سيسكو والسالب رصيد على الطرف."
              : "أرصدة نهاية الفترة تشمل كل حركات الحساب، مع كشف تفصيلي لكل رصيد."}
          </p>
        </div>
        <button
          onClick={() => onReport(ledgerReport(titles[kind], filtered, kind))}
        >
          <Download size={18} />
          تقرير
        </button>
      </div>
      {p.branch && (
        <div className="notice">
          الأرصدة هنا على مستوى الشركة؛ اختيار الفرع لا يقتطع رصيد الحساب
          المشترك.
        </div>
      )}
      {kind === "account" && (
        <div className="notice">
          رصيد SYSCO Djibouti يعكس القيود المسجلة؛ لا يمثل كشف المورد التجاري
          النهائي قبل اكتمال فواتيره.
        </div>
      )}
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="بحث الحسابات"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو المعرف…"
          />
        </label>
        <span className="muted">{filtered.length} حساب</span>
        <div className="segmented">
          <button
            aria-label="عرض بطاقات"
            className={layout === "cards" ? "active" : ""}
            onClick={() => setLayout("cards")}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            aria-label="عرض جدول"
            className={layout === "table" ? "active" : ""}
            onClick={() => setLayout("table")}
          >
            <List size={18} />
          </button>
        </div>
      </div>
      {layout === "table" ? (
        <Panel title={titles[kind]}>
          <Table
            rows={filtered}
            onRow={(l) => onEntity(l.entity)}
            columns={[
              {
                label: "الحساب",
                render: (l) => (
                  <>
                    <strong>{l.entity.name}</strong>
                    <small className="block">{l.entity.id}</small>
                  </>
                ),
              },
              { label: "العملة", render: (l) => l.entity.currency },
              { label: "بداية الفترة", render: (l) => fmt(l.opening) },
              { label: "وارد / له", render: (l) => fmt(l.incoming) },
              { label: "صادر / عليه", render: (l) => fmt(l.outgoing) },
              {
                label: "نهاية الفترة",
                render: (l) => (
                  <Money value={l.closing} currency={l.entity.currency} />
                ),
              },
              {
                label: "المصدر",
                render: (l) => <Source row={l.entity.source} />,
              },
            ]}
          />
        </Panel>
      ) : (
        <div className="entity-grid">
          {filtered.map((l) => (
            <button
              key={l.entity.id + l.entity.currency}
              className={
                "entity-card " + (l.entity.currency === "USD" ? "usd-card" : "")
              }
              onClick={() => onEntity(l.entity)}
            >
              <div className="entity-card-top">
                <span className="icon-tile">
                  <Icon size={21} />
                </span>
                <Pill
                  tone={
                    l.closing === null
                      ? "amber"
                      : l.entity.currency === "USD"
                        ? "teal"
                        : "muted"
                  }
                >
                  {l.closing === null
                    ? "افتتاحي مطلوب"
                    : l.entity.id === "TRANSFER-CLEARING"
                      ? "مقاصة داخلية"
                      : l.entity.currency}
                </Pill>
              </div>
              <h3>{l.entity.name}</h3>
              <small>{l.entity.id}</small>
              <div className="balance-block">
                <span>
                  {kind === "account"
                    ? "الرصيد: له (+) / عليه (−)"
                    : "رصيد نهاية الفترة"}
                </span>
                <Money value={l.closing} currency={l.entity.currency} />
              </div>
              <div className="mini-stats">
                <div>
                  <span>
                    {kind === "account" ? "له خلال الفترة" : "وارد / مدين"}
                  </span>
                  <bdi>{fmt(l.incoming)}</bdi>
                </div>
                <div>
                  <span>
                    {kind === "account" ? "عليه خلال الفترة" : "صادر / دائن"}
                  </span>
                  <bdi>{fmt(l.outgoing)}</bdi>
                </div>
              </div>
              <div className="entity-footer">
                <span>
                  {l.undated
                    ? "توجد حركة بلا تاريخ"
                    : kind === "customer"
                      ? branchName(l.entity.branch)
                      : "كشف الحساب"}
                </span>
                <ArrowUpLeft size={18} />
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
export function Inventory(v: ViewProps) {
  const { m, p, onEntity, onReport } = v;
  const [q, setQ] = useState(""),
    [warehouse, setWarehouse] = useState("");
  const all = m.entities.filter((e) => e.kind === "item"),
    filtered = all
      .filter(
        (e) =>
          (!p.branch || e.branch === p.branch) &&
          (!warehouse || str(e.source.Warehouse) === warehouse) &&
          match(q, e.name, e.id),
      )
      .map((e) => m.ledger(e, p));
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>المخزون والمستودعات</h1>
          <p>
            كميات فعلية ووحدات واضحة، دون جمع الأصناف المختلفة في كمية واحدة.
          </p>
        </div>
        <button
          onClick={() =>
            onReport({
              ...ledgerReport("تقرير المخزون", filtered, "item"),
              currency: "حسب وحدة كل صنف",
              headers: [
                "الصنف",
                "المستودع",
                "بداية الفترة",
                "الوارد",
                "الصادر",
                "الرصيد",
                "حالة التعبئة",
              ],
              rows: filtered.map((l) => [
                l.entity.name,
                str(l.entity.source.Warehouse),
                quantity(l.opening, l.entity),
                quantity(l.incoming, l.entity),
                quantity(l.outgoing, l.entity),
                quantity(l.closing, l.entity),
                l.entity.packing || "",
              ]),
            })
          }
        >
          <Download size={18} />
          تقرير الجرد
        </button>
      </div>
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="بحث الأصناف"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="اسم الصنف أو الكود…"
          />
        </label>
        <select
          aria-label="المستودع"
          value={warehouse}
          onChange={(e) => setWarehouse(e.target.value)}
        >
          <option value="">كل المستودعات</option>
          {[...new Set(all.map((e) => str(e.source.Warehouse)))].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <Pill>{filtered.length} صنف</Pill>
      </div>
      <div className="entity-grid">
        {filtered.map((l) => (
          <button
            className="entity-card stock-card"
            key={l.entity.id}
            onClick={() => onEntity(l.entity)}
          >
            <div className="entity-card-top">
              <span className="icon-tile">
                <Package size={22} />
              </span>
              <Pill
                tone={
                  l.entity.packing !== "CONFIRMED"
                    ? "amber"
                    : remaining(l) < 0
                      ? "rose"
                      : "teal"
                }
              >
                {l.entity.packing !== "CONFIRMED"
                  ? "تعبئة قيد التأكيد"
                  : remaining(l) < 0
                    ? "رصيد سالب"
                    : "وحدات مؤكدة"}
              </Pill>
            </div>
            <h3>{l.entity.name}</h3>
            <small>{str(l.entity.source.Warehouse)}</small>
            <div className="stock-balance">{quantity(l.closing, l.entity)}</div>
            <div className="mini-stats">
              <div>
                <span>وارد</span>
                <strong>{quantity(l.incoming, l.entity)}</strong>
              </div>
              <div>
                <span>صادر</span>
                <strong>{quantity(l.outgoing, l.entity)}</strong>
              </div>
            </div>
            <div className="entity-footer">
              <span>
                {l.entity.packing === "CONFIRMED"
                  ? `1 ${unitName(l.entity.unit || "")} = ${l.entity.factor} ${unitName(l.entity.smallUnit || "")}`
                  : "الكمية بوحدة الماستر الحالية"}
              </span>
              <ArrowUpLeft size={18} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
export function Operations(v: ViewProps & { expensesOnly?: boolean }) {
  const { m, p, onRow, onReport, expensesOnly } = v;
  const [q, setQ] = useState(""),
    [type, setType] = useState(""),
    [bank, setBank] = useState(""),
    [category, setCategory] = useState("");
  const ops = periodOperations(m, p)
    .filter(
      (e) =>
        (!expensesOnly || e.type === "مصروف") &&
        (!type || e.type === type) &&
        (!bank || e.bank === bank) &&
        (!category || str(e.source.Category) === category) &&
        match(
          q,
          e.id,
          e.ref,
          e.description,
          e.source.Note,
          e.customer,
          e.account,
        ),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const title = expensesOnly ? "المصاريف والتكاليف" : "سجل العمليات";
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>{title}</h1>
          <p>
            {expensesOnly
              ? "أصل التحويلات وحركات الحسابات معروضة في صفحاتها المستقلة."
              : "كل عملية بمصدرها وتصنيفها الحالي. الملاحظات القديمة محفوظة للتتبع."}
          </p>
        </div>
        <button
          onClick={() =>
            onReport({
              title,
              headers: [
                "التاريخ",
                "النوع",
                "المعرف",
                "المرجع",
                "البيان",
                "المبلغ",
                "العملة",
              ],
              rows: ops.map((e) => [
                e.date,
                e.type,
                e.id,
                e.ref,
                e.description,
                e.in || e.out,
                e.currency,
              ]),
              notes:
                "نتائج الفلاتر والبحث الحالية. أنواع العمليات المختلفة لا تُجمع كإيراد أو مصروف واحد.",
            })
          }
        >
          <Download size={18} />
          تقرير النتائج
        </button>
      </div>
      {expensesOnly && (
        <div className="expense-strip">
          <Receipt size={28} />
          <span>إجمالي النتائج</span>
          <Money value={total(ops, (x) => x.out)} currency={p.currency} />
          <Pill>{ops.length} سند</Pill>
        </div>
      )}
      <div className="toolbar wrap">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="بحث العمليات"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="مرجع، اسم، ملاحظة، رقم عملية…"
          />
        </label>
        {!expensesOnly && (
          <select
            aria-label="نوع العملية"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">كل العمليات</option>
            {[...new Set(m.operations.map((e) => e.type))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        )}
        <select
          aria-label="بنك العملية"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
        >
          <option value="">كل البنوك</option>
          {m.entities
            .filter((e) => e.kind === "bank")
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
        </select>
        {expensesOnly && (
          <select
            aria-label="تصنيف المصروف"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">كل التصنيفات</option>
            {[...new Set(m.sets.expenses.map((x) => str(x.Category)))].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        )}
      </div>
      <Panel title={`${ops.length} عملية`}>
        <Table
          rows={ops}
          onRow={(e) => onRow(e.source)}
          columns={[
            {
              label: "العملية",
              render: (e) => (
                <>
                  <strong>{e.description}</strong>
                  <small className="block">
                    {e.type} · {e.ref}
                  </small>
                </>
              ),
            },
            { label: "التاريخ", render: (e) => <bdi>{e.date}</bdi> },
            { label: "الفرع", render: (e) => branchName(e.branch) },
            {
              label: "الجهة / البنك",
              render: (e) =>
                m.entities.find(
                  (x) => x.id === (e.customer || e.account || e.bank),
                )?.name ||
                e.bank ||
                "—",
            },
            {
              label: "المبلغ",
              render: (e) => (
                <Money value={e.in || e.out} currency={e.currency} />
              ),
            },
            { label: "المصدر", render: (e) => <Source row={e.source} /> },
          ]}
        />
      </Panel>
    </>
  );
}
export function Settlements(v: ViewProps) {
  const { m, p, onRow, onReport, onEntity } = v;
  const [method, setMethod] = useState(""),
    [status, setStatus] = useState(""),
    [q, setQ] = useState("");
  const gs = settlements(m, p).filter(
    (g) =>
      (!method || g.method === method) &&
      (!status ||
        (status === "confirmed"
          ? g.status === "Confirmed"
          : g.status !== "Confirmed")) &&
      match(q, g.id, g.refs),
  );
  const clearing = m.entities
    .filter(
      (e) => e.kind === "account" && str(e.source.Type) === "FX Intermediary",
    )
    .map((e) => m.ledger(e, p))
    .filter((l) => Math.abs(remaining(l)) > 0.01);
  const dj = m.entities.find(
    (e) => e.id === "DEMO-ACCOUNT-A" && e.currency === "USD",
  )!;
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>جيبوتي والتسويات</h1>
          <p>من التمويل بالبر إلى تأكيد الصافي؛ كل مرحلة بحالتها ومستندها.</p>
        </div>
        <button
          onClick={() =>
            onReport({
              title: "متابعة تسويات SYSCO Djibouti",
              currency: "ETB / USD منفصلان",
              headers: [
                "التاريخ",
                "المرجع",
                "المسار",
                "التمويل ETB",
                "إجمالي USD",
                "السعر",
                "عمولة وجالي USD",
                "عمولة جيبوتي / مجمعة USD",
                "الصافي USD",
                "الحالة",
              ],
              rows: gs.map((g) => [
                g.date,
                g.id,
                g.method,
                g.etb,
                g.gross,
                g.rate,
                g.wajaleFee,
                g.djFee,
                g.net,
                g.status,
              ]),
              notes:
                "جدول متابعة فقط. لا يمثل كل إجمالي مؤكد مبلغًا وصل لجيبوتي؛ المستفيد النهائي والقيود المنشورة هما المرجع. الحقول الفارغة غير مؤكدة.",
            })
          }
        >
          <Download size={18} />
          تقرير التسويات
        </button>
      </div>
      <div className="notice">
        الرصيد الدفتري لجيبوتي يشمل السداد والمدفوع بالنيابة؛ لا يُعد كشف المورد
        النهائي. صفحات المتابعة لا تنشئ أثرًا ماليًا ثانيًا.
      </div>
      <div className="three-col">
        <Metric
          label="رصيد جيبوتي الدفتري"
          value={m.ledger(dj, p).closing}
          unit="USD"
          icon={Ship}
          note="له (+) / عليه (−) · حتى نهاية الفترة"
          onClick={() => onEntity(dj)}
        />
        <Metric
          label="مجموعات مؤكدة"
          value={gs.filter((x) => x.status === "Confirmed").length}
          unit="مجموعة"
          icon={CheckCircle2}
          tone="teal"
          note="حسب حالة المتابعة المسجلة"
        />
        <Metric
          label="مجموعات معلقة"
          value={gs.filter((x) => x.status !== "Confirmed").length}
          unit="مجموعة"
          icon={Clock3}
          tone="amber"
          note="تحتاج سعرًا أو إثباتًا أو تسوية"
        />
      </div>
      <Panel
        title="أرصدة الحسابات الوسيطة"
        subtitle="حتى نهاية الفترة · كل الشركة"
      >
        <div className="clearing-strip">
          {clearing.map((l) => (
            <button
              key={l.entity.id + l.entity.currency}
              onClick={() => onEntity(l.entity)}
            >
              <strong>{l.entity.name}</strong>
              <Money value={l.closing} currency={l.entity.currency} />
            </button>
          ))}
        </div>
      </Panel>
      <div className="toolbar wrap">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="بحث التسويات"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="مرجع التسوية أو الحوالة…"
          />
        </label>
        <select
          aria-label="مسار التسوية"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="">كل المسارات</option>
          {["Route A", "LC", "Route B", "Export"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="حالة التسوية"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">كل الحالات</option>
          <option value="pending">معلقة</option>
          <option value="confirmed">مؤكدة</option>
        </select>
      </div>
      <div className="settlement-list">
        {gs.map((g) => (
          <article key={g.source._key} className="settlement-card">
            <div className="settlement-head">
              <div>
                <span className="method">{g.method}</span>
                <button className="text-button" onClick={() => onRow(g.source)}>
                  <bdi>{g.id}</bdi>
                </button>
                <small>{g.date}</small>
              </div>
              <Pill tone={g.status === "Confirmed" ? "teal" : "amber"}>
                {g.status === "Confirmed" ? "مؤكدة" : "بانتظار الاستكمال"}
              </Pill>
            </div>
            <div className="settlement-steps">
              <div>
                <span>01 · التمويل</span>
                <Money value={g.etb} />
              </div>
              <ArrowLeftRight size={18} />
              <div>
                <span>02 · الدولار / سعر الصرف</span>
                <Money value={g.gross} currency="USD" />
                <small>
                  السعر: {g.rate === null ? "غير مؤكد" : fmt(g.rate, 4)}
                </small>
              </div>
              <ArrowLeftRight size={18} />
              <div>
                <span>03 · الصافي المسجل بالمتابعة</span>
                <Money value={g.net} currency="USD" />
                <small>
                  {g.evidence ? "يوجد وصف إثبات" : "إثبات الوصول مطلوب"}
                </small>
              </div>
            </div>
            <div className="settlement-footer">
              <span>
                {g.pendingUSD !== null && g.pendingUSD !== 0
                  ? `رصيد وسيط USD: ${fmt(g.pendingUSD)} · `
                  : ""}
                الرسوم:{" "}
                {g.wajaleFee === null && g.djFee === null
                  ? "غير مكتملة"
                  : `وجالي ${fmt(g.wajaleFee)} · جيبوتي / مجمعة ${fmt(g.djFee)} USD`}
              </span>
              <Source row={g.source} />
            </div>
          </article>
        ))}
      </div>
      {!gs.length && <Empty />}
      <Panel
        title="مرجع التصدير"
        subtitle="مقارنة سعر صرف مرجعية، وليست أرباحًا نهائية"
      >
        <button
          onClick={() =>
            onReport({
              title: "Export FX Benchmark",
              currency: "ETB / USD",
              headers: [
                "التاريخ",
                "المرجع",
                "ETB",
                "سعر مرجعي",
                "USD مرجعي",
                "USD فعلي",
                "فرق USD",
                "الحالة",
              ],
              rows: rows(m.snapshot, "Export FX Benchmark", 8).map((r) => [
                date(r["تاريخ التحويل"]),
                str(r["Benchmark ID"]),
                num(r["المبلغ ETB"]),
                num(r["سعر وجالة ETB/USD"]),
                num(r["USD المرجعي الإجمالي"]),
                num(r["USD الفعلي"]),
                num(r["الفرق USD"]),
                str(r["حالة السعر"]),
              ]),
              notes:
                "المرجع يتضمن تمويلًا افتتاحيًا قبل يونيو؛ لا يمثل حركة الفترة المحددة ولا ربحًا محاسبيًا.",
            })
          }
        >
          عرض مرجع التصدير <ArrowUpLeft size={17} />
        </button>
      </Panel>
    </>
  );
}
