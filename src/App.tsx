import React, { useEffect, useMemo, useReducer, useState } from "react";
import {
  LayoutDashboard,
  Landmark,
  Users,
  Package,
  Receipt,
  ArrowLeftRight,
  Ship,
  Coins,
  FileCheck2,
  FileText,
  Bell,
  Settings as SettingsIcon,
  Sparkles,
  Search,
  RefreshCw,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  HelpCircle,
  ChevronDown,
  LockKeyhole,
  ArrowUpLeft,
  Download,
} from "lucide-react";
import {
  makeModel,
  Snapshot,
  Entity,
  Row,
  fmt,
  str,
  branchName,
  START,
  MASTER_ID,
} from "./model";
import {
  initialPeriodSelection,
  masterDateRange,
  periodReducer,
  selectedPeriod,
} from "./period";
import { api, Pill, Modal, Report, ReportView, Empty } from "./ui";
import { ClearingView, ClearingHome, useClearing } from "./clearingView";
import {
  Home,
  Entities,
  Inventory,
  Operations,
  Settlements,
  ViewProps,
} from "./views";
import {
  Detail,
  RowDetail,
  Staff,
  Alerts,
  Close,
  Reports,
  Settings,
  Assistant,
} from "./reviewViews";
type User = { id: string; name: string; role: "admin" | "owner" | "viewer" };
const nav = [
  ["home", "الرئيسية", LayoutDashboard],
  ["banks", "البنوك", Landmark],
  ["customers", "العملاء", Users],
  ["inventory", "المخزون", Package],
  ["operations", "العمليات", ArrowLeftRight],
  ["expenses", "المصاريف", Receipt],
  ["accounts", "الحسابات والدولار", Coins],
  ["settlements", "جيبوتي والتسويات", Ship],
  ["clearing", "الحوالات والمعلقات", Receipt],
  ["staff", "الموزعون", Users],
  ["close", "إقفال الشهر", FileCheck2],
  ["reports", "التقارير", FileText],
  ["alerts", "التنبيهات", Bell],
  ["assistant", "مساعد الإدارة", Sparkles],
  ["settings", "الإعدادات", SettingsIcon],
] as const;
export default function App() {
  const [periodSelection, selectPeriod] = useReducer(
    periodReducer,
    undefined,
    initialPeriodSelection,
  );
  const [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(false),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [status, setStatus] = useState<any>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState("home"),
    [mobile, setMobile] = useState(false),
    [theme, setTheme] = useState(
      localStorage.getItem("sysco-v2-theme") || "dark",
    ),
    [entity, setEntity] = useState<Entity | null>(null),
    [row, setRow] = useState<Row | null>(null),
    [report, setReport] = useState<Report | null>(null),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [tour, setTour] = useState(false),
    [notifications, setNotifications] = useState(false),
    [install, setInstall] = useState<any>(null);
  useEffect(() => {
    api("me")
      .then((x) => setUser(x.user))
      .catch(() => {})
      .finally(() => setAuthReady(true));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sysco-v2-theme", theme);
  }, [theme]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearch((x) => !x);
      }
    };
    const before = (e: Event) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener("keydown", fn);
    window.addEventListener("beforeinstallprompt", before);
    return () => {
      window.removeEventListener("keydown", fn);
      window.removeEventListener("beforeinstallprompt", before);
    };
  }, []);
  async function load() {
    try {
      const r = await api("master-snapshot");
      setSnapshot(r.snapshot);
      setStatus(r.status);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!user) return;
    load();
    if (user.role === "viewer") setPage("inventory");
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 120000);
    return () => clearInterval(id);
  }, [user]);
  const parsed = useMemo(() => {
    if (!snapshot) return { m: null, error: "" };
    try {
      return { m: makeModel(snapshot), error: "" };
    } catch (e) {
      return { m: null, error: (e as Error).message };
    }
  }, [snapshot]);
  const m = parsed.m;
  const fullRange = useMemo(
    () => masterDateRange(m?.operations.map((entry) => entry.date) ?? []),
    [m],
  );
  const period = selectedPeriod(periodSelection, fullRange);
  const clearing = useClearing(
    !!user && user.role !== "viewer" && ["home", "clearing"].includes(page),
    snapshot?.capturedAt,
    period.to,
  );
  useEffect(() => {
    selectPeriod({ type: "full" });
  }, [user?.id]);
  function go(p: string) {
    setPage(p);
    setMobile(false);
    setEntity(null);
    setRow(null);
    window.scrollTo({ top: 0 });
  }
  async function refresh() {
    setBusy(true);
    try {
      const r = await api("sync", {});
      setSnapshot(r.snapshot);
      setStatus(r.status);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const allowed = nav.filter(([id]) =>
    user?.role === "viewer"
      ? id === "inventory"
      : user?.role === "owner"
        ? id !== "settings"
        : true,
  );
  if (!authReady)
    return (
      <div className="loading-screen">
        <div className="brand-mark">S</div>
        <p>جاري فتح SYSCO…</p>
      </div>
    );
  if (!user)
    return (
      <Login
        onLogin={(u) => {
          setUser(u);
          setPage(u.role === "viewer" ? "inventory" : "home");
        }}
      />
    );
  const props: ViewProps = m
    ? {
        m,
        p: period,
        onEntity: setEntity,
        onRow: setRow,
        onReport: setReport,
        onNav: go,
      }
    : (null as any);
  const branches = m
    ? [...new Set(m.operations.map((e) => e.branch).filter(Boolean))].sort()
    : [];
  const filteredEntities = m
    ? m.entities
        .filter(
          (e) =>
            (user.role !== "viewer" || e.kind === "item") &&
            query &&
            [e.id, e.name, e.branch].some((s) =>
              s.toLowerCase().includes(query.toLowerCase()),
            ),
        )
        .slice(0, 15)
    : [];
  const filteredRows = m
    ? m.operations
        .filter(
          (e) =>
            query &&
            [e.id, e.ref, e.description, str(e.source.Note)].some((s) =>
              s.toLowerCase().includes(query.toLowerCase()),
            ),
        )
        .slice(0, 25)
    : [];
  const currentTitle = nav.find((x) => x[0] === page)?.[1] || "SYSCO";
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go(user.role === "viewer" ? "inventory" : "home");
          }}
        >
          <span className="brand-mark">S</span>
          <div>
            <strong>
              SYSCO<span>ETHIOPIA</span>
            </strong>
            <small>الإدارة المالية</small>
          </div>
        </a>
        <button
          className="mobile-close"
          aria-label="إغلاق القائمة"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <span className="nav-label">مساحة الإدارة</span>
        <nav>
          {allowed.map(([id, label, Icon], i) => (
            <React.Fragment key={id}>
              {id === "accounts" && (
                <span className="nav-label division">الحسابات والإقفال</span>
              )}
              {id === "assistant" && (
                <span className="nav-label division">الأدوات</span>
              )}
              <button
                className={page === id ? "active" : ""}
                onClick={() => go(id)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {id === "alerts" && !!m?.issues.length && (
                  <em>{m.issues.length}</em>
                )}
              </button>
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-avatar">م</div>
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.role === "admin"
                ? "مدير النظام"
                : user.role === "owner"
                  ? "الشريك"
                  : "عرض المخزون"}
            </small>
          </div>
          <button
            aria-label="تسجيل الخروج"
            onClick={async () => {
              await api("logout", {});
              setUser(null);
              setSnapshot(null);
              setEntity(null);
              setRow(null);
              setReport(null);
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {mobile && (
        <div className="mobile-backdrop" onClick={() => setMobile(false)} />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="hamburger"
              aria-label="فتح القائمة"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span>مساحة العمل</span>
            <ChevronDown size={14} />
            <strong>{currentTitle}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="global-search"
              onClick={() => {
                setSearch(true);
                setQuery("");
              }}
            >
              <Search size={17} />
              <span>بحث شامل</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              aria-label="تغيير المظهر"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button aria-label="شرح التطبيق" onClick={() => setTour(true)}>
              <HelpCircle size={19} />
            </button>
            <button
              aria-label="مركز الإشعارات"
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {!!m?.issues.length && <i className="badge-dot" />}
            </button>
            {install && (
              <button
                aria-label="تثبيت التطبيق"
                onClick={async () => {
                  await install.prompt();
                  setInstall(null);
                }}
              >
                <Download size={19} />
              </button>
            )}
          </div>
        </header>
        <div className="filterbar">
          <div className="date-controls">
            <label>
              <span>من</span>
              <input
                aria-label="بداية الفترة"
                type="date"
                min={START}
                max={period.to}
                value={period.from}
                onChange={(e) =>
                  selectPeriod({
                    type: "date",
                    field: "from",
                    value: e.target.value,
                    range: fullRange,
                  })
                }
              />
            </label>
            <span className="date-divider">—</span>
            <label>
              <span>إلى</span>
              <input
                aria-label="نهاية الفترة"
                type="date"
                min={period.from}
                value={period.to}
                onChange={(e) =>
                  selectPeriod({
                    type: "date",
                    field: "to",
                    value: e.target.value,
                    range: fullRange,
                  })
                }
              />
            </label>
          </div>
          <button
            aria-label="عرض كامل فترة الماستر"
            aria-pressed={periodSelection.dates === null}
            title="من بداية يونيو حتى آخر حركة"
            onClick={() => selectPeriod({ type: "full" })}
          >
            كامل الفترة
          </button>
          <select
            aria-label="الفرع"
            value={period.branch}
            onChange={(e) =>
              selectPeriod({ type: "branch", value: e.target.value })
            }
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {branchName(b)}
              </option>
            ))}
          </select>
          <div className="segmented currencies">
            {["ETB", "USD"].map((c) => (
              <button
                key={c}
                className={period.currency === c ? "active" : ""}
                onClick={() => selectPeriod({ type: "currency", value: c })}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="sync-status">
            <Pill
              tone={
                status.mode === "live" && !status.lastError ? "teal" : "amber"
              }
            >
              {status.lastError
                ? "تعذر التحديث"
                : status.mode === "live"
                  ? "متصل بالماستر"
                  : "نسخة مؤرخة"}
            </Pill>
            {user.role !== "viewer" && (
              <button
                aria-label="تحديث البيانات"
                disabled={busy}
                onClick={refresh}
              >
                <RefreshCw size={17} className={busy ? "spin" : ""} />
                <span>تحديث</span>
              </button>
            )}
          </div>
        </div>
        <main><div className="notice" role="status">SYNTHETIC PUBLIC DEMO — all names, amounts and transactions are invented. No live connections.</div>
          {error && (
            <div className="notice warning" role="alert">
              {error}
              <button aria-label="إغلاق التنبيه" onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {(status.mode !== "live" || status.lastError) && (
            <div className="snapshot-banner">
              <span>
                بيانات الماستر في{" "}
                {snapshot
                  ? new Date(snapshot.capturedAt).toLocaleString("ar-EG", {
                      timeZone: "Africa/Addis_Ababa",
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "—"}{" "}
                ·{" "}
                {status.lastError
                  ? "لم ينجح آخر تحديث؛ تُعرض آخر نسخة متاحة."
                  : "التحديث التلقائي ينتظر تفعيل الربط."}
              </span>
              {user.role === "admin" && (
                <button onClick={() => go("settings")}>
                  تفعيل الربط <ArrowUpLeft size={15} />
                </button>
              )}
            </div>
          )}
          {parsed.error && <div className="notice warning">{parsed.error}</div>}
          {!m ? (
            <Empty text="البيانات غير متاحة. تحقق من مصدر الماستر أو حاول التحديث." />
          ) : (
            <>
              {page === "home" && <Home {...props} />}{" "}
              {page === "home" && user.role !== "viewer" && (
                <ClearingHome
                  resource={clearing}
                  onOpen={() => go("clearing")}
                />
              )}
              {page === "clearing" && user.role !== "viewer" && (
                <ClearingView resource={clearing} p={period} />
              )}
              {page === "banks" && <Entities {...props} kind="bank" />}
              {page === "customers" && <Entities {...props} kind="customer" />}
              {page === "accounts" && <Entities {...props} kind="account" />}
              {page === "inventory" && <Inventory {...props} />}{" "}
              {page === "operations" && <Operations {...props} />}{" "}
              {page === "expenses" && <Operations {...props} expensesOnly />}
              {page === "settlements" && <Settlements {...props} />}{" "}
              {page === "staff" && <Staff {...props} />}{" "}
              {page === "close" && <Close {...props} />}{" "}
              {page === "reports" && <Reports {...props} />}{" "}
              {page === "alerts" && <Alerts {...props} />}{" "}
              {page === "assistant" && <Assistant p={period} />}{" "}
              {page === "settings" && user.role === "admin" && <Settings />}
            </>
          )}
          <footer className="app-footer">
            <span>SYSCO ETHIOPIA · الإدارة المالية</span>
            <span>
              آخر بيانات:{" "}
              {snapshot
                ? new Date(snapshot.capturedAt).toLocaleString("ar-EG", {
                    timeZone: "Africa/Addis_Ababa",
                  })
                : "—"}{" "}
              · توقيت إثيوبيا
            </span>
          </footer>
        </main>
        <nav className="bottom-nav">
          {allowed
            .filter((x) =>
              ["home", "banks", "inventory", "settlements"].includes(x[0]),
            )
            .map(([id, label, Icon]) => (
              <button
                key={id}
                className={id === page ? "active" : ""}
                onClick={() => go(id)}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          <button onClick={() => setMobile(true)}>
            <Menu size={20} />
            <span>المزيد</span>
          </button>
        </nav>
      </div>
      {m && entity && (
        <Detail
          m={m}
          p={period}
          entity={entity}
          onClose={() => setEntity(null)}
          onRow={setRow}
          onReport={setReport}
        />
      )}{" "}
      {row && <RowDetail row={row} onClose={() => setRow(null)} />}{" "}
      {report && (
        <ReportView
          report={report}
          period={period}
          onClose={() => setReport(null)}
        />
      )}
      {search && (
        <Modal title="البحث الشامل" onClose={() => setSearch(false)} wide>
          <label className="search-field big">
            <Search />
            <input
              autoFocus
              aria-label="البحث الشامل"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="عميل، بنك، صنف أو مرجع عملية…"
            />
          </label>
          <p className="muted">
            يشمل كل البيانات المحمّلة، خارج فلتر الفترة أيضًا.
          </p>
          <div className="search-results">
            {filteredEntities.map((e) => (
              <button
                key={e.kind + e.id + e.currency}
                onClick={() => {
                  setSearch(false);
                  setEntity(e);
                }}
              >
                <span>
                  <strong>{e.name}</strong>
                  <small>
                    {e.id} · {e.currency}
                  </small>
                </span>
                <ArrowUpLeft size={18} />
              </button>
            ))}
            {filteredRows.map((e) => (
              <button
                key={e.key}
                onClick={() => {
                  setSearch(false);
                  setRow(e.source);
                }}
              >
                <span>
                  <strong>{e.description}</strong>
                  <small>
                    {e.date || "بلا تاريخ"} · {e.ref}
                  </small>
                </span>
                <Pill>{e.type}</Pill>
              </button>
            ))}
          </div>
          {query && !filteredEntities.length && !filteredRows.length && (
            <Empty text="لا توجد نتائج مطابقة." />
          )}
        </Modal>
      )}
      {notifications && (
        <Modal title="مركز الإشعارات" onClose={() => setNotifications(false)}>
          <Pill
            tone={
              status.mode === "live" && !status.lastError ? "teal" : "amber"
            }
          >
            {status.mode === "live"
              ? "المزامنة متصلة"
              : "نسخة مؤرخة من الماستر"}
          </Pill>
          {status.lastError && <p>{status.lastError}</p>}
          <div className="search-results">
            {m?.issues.slice(0, 7).map((x) => (
              <button
                key={x.id}
                onClick={() => {
                  setNotifications(false);
                  go("alerts");
                }}
              >
                <span>
                  <strong>{x.title}</strong>
                  <small>{x.detail}</small>
                </span>
              </button>
            ))}
          </div>
          <button
            className="full-button"
            onClick={() => {
              setNotifications(false);
              go("alerts");
            }}
          >
            فتح البنود المفتوحة
          </button>
        </Modal>
      )}
      {tour && (
        <Modal title="جولة سريعة" onClose={() => setTour(false)}>
          <ol className="tour">
            <li>
              <strong>اختر الفترة</strong>
              <p>المبيعات والمصاريف لحركة الفترة، والأرصدة في نهايتها.</p>
            </li>
            <li>
              <strong>افتح أي بطاقة</strong>
              <p>ستجد كشفًا تراكميًا ورابط الصف الأصلي في الماستر.</p>
            </li>
            <li>
              <strong>تابع جيبوتي</strong>
              <p>التمويل والدولار والعمولات وصافي الوصول مراحل منفصلة.</p>
            </li>
            <li>
              <strong>راجع الإقفال</strong>
              <p>قارن الكشوف والجرد، ثم صدّر تقرير الإدارة.</p>
            </li>
          </ol>
          <button className="primary" onClick={() => setTour(false)}>
            بدء الاستخدام
          </button>
        </Modal>
      )}
    </div>
  );
}
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [id, setId] = useState("demo"),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <div className="login-art">
        <span className="eyebrow">SYSCO ETHIOPIA</span>
        <h1>
          أرقام واضحة.
          <br />
          قرارات بثقة.
        </h1>
        <p>
          البنوك، العملاء، المخزون وتسويات جيبوتي
          <br />
          في مساحة إدارة واحدة.
        </p>
        <div className="login-rings">
          <div />
          <div />
          <div />
          <span className="brand-mark">S</span>
        </div>
      </div>
      <div className="login-form-wrap">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const x = await api("login", { id, password });
              onLogin(x.user);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="brand-mark">S</span>
          <h2>مرحبًا بك في SYSCO</h2>
          <p>سجّل الدخول إلى لوحة الإدارة المالية.</p>
          <label>
            اسم المستخدم
            <input
              autoComplete="username"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              dir="ltr"
            />
          </label>
          <label>
            كلمة المرور
            <input
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              dir="ltr"
            />
          </label>
          {error && (
            <div className="notice warning" role="alert">
              {error}
            </div>
          )}
          <button className="primary" disabled={busy}>
            <LockKeyhole size={18} />
            {busy ? "جاري الدخول…" : "تسجيل الدخول"}
          </button>
          <small>وصول خاص للإدارة · الماستر للقراءة فقط</small>
        </form>
      </div>
    </div>
  );
}
