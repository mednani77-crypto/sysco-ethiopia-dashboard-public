import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  Printer,
  ArrowUpLeft,
  ChevronRight,
  ChevronLeft,
  Search,
} from "lucide-react";
import { Cell, Row, sourceUrl, fmt, Period } from "./model";
export { demoApi as api } from "./demo";
export function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"pill " + tone}>{children}</span>;
}
export function Money({
  value,
  currency = "ETB",
  decimals = 2,
}: {
  value: number | null;
  currency?: string;
  decimals?: number;
}) {
  return (
    <span
      className={"money " + (value !== null && value < 0 ? "negative" : "")}
    >
      <bdi>{fmt(value, decimals)}</bdi>
      {value !== null && <small>{currency}</small>}
    </span>
  );
}
export function Metric({
  label,
  value,
  unit = "ETB",
  icon: Icon,
  tone = "violet",
  note,
  onClick,
}: {
  label: string;
  value: number | null;
  unit?: string;
  icon: any;
  tone?: string;
  note?: string;
  onClick?: () => void;
}) {
  return (
    <button className={"metric " + tone} onClick={onClick} disabled={!onClick}>
      <div className="metric-top">
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <Money value={value} currency={unit} />
      <div className="metric-note">
        {note || "خلال الفترة المحددة"}
        {onClick && <ArrowUpLeft size={16} />}
      </div>
    </button>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Empty({
  text = "لا توجد عمليات مطابقة لهذه الفترة.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <Search size={30} />
      <p>{text}</p>
    </div>
  );
}
export function Source({ row }: { row: Row }) {
  return (
    <a
      href={sourceUrl(row)}
      target="_blank"
      rel="noreferrer"
      className="source-link"
      aria-label={`فتح الصف ${row._row} في الماستر`}
    >
      <ArrowUpLeft size={15} />
      المصدر
    </a>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button aria-label="إغلاق" onClick={onClose}>
          <X size={21} />
        </button>
      </header>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
export type Column<T> = { label: string; render: (row: T) => React.ReactNode };
export function Table<T>({
  rows,
  columns,
  onRow,
  pageSize = 30,
}: {
  rows: T[];
  columns: Column<T>[];
  onRow?: (r: T) => void;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows.length]);
  const max = Math.max(0, Math.ceil(rows.length / pageSize) - 1),
    actual = Math.min(page, max);
  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows
              .slice(actual * pageSize, (actual + 1) * pageSize)
              .map((r, i) => (
                <tr key={i} className={onRow ? "clickable" : ""}>
                  {columns.map((c, j) => (
                    <td key={j}>
                      {j === 0 && onRow ? (
                        <button
                          className="cell-button"
                          onClick={() => onRow(r)}
                        >
                          {c.render(r)}
                        </button>
                      ) : (
                        c.render(r)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <Empty />}
      {rows.length > pageSize && (
        <div className="pagination">
          <span>
            {actual * pageSize + 1}–
            {Math.min((actual + 1) * pageSize, rows.length)} من {rows.length}
          </span>
          <button
            onClick={() => setPage(actual - 1)}
            disabled={actual === 0}
            aria-label="السابق"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setPage(actual + 1)}
            disabled={actual === max}
            aria-label="التالي"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}
    </>
  );
}
export type Report = {
  title: string;
  headers: string[];
  rows: Cell[][];
  notes?: string;
  currency?: string;
};
export async function exportExcel(report: Report, p: Period) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SYSCO Ethiopia";
  const sheet = workbook.addWorksheet("SYSCO", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
  });
  sheet.addRow([report.title]);
  sheet.addRow([
    p.from,
    p.to,
    p.branch || "كل الشركة",
    report.currency || p.currency,
  ]);
  sheet.addRow([report.notes || ""]);
  sheet.addRow(report.headers);
  for (const r of report.rows) sheet.addRow(r.map((x) => x ?? ""));
  sheet.columns.forEach((c) => (c.width = 24));
  sheet.getRow(1).font = { bold: true, size: 18, color: { argb: "FF7765F5" } };
  sheet.getRow(4).eachCell((c) => {
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF101527" },
    };
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });
  sheet.eachRow((r) =>
    r.eachCell((c) => {
      c.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      if (typeof c.value === "number") c.numFmt = "#,##0.00";
    }),
  );
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `SYSCO-${p.from}-${report.title}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ReportView({
  report,
  period,
  onClose,
}: {
  report: Report;
  period: Period;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title="معاينة التقرير" onClose={onClose} wide>
      <div className="report-actions">
        <button className="primary" onClick={() => window.print()}>
          <Printer size={18} />
          طباعة / حفظ PDF
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await exportExcel(report, period);
            } catch {
              setError("تعذر تصدير Excel.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download size={18} />
          {busy ? "جاري التصدير…" : "تنزيل Excel"}
        </button>
        {error && <span>{error}</span>}
      </div>
      <article className="print-document">
        <div className="report-brand">
          <span className="brand-mark">S</span>
          <div>
            <strong>SYSCO ETHIOPIA</strong>
            <p>الإدارة المالية والتشغيلية</p>
          </div>
        </div>
        <h1>{report.title}</h1>
        <p>
          الفترة: <bdi>{period.from}</bdi> إلى <bdi>{period.to}</bdi> ·{" "}
          {period.branch || "كل الشركة"} · {report.currency || period.currency}
        </p>
        {report.notes && <p className="report-note">{report.notes}</p>}
        <table>
          <thead>
            <tr>
              {report.headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{typeof c === "number" ? fmt(c) : (c ?? "—")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <footer>
          نسخة مراجعة · تاريخ الإصدار{" "}
          {new Date().toLocaleString("ar-EG", {
            timeZone: "Africa/Addis_Ababa",
          })}{" "}
          · الأرقام حسب الفترة الموضحة؛ البنود المفتوحة لا تُعد مطابقة.
        </footer>
      </article>
    </Modal>
  );
}
