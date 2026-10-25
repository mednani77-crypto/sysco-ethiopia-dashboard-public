import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Search,
  ExternalLink,
  Shield,
  Link,
  Copy,
  Send,
  RefreshCw,
} from "lucide-react";
import {
  Model,
  Period,
  Entity,
  Row,
  fmt,
  str,
  n,
  num,
  total,
  quantity,
  unitName,
  periodTotals,
  rows,
  date,
  inPeriod,
  sourceUrl,
  MASTER_ID,
} from "./model";
import {
  Panel,
  Pill,
  Money,
  Table,
  Source,
  Empty,
  Report,
  Modal,
  api,
} from "./ui";
import { ViewProps } from "./views";
export function Detail({
  m,
  p,
  entity,
  onClose,
  onRow,
  onReport,
}: {
  m: Model;
  p: Period;
  entity: Entity;
  onClose: () => void;
  onRow: (r: Row) => void;
  onReport: (r: Report) => void;
}) {
  const l = m.ledger(entity, p);
  const [q, setQ] = useState("");
  const lines = l.lines.filter((x) =>
    [x.id, x.ref, x.description, str(x.source.Note)].some((s) =>
      s.toLowerCase().includes(q.toLowerCase()),
    ),
  );
  const display = (v: number | null) =>
    entity.kind === "item" ? quantity(v, entity) : fmt(v);
  return (
    <Modal title={entity.name} onClose={onClose} wide>
      <div className="detail-meta">
        <Pill>
          {entity.currency === "QTY"
            ? unitName(entity.smallUnit || "")
            : entity.currency}
        </Pill>
        <bdi>{entity.id}</bdi>
        <Source row={entity.source} />
      </div>
      <div className="notice">
        رصيد افتتاح الفترة يشمل جميع الحركات السابقة. البحث يغيّر الصفوف
        المعروضة فقط؛ الأرصدة تبقى لكامل الفترة.
      </div>
      <div className="detail-kpis">
        {[
          ["بداية الفترة", l.opening],
          ["وارد / له", l.incoming],
          ["صادر / عليه", l.outgoing],
          ["نهاية الفترة", l.closing],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <strong>{display(value as number | null)}</strong>
          </div>
        ))}
      </div>
      {l.undated !== 0 && (
        <div className="notice warning">
          صافي حركات بلا تاريخ: {fmt(l.undated)} {entity.currency}، مستبعد من
          الفترة. الرصيد العام بالماستر: {fmt(l.allBalance)}.
        </div>
      )}
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="البحث في كشف الحساب"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث داخل الكشف…"
          />
        </label>
        <button
          onClick={() =>
            onReport({
              title: `كشف حساب — ${entity.name}`,
              currency:
                entity.currency === "QTY"
                  ? unitName(entity.smallUnit || "")
                  : entity.currency,
              headers: [
                "التاريخ",
                "العملية",
                "المرجع",
                "البيان",
                "وارد / له",
                "صادر / عليه",
                "الرصيد",
              ],
              rows: lines.map((e) => [
                e.date,
                e.type,
                e.ref,
                e.description,
                e.in,
                e.out,
                e.balance,
              ]),
              notes: `بداية الفترة: ${display(l.opening)} · نهاية الفترة: ${display(l.closing)}. ${q ? "صفوف البحث فقط؛ الرصيد التراكمي يشمل كل الحركات." : ""} ${entity.kind === "account" ? "له (+) وعليه (−) كما في الماستر." : ""}`,
            })
          }
        >
          <Download size={18} />
          تصدير الكشف
        </button>
      </div>
      <Table
        rows={lines}
        onRow={(e) => onRow(e.source)}
        columns={[
          {
            label: "العملية",
            render: (e) => (
              <>
                <strong>{e.type}</strong>
                <small className="block">{e.ref}</small>
              </>
            ),
          },
          { label: "التاريخ", render: (e) => <bdi>{e.date}</bdi> },
          { label: "وارد / له", render: (e) => display(e.in) },
          { label: "صادر / عليه", render: (e) => display(e.out) },
          { label: "الرصيد", render: (e) => display(e.balance) },
          { label: "المصدر", render: (e) => <Source row={e.source} /> },
        ]}
      />
      {q && (
        <p className="muted">
          مجموع الصفوف المعروضة: وارد {display(total(lines, (x) => x.in))} ·
          صادر {display(total(lines, (x) => x.out))}
        </p>
      )}
    </Modal>
  );
}
export function RowDetail({ row, onClose }: { row: Row; onClose: () => void }) {
  return (
    <Modal title="تفاصيل السجل ومصدره" onClose={onClose} wide>
      <div className="detail-meta">
        <Pill>{row._sheet}</Pill>
        <span>الصف {row._row}</span>
        <Source row={row} />
      </div>
      <div className="notice">
        الحقول الحالية هي المعتمدة؛ المعرف والملاحظة قد يحتفظان بوصف سابق
        لتصحيحك.
      </div>
      <dl className="record-fields">
        {Object.entries(row)
          .filter(([k]) => k && !k.startsWith("_"))
          .map(([k, value]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>
                {/date|تاريخ/i.test(k)
                  ? date(value) || str(value) || "—"
                  : typeof value === "number"
                    ? fmt(value, 4).replace(/\.0+$/, "")
                    : str(value) || "—"}
              </dd>
            </div>
          ))}
      </dl>
    </Modal>
  );
}
export function Staff(v: ViewProps) {
  const { m, p, onEntity } = v;
  const ids = ["CUST041", "CUST054", "CUST045", "CUST053"];
  const [selected, setSelected] = useState<string[]>(
    ids.filter((id) => m.entities.some((e) => e.id === id)),
  );
  const customers = m.entities.filter((e) => e.kind === "customer");
  const ls = customers
    .filter((e) => selected.includes(e.id))
    .map((e) => {
      const l = m.ledger(e, p),
        sales = total(
          l.lines.filter((x) => x.type === "فاتورة مبيعات"),
          (x) => x.in,
        ),
        paid = total(
          l.lines.filter((x) => x.type === "سداد عميل"),
          (x) => x.out,
        );
      return { l, sales, paid };
    });
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>أداء الموزعين</h1>
          <p>
            مبيعات وتحصيل ومديونية فعلية؛ نسبة التحصيل قد تشمل سداد أرصدة قديمة.
          </p>
        </div>
      </div>
      <details className="panel">
        <summary>تحديد حسابات الموزعين لهذه المعاينة</summary>
        <div className="picker-list">
          {customers.map((e) => (
            <label key={e.id}>
              <input
                type="checkbox"
                checked={selected.includes(e.id)}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? [...selected, e.id]
                      : selected.filter((x) => x !== e.id),
                  )
                }
              />
              {e.name}
            </label>
          ))}
        </div>
      </details>
      <Panel title="المبيعات والتحصيل خلال الفترة">
        <Table
          rows={ls.sort((a, b) => b.sales - a.sales)}
          onRow={(x) => onEntity(x.l.entity)}
          columns={[
            { label: "الموزع", render: (x) => x.l.entity.name },
            { label: "المبيعات ETB", render: (x) => fmt(x.sales) },
            { label: "التحصيل ETB", render: (x) => fmt(x.paid) },
            {
              label: "التحصيل / المبيعات",
              render: (x) =>
                x.sales ? fmt((x.paid / x.sales) * 100, 1) + "%" : "لا مبيعات",
            },
            { label: "الرصيد ETB", render: (x) => fmt(x.l.closing) },
          ]}
        />
      </Panel>
      <p className="muted">
        التحديد قابل للمراجعة هنا ولا يغيّر تصنيف أي عميل في الماستر.
      </p>
    </>
  );
}
export function Alerts(v: ViewProps) {
  const { m, onRow } = v;
  const [severity, setSeverity] = useState(""),
    [q, setQ] = useState("");
  const open = rows(m.snapshot, "August Close Control", 34)
    .filter(
      (r) =>
        str(r["Issue ID"]).startsWith("OPEN-") &&
        !str(r["الحالة"]).includes("RESOLVED"),
    )
    .map((r) => ({
      id: r._key,
      severity: "medium",
      title: str(r["النوع"]),
      detail: str(r["المطلوب"]),
      source: r,
    }));
  const issues = [...m.issues, ...open].filter(
    (x) =>
      (!severity || x.severity === severity) &&
      (x.title + " " + x.detail).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>التنبيهات والمتابعة</h1>
          <p>
            استثناءات محددة من الحسابات وملف الإقفال؛ دون إنشاء قيود أو تغيير
            قرارات المراجعة.
          </p>
        </div>
        <Pill tone="amber">{issues.length} بند</Pill>
      </div>
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="بحث التنبيهات"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في البنود…"
          />
        </label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          aria-label="أهمية التنبيه"
        >
          <option value="">كل المستويات</option>
          <option value="high">يؤثر على اكتمال الرقم</option>
          <option value="medium">يحتاج متابعة</option>
          <option value="info">معلومة</option>
        </select>
      </div>
      <div className="alerts-list">
        {issues.map((x) => (
          <article className="alert-card" key={x.id}>
            <span
              className={
                "icon-tile " + (x.severity === "high" ? "rose" : "amber")
              }
            >
              <AlertTriangle size={21} />
            </span>
            <div>
              <h3>{x.title}</h3>
              <p>{x.detail}</p>
              {x.source && (
                <button
                  className="text-button"
                  onClick={() => onRow(x.source!)}
                >
                  تفاصيل السجل <ExternalLink size={15} />
                </button>
              )}
            </div>
            {x.source && <Source row={x.source} />}
          </article>
        ))}
      </div>
      {!issues.length && <Empty text="لا توجد تنبيهات تطابق الفلتر." />}
    </>
  );
}
export function Close(v: ViewProps) {
  const { m, p, onReport } = v;
  const [tab, setTab] = useState("banks"),
    [actual, setActual] = useState<Record<string, string>>({});
  const ls = m.entities
    .filter(
      (e) =>
        e.kind === (tab === "banks" ? "bank" : "item") &&
        (tab !== "banks" || e.currency === p.currency) &&
        (tab === "banks" || !p.branch || e.branch === p.branch),
    )
    .map((e) => m.ledger(e, p));
  const getActual = (e: Entity) => {
    const key = p.to + e.kind + e.id;
    if (key in actual) return num(actual[key]);
    if (tab === "banks" && p.to === "2026-08-31")
      return num(
        m.close.find((r) => r["Bank ID"] === e.id)?.[
          "Statement 31-Aug (input)"
        ],
      );
    if (tab === "banks" && p.to === "2026-07-31")
      return num(
        m.close.find((r) => r["Bank ID"] === e.id)?.[
          "Statement 31-Jul (input)"
        ],
      );
    return null;
  };
  const compareRows = ls.map((l) => ({ l, actual: getActual(l.entity) }));
  const matched = compareRows.filter(
    (x) =>
      x.actual !== null &&
      x.l.closing !== null &&
      Math.abs(x.actual - x.l.closing) < 0.01,
  ).length;
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>المطابقة وإقفال الشهر</h1>
          <p>رصيد النظام مقابل كشف البنك أو الجرد في نهاية الفترة.</p>
        </div>
        <Pill tone="amber">نسخة مراجعة</Pill>
      </div>
      <div className="notice">
        الكشوف والجرد غير المدخلين لا يُفترضان صفرًا. يمكنك تجربة الأرقام هنا
        وتصدير المقارنة؛ المدخلات مؤقتة ولا تُرحّل إلى الماستر.
      </div>
      <div className="toolbar">
        <div className="segmented">
          <button
            className={tab === "banks" ? "active" : ""}
            onClick={() => setTab("banks")}
          >
            البنوك
          </button>
          <button
            className={tab === "stock" ? "active" : ""}
            onClick={() => setTab("stock")}
          >
            الجرد
          </button>
        </div>
        <Pill tone="teal">{matched} مطابق</Pill>
        <Pill tone="amber">
          {compareRows.filter((x) => x.actual === null).length} يحتاج كشفًا
        </Pill>
        <button
          onClick={() =>
            onReport({
              title: tab === "banks" ? "مطابقة البنوك" : "مطابقة الجرد",
              currency:
                tab === "banks" ? p.currency : "الوحدات الصغيرة حسب الصنف",
              headers: [
                "الحساب / الصنف",
                "الوحدة / العملة",
                "رصيد النظام",
                "الكشف / الجرد",
                "الفرق",
                "الحالة",
              ],
              rows: compareRows.map(({ l, actual: a }) => [
                l.entity.name,
                tab === "banks"
                  ? l.entity.currency
                  : unitName(l.entity.smallUnit || ""),
                l.closing,
                a,
                a === null || l.closing === null ? null : a - l.closing,
                a === null
                  ? "كشف مطلوب"
                  : l.closing === null
                    ? "افتتاحي مطلوب"
                    : Math.abs(a - l.closing) < 0.01
                      ? "مطابق"
                      : "فرق مفتوح",
              ]),
              notes:
                "مدخلات المقارنة هنا للمراجعة ولا تنشئ قيد تسوية. كل فرق يتطلب مستندًا واعتمادًا قبل الترحيل.",
            })
          }
        >
          <Download size={18} />
          تصدير المطابقة
        </button>
      </div>
      <Panel title={`المطابقة في ${p.to}`}>
        <Table
          rows={compareRows}
          columns={[
            {
              label: tab === "banks" ? "البنك" : "الصنف",
              render: ({ l }) => (
                <>
                  <strong>{l.entity.name}</strong>
                  <small className="block">
                    {tab === "banks"
                      ? l.entity.currency
                      : unitName(l.entity.smallUnit || "")}
                  </small>
                </>
              ),
            },
            {
              label: "رصيد النظام",
              render: ({ l }) => fmt(l.closing, tab === "banks" ? 2 : 3),
            },
            {
              label: tab === "banks" ? "رصيد الكشف" : "الجرد بالوحدة الصغيرة",
              render: ({ l, actual: a }) => (
                <input
                  className="compare-input"
                  aria-label={`الرصيد الفعلي ${l.entity.id}`}
                  type="number"
                  step="any"
                  placeholder="لم يُدخل"
                  value={
                    actual[p.to + l.entity.kind + l.entity.id] ??
                    (a === null ? "" : String(a))
                  }
                  onChange={(e) =>
                    setActual({
                      ...actual,
                      [p.to + l.entity.kind + l.entity.id]: e.target.value,
                    })
                  }
                />
              ),
            },
            {
              label: "الفرق",
              render: ({ l, actual: a }) =>
                a === null || l.closing === null ? "—" : fmt(a - l.closing, 3),
            },
            {
              label: "الحالة",
              render: ({ l, actual: a }) => (
                <Pill
                  tone={
                    a !== null &&
                    l.closing !== null &&
                    Math.abs(a - l.closing) < 0.01
                      ? "teal"
                      : "amber"
                  }
                >
                  {a === null
                    ? "كشف مطلوب"
                    : l.closing === null
                      ? "افتتاحي مطلوب"
                      : Math.abs(a - l.closing) < 0.01
                        ? "مطابق"
                        : "فرق مفتوح"}
                </Pill>
              ),
            },
            {
              label: "المصدر",
              render: ({ l }) => <Source row={l.entity.source} />,
            },
          ]}
        />
      </Panel>
      <Panel title="مرجع الإقفال">
        <p className="muted">
          اللقطة التاريخية في Final Reconciliation منفصلة عن مطابقة نهاية أغسطس.
          رصيد بداية الشهر يُحسب من الحركات السابقة المؤرخة.
        </p>
        <a
          className="button"
          href="#synthetic-demo"
          target="_blank"
          rel="noreferrer"
        >
          فتح تحكم أغسطس في الماستر <ExternalLink size={16} />
        </a>
      </Panel>
    </>
  );
}
export function Reports(v: ViewProps) {
  const { m, p, onReport } = v;
  const reports = [
    [
      "executive",
      "الملخص التنفيذي",
      "المبيعات والتحصيل والمصاريف وأرصدة نهاية الفترة",
    ],
    ["bank", "كشف أرصدة البنوك", "افتتاحي ووارد وصادر وختامي بكل عملة"],
    ["customer", "ذمم العملاء", "المستحقات والأرصدة الدائنة منفصلة"],
    ["item", "جرد المخزون", "كل صنف بوحدته ومستودعه"],
    ["account", "الحسابات والدولار", "له وعليه والرصيد لكل جهة وعملة"],
  ];
  function open(kind: string, title: string) {
    if (kind === "executive") {
      const t = periodTotals(m, p);
      onReport({
        title,
        headers: ["المؤشر", "القيمة", "العملة"],
        rows: [
          ["المبيعات", t.sales, p.currency],
          ["تحصيلات العملاء", t.payments, p.currency],
          ["المصاريف المسجلة", t.expenses, p.currency],
          ...["ETB", "USD"].map(
            (currency) =>
              [
                "أرصدة البنوك المعروفة",
                total(
                  m.entities
                    .filter(
                      (e) =>
                        e.kind === "bank" &&
                        e.id !== "TRANSFER-CLEARING" &&
                        e.currency === currency,
                    )
                    .map((e) => m.ledger(e, p)),
                  (l) => l.closing || 0,
                ),
                currency,
              ] as [string, number, string],
          ),
        ],
        currency: "كل عملة منفصلة",
        notes:
          "نسخة مراجعة: السيولة تستبعد المقاصة والحسابات ناقصة الافتتاحي، ولا تشمل الدفعات بلا تاريخ. المصاريف ليست قائمة أرباح وخسائر.",
      });
      return;
    }
    const es = m.entities
      .filter(
        (e) =>
          e.kind === kind &&
          (kind !== "item" || !p.branch || e.branch === p.branch) &&
          (kind === "item" || kind === "account" || e.currency === p.currency),
      )
      .map((e) => m.ledger(e, p));
    onReport({
      title,
      currency:
        kind === "item"
          ? "حسب وحدة كل صنف"
          : kind === "account"
            ? "ETB / USD"
            : p.currency,
      headers: [
        "الحساب / الصنف",
        "العملة / الوحدة",
        "افتتاح الفترة",
        "وارد / له",
        "صادر / عليه",
        "ختام الفترة",
        "بلا تاريخ",
      ],
      rows: es.map((l) => [
        l.entity.name,
        kind === "item"
          ? unitName(l.entity.smallUnit || "")
          : l.entity.currency,
        l.opening,
        l.incoming,
        l.outgoing,
        l.closing,
        l.undated,
      ]),
      notes:
        "الأرصدة الكاملة للحسابات على مستوى الشركة. التقرير مؤرخ؛ الحقول الناقصة لا تساوي صفرًا.",
    });
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>التقارير</h1>
          <p>نفس الحسابات والفترة المستخدمة في الشاشة، جاهزة للطباعة وExcel.</p>
        </div>
        <Pill>
          {p.from} — {p.to}
        </Pill>
      </div>
      <div className="report-grid">
        {reports.map(([kind, title, description]) => (
          <button
            key={kind}
            className="report-card"
            onClick={() => open(kind, title)}
          >
            <span className="icon-tile">
              <FileText size={25} />
            </span>
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="text-button">
              معاينة وتصدير <Download size={16} />
            </span>
          </button>
        ))}
      </div>
      <div className="notice">
        تقرير التسويات متاح في صفحة جيبوتي، وتقارير المقارنة في صفحة إقفال
        الشهر. ملف PDF يُحفظ من نافذة الطباعة.
      </div>
    </>
  );
}
export function Settings() { return <Panel title="Public demo"><p>Live connectors, credentials and account management are disabled. All data is synthetic and bundled locally.</p></Panel>; }
export function Assistant({ p }: { p: Period }) {
  const [q, setQ] = useState(""),
    [answer, setAnswer] = useState(""),
    [busy, setBusy] = useState(false),
    [mode, setMode] = useState(""),
    [error, setError] = useState("");
  async function ask(question: string) {
    setBusy(true);
    setError("");
    try {
      const r = await api("insights", { question, period: p });
      setAnswer(r.answer);
      setMode(r.mode);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>مساعد الإدارة</h1>
          <p>ملخصات بالأرقام المعتمدة وفترتها وعملتها.</p>
        </div>
      </div>
      <Panel
        title="اسأل عن الفترة المحددة"
        subtitle={`${p.from} إلى ${p.to} · ${p.currency}`}
      >
        <div className="quick-prompts">
          {[
            "لخص حركة الشهر للإدارة",
            "ما الحسابات والتسويات التي تحتاج متابعة؟",
            "اشرح البنود المفتوحة التي تؤثر على إقفال الشهر",
          ].map((x) => (
            <button
              key={x}
              disabled={busy}
              onClick={() => {
                setQ(x);
                ask(x);
              }}
            >
              {x}
            </button>
          ))}
        </div>
        <form
          className="assistant-form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <textarea
            aria-label="سؤالك للإدارة"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="اكتب سؤالك…"
            maxLength={1500}
          />
          <button className="primary" disabled={busy || !q.trim()}>
            <Send size={18} />
            {busy ? "جاري التحليل…" : "تحليل"}
          </button>
        </form>
        {error && <div className="notice warning">{error}</div>}
        {answer && (
          <div className="assistant-answer">
            <Pill>{mode === "local" ? "ملخص حسابي محلي" : "تحليل Gemini"}</Pill>
            <p>{answer}</p>
            <a
              href="#synthetic-demo"
              target="_blank"
              rel="noreferrer"
            >
              مصدر البيانات: الماستر المعتمد
            </a>
          </div>
        )}
      </Panel>
    </>
  );
}
