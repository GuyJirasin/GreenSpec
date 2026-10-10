import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  createContext,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Leaf,
  LayoutDashboard,
  Files,
  ArrowRight,
  Plus,
  LogOut,
  Bell,
  Check,
  FileText,
  ArrowLeft,
  ShieldCheck,
  Download,
  Users,
  Package,
  Menu,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  db,
  configured,
  checked,
  rows,
  rpc,
  invoke,
  mutate,
  requestId,
  checksum,
  download,
  exportFile,
  money,
  stamp,
} from "./api";
import "./style.css";
import F1Screens, { HomeDashboard, stages, selectedPayload } from "./F1Screens";
import LandingPage from "./LandingPage";
import { enterGuest } from "./guest";
import { LanguageProvider, LanguageSwitcher, useLanguage } from "./i18n";
function bangkokInput(value) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (key) => parts.find((p) => p.type === key)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
function bangkokUTC(value) {
  return value ? new Date(`${value}:00+07:00`).toISOString() : null;
}

const tabs = [
  ["documents", "Documents"],
  ["review", "TOR Analysis"],
  ["revision", "Revised document"],
  ["execution", "Project work"],
  ["members", "Members"],
];
const defaultData = {};
const projectCache = new Map();
const cacheTTL = 30000;
const feature1Tables = ["documents", "document_versions", "analysis_runs", "recommendations", "recommendation_options", "reviews", "feedback", "decision_sets", "decision_items", "document_revisions", "packages"];
const executionTables = ["documents", "document_versions", "packages", "tasks", "milestones", "procurements", "implementation_entries", "issues", "evidence_files", "verifications", "actual_results", "comments", "activity_events"];
function mergeRecords(previous = [], incoming = [], preserveTerminal = false) {
  return incoming.map(row => {
    const old = previous.find(x => x.id === row.id);
    if (old && (Number(old.row_version || 0) > Number(row.row_version || 0) || Number(old.review_epoch || 0) > Number(row.review_epoch || 0) || (preserveTerminal && old.status && !["QUEUED", "PROCESSING"].includes(old.status.toUpperCase()) && ["QUEUED", "PROCESSING"].includes(row.status?.toUpperCase())))) return old;
    return row;
  });
}
const DraftContext = createContext(null);
const dirtyForms = new Set();
function Badge({ children, tone = "" }) {
  const { t } = useLanguage();
  const labels = {COMPLETED:"Ready",APPROVED:"Approved",REJECTED:"Rejected",UNREVIEWED:"Not reviewed",READY:"Ready",QUEUED:"Waiting",PROCESSING:"Analysing",COMPLETE:"Complete",PARTIAL:"Some sources failed",FAILED:"Failed",DRAFT:"Draft",ORDERED:"Ordered",DELIVERED:"Delivered",INSTALLED:"Installed",NOT_STARTED:"Not started",IN_PROGRESS:"In progress",VERIFIED:"Checked",OPEN:"Open",CLOSED:"Closed",BLOCKING:"Blocking",owner:"Owner",editor:"Editor",viewer:"Read only"};
  return <span className={`badge ${tone}`}>{typeof children === "string" ? t(labels[children] || children) : children}</span>;
}
function Empty({ title, children }) {
  const { t } = useLanguage();
  return (
    <div className="empty">
      <Leaf size={28} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Form({
  fields,
  onSubmit,
  label = "Save",
  initial = {},
  disabled = false,
  autoSave = false,
  draftKey = "",
  onDirtyChange,
}) {
  const { t } = useLanguage();
  const [values, setValues] = useState(initial),
    [dirty, setDirty] = useState(false),
    [recovery, setRecovery] = useState(null),
    [saving, setSaving] = useState(false);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty]);
  const scope = useContext(DraftContext);
  const storageKey = scope?.user
    ? `greenspec:draft:${scope.user}:${scope.project || "projects"}:${draftKey || initial.id || fields.map((f) => f.name).join(",")}`
    : null;
  const formToken = useRef(Symbol());
  const lastAttempt = useRef("");
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;
  const normalize = () =>
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        values[f.name] ??
          (f.type === "select"
            ? f.options[0]?.value
            : f.type === "checkbox"
              ? false
              : ""),
      ]),
    );
  useEffect(() => {
    if (storageKey) {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const candidate = JSON.parse(cached);
          const equalsSaved = fields.every(
            (f) =>
              String(candidate[f.name] ?? "") === String(initial[f.name] ?? ""),
          );
          if (equalsSaved) localStorage.removeItem(storageKey);
          else setRecovery(candidate);
        }
      } catch {}
    }
    return () => dirtyForms.delete(formToken.current);
  }, [storageKey]);
  const change = (next) => {
    setValues(next);
    setDirty(true);
    dirtyForms.add(formToken.current);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    }
  };
  async function submit() {
    if (saving) return;
    setSaving(true);
    try {
      const result = await submitRef.current(normalize());
      if (result !== undefined) {
        setDirty(false);
        dirtyForms.delete(formToken.current);
        if (storageKey) localStorage.removeItem(storageKey);
      }
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    if (!autoSave || !dirty || disabled || recovery || saving) return;
    const signature = JSON.stringify(values);
    if (lastAttempt.current === signature) return;
    const timer = setTimeout(() => {
      lastAttempt.current = signature;
      submit();
    }, 800);
    return () => clearTimeout(timer);
  }, [values, dirty, autoSave, disabled, recovery, saving]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="form"
    >
      {recovery && (
        <div className="notice warning">
          <b>{t("You have an unsaved draft for this project.")}</b>
          <p>{t("This draft is saved on this device. Check the latest data before saving. An internet connection is needed.")}</p>
          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                change(recovery);
                setRecovery(null);
              }}
            >{t("Restore draft")}</button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                localStorage.removeItem(storageKey);
                setRecovery(null);
              }}
            >{t("Discard draft")}</button>
          </div>
        </div>
      )}
      {fields.map((f) => (
        <label key={f.name}>
          {t(f.label)}
          {f.type === "select" ? (
            <select
              disabled={disabled}
              value={values[f.name] ?? f.options[0]?.value ?? ""}
              onChange={(e) => change({ ...values, [f.name]: e.target.value })}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.translate ? t(o.label ?? o.value) : (o.label ?? o.value)}
                </option>
              ))}
            </select>
          ) : f.type === "checkbox" ? (
            <input
              disabled={disabled}
              type="checkbox"
              checked={Boolean(values[f.name])}
              onChange={(e) =>
                change({ ...values, [f.name]: e.target.checked })
              }
            />
          ) : f.type === "textarea" ? (
            <textarea
              disabled={disabled}
              required={f.required}
              value={values[f.name] ?? ""}
              onChange={(e) => change({ ...values, [f.name]: e.target.value })}
            />
          ) : (
            <input
              disabled={disabled}
              type={f.type ?? "text"}
              min={f.min ?? (f.type === "number" ? 0 : undefined)}
              step={f.type === "number" ? "any" : undefined}
              required={f.required}
              value={values[f.name] ?? ""}
              onChange={(e) =>
                change({
                  ...values,
                  [f.name]:
                    f.type === "number"
                      ? e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                      : e.target.value,
                })
              }
            />
          )}
        </label>
      ))}
      <button disabled={disabled || saving || Boolean(recovery)} type="submit">
        <Check size={15} />
        {t(saving ? "Saving…" : label)}
      </button>
      {dirty && (
        <small>
          {t("Unsaved changes")}
          {autoSave ? ` · ${t("Changes are saved after you stop typing.")}` : ""}
        </small>
      )}
    </form>
  );
}

const field = (name, label, type = "text", required = true) => ({
  name,
  label,
  type,
  required,
});
const select = (name, label, options) => ({
  name,
  label,
  type: "select",
  options: options.map((x) => (typeof x === "string" ? { value: x, translate: true } : x)),
});
function App() {
  const { t } = useLanguage();
  const [entering, setEntering] = useState(false), [entryError, setEntryError] = useState("");
  async function enter() {
    if (entering) return;
    setEntering(true); setEntryError("");
    try { const current = await enterGuest(); setSession(current); go("home"); }
    catch (e) { setEntryError(e.message); }
    finally { setEntering(false); }
  }
  const [session, setSession] = useState(null),
    [authReady, setAuthReady] = useState(!configured),
    [page, setPage] = useState(location.hash || "#landing"),
    [projects, setProjects] = useState([]),
    [storedData, setData] = useState(defaultData),
    [dataScope, setDataScope] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [busyRecords, setBusyRecords] = useState(new Set()),
    [staleEpochs, setStaleEpochs] = useState(new Set()),
    [recordErrors, setRecordErrors] = useState({}),
    [showBell, setShowBell] = useState(false),
    [mobile, setMobile] = useState(false),
    [archive, setArchive] = useState(false);
  const pending = useRef(false),
    retry = useRef(null), activeMutations = useRef(new Set()), view = useRef(null), authUser = useRef(null), authGeneration = useRef(0), projectList = useRef([]);
  projectList.current = projects;
  const params = new URLSearchParams(page.split("?")[1] || "");
  const projectId = params.get("project"),
    packageId = params.get("package"),
    runId = params.get("run");
  const tab = params.get("tab") || "documents";
  const group = projectId ? tab === "execution" ? "execution" : tab === "members" ? "members" : "feature1" : page.startsWith("#home") ? "home" : "projects";
  const scopeKey = `${session?.user.id || ""}:${projectId || "all"}`;
  const data = dataScope === scopeKey ? storedData : projectCache.get(scopeKey)?.data || {};
  view.current = { key: scopeKey, user: session?.user.id, project: projectId, group, generation: authGeneration.current };
  authUser.current = session?.user.id;
  const project = projects.find((p) => p.id === projectId);
  const own = data.project_members?.find((m) => m.user_id === session?.user.id);
  const role = own?.role;
  const canEdit = Boolean(
    role && role !== "viewer" && !project?.archived_at && !busy,
  );
  useEffect(() => {
    const event = () => {
      setPage(location.hash || "#landing");
      setMobile(false);
    };
    window.addEventListener("hashchange", event);
    const leave = (e) => {
      if (pending.current || dirtyForms.size) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes";
      }
    };
    window.addEventListener("beforeunload", leave);
    if (db) {
      db.auth.getSession().then(({ data, error }) => {
        setSession(data.session);
        if (error) setEntryError(error.message);
        setAuthReady(true);
      }).catch(e => { setEntryError(e.message); setAuthReady(true); });
      const { data: listener } = db.auth.onAuthStateChange((_e, s) => {
        setSession(previous => {
          if (previous?.user.id !== s?.user.id) {
            authGeneration.current += 1;
            projectCache.clear();
            setData({}); setProjects([]); setError("");
            setStatus(""); setRecordErrors({}); setStaleEpochs(new Set()); retry.current = null;
          }
          return s;
        });
      });
      return () => {
        listener.subscription.unsubscribe();
        window.removeEventListener("hashchange", event);
        window.removeEventListener("beforeunload", leave);
      };
    }
    return () => {
      window.removeEventListener("hashchange", event);
      window.removeEventListener("beforeunload", leave);
    };
  }, []);
  function entry(key = scopeKey) {
    if (!projectCache.has(key)) projectCache.set(key, { data: {}, loaded: {}, requests: {}, writes: {} });
    return projectCache.get(key);
  }
  function publish(key, next) {
    if (view.current?.key === key) { setDataScope(key); setData({ ...next }); }
  }
  function patchRows(key, table, incoming) {
    if (!key.startsWith(`${authUser.current}:`)) return;
    const cached = entry(key);
    const previous = cached.data[table] || [];
    cached.writes[table] = (cached.writes[table] || 0) + 1;
    const ids = new Set(incoming.map(r => r.id));
    cached.data[table] = [...previous.filter(r => !ids.has(r.id)), ...mergeRecords(previous, incoming)];
    publish(key, cached.data);
    // Dashboard data uses the same confirmed records; never leave a saved choice stale there.
    const allKey = `${authUser.current}:all`, all = projectCache.get(allKey);
    if (all && allKey !== key && all.data[table]) {
      all.writes[table] = (all.writes[table] || 0) + 1;
      all.data[table] = [...all.data[table].filter(r => !ids.has(r.id)), ...mergeRecords(all.data[table], incoming)];
    }
  }
  async function refresh({ force = true, captured = view.current } = {}) {
    if (!db || !captured?.user) return;
    const { key, user, project: target, group: targetGroup, generation } = captured;
    const cached = entry(key);
    if (cached.requests[targetGroup]) {
      if (!force) return cached.requests[targetGroup];
      try { await cached.requests[targetGroup]; } catch {}
      if (authUser.current !== user || authGeneration.current !== generation) return;
      return refresh({force: true, captured});
    }
    if (!force && Date.now() - (cached.loaded[targetGroup] || 0) < cacheTTL) return;
    const load = async () => {
      const projectRows = await checked(db.from("projects").select("*").order("updated_at", { ascending: false }));
      if (authUser.current !== user || authGeneration.current !== generation) return;
      projectList.current = projectRows; setProjects(projectRows);
      const names = target ? [...new Set(["project_members", "notifications", ...(targetGroup === "execution" ? executionTables : targetGroup === "members" ? [] : feature1Tables)])] : targetGroup === "home" ? ["notifications", "analysis_runs", "recommendations", "reviews", "recommendation_options"] : ["notifications", "analysis_runs", "packages", "documents", "document_versions"];
      const startedWrites = { ...cached.writes };
      const result = await Promise.all(names.map(async name => [name, target ? name === "project_members" ? await rpc("gs_list_members", {p_project_id: target}) : await rows(name, target) : await checked(db.from(name).select("*"))]));
      if (authUser.current !== user || authGeneration.current !== generation) return;
      for (const [name, records] of result) {
        const previous = cached.data[name] || [];
        const changed = (cached.writes[name] || 0) !== (startedWrites[name] || 0);
        const ids = new Set(records.map(r => r.id));
        const merged = mergeRecords(previous, records, changed);
        cached.data[name] = changed ? [...previous.filter(r => !ids.has(r.id)), ...merged] : merged;
      }
      if (names.includes("analysis_runs")) setStaleEpochs(previous => { const next = new Set(previous); for (const r of cached.data.analysis_runs || []) next.delete(r.id); return next; });
      cached.loaded[targetGroup] = Date.now();
      publish(key, cached.data);
    };
    cached.requests[targetGroup] = load();
    try { await cached.requests[targetGroup]; } finally { delete cached.requests[targetGroup]; }
  }
  useEffect(() => {
    if (error) document.querySelector("[role=alert]")?.focus();
  }, [error]);
  useEffect(() => {
    if (!mobile) return;
    const close = (e) => {
      if (e.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobile]);
  useEffect(() => {
    if (!session) return;
    const captured = { ...view.current }, cached = entry(captured.key);
    setDataScope(captured.key); setData({ ...cached.data }); setError("");
    refresh({force: false, captured}).catch(e => { if (view.current.key === captured.key && authGeneration.current === captured.generation) setError(e.message); });
  }, [session?.user.id, projectId, group]);
  const activeRunIds = (data.analysis_runs || []).filter(r => ["QUEUED", "PROCESSING"].includes(r.status?.toUpperCase())).map(r => r.id).sort().join(",");
  useEffect(() => {
    if (!activeRunIds || !session) return;
    const captured = { ...view.current }; let stopped = false, fetching = false, lastPollError = "";
    const poll = async () => {
      if (fetching || stopped) return; fetching = true;
      try {
        const result = await checked(db.from("analysis_runs").select("*").in("id", activeRunIds.split(",")));
        if (stopped || authUser.current !== captured.user || authGeneration.current !== captured.generation) return;
        patchRows(captured.key, "analysis_runs", result.filter(r => ["QUEUED", "PROCESSING"].includes(r.status?.toUpperCase())));
        const completed = result.filter(r => !["QUEUED", "PROCESSING"].includes(r.status?.toUpperCase()));
        if (completed.length) {
          const ids = completed.map(r => r.id);
          const recs = await checked(db.from("recommendations").select("*").in("run_id", ids));
          if (authGeneration.current !== captured.generation) return;
          patchRows(captured.key, "recommendations", recs);
          if (recs.length) {
            const recIds = recs.map(r => r.id);
            const extra = await Promise.all(["reviews", "recommendation_options"].map(async table => [table, await checked(db.from(table).select("*").in("recommendation_id", recIds))]));
            if (authGeneration.current !== captured.generation) return;
            for (const [table, records] of extra) patchRows(captured.key, table, records);
          }
          if (lastPollError) { const resolvedError = lastPollError; setError(previous => previous === resolvedError ? "" : previous); lastPollError = ""; }
          // Keep the run active until its complete result is loaded, so a failed read retries.
          patchRows(captured.key, "analysis_runs", completed);
        }
      } catch(e) { if (!stopped && view.current.key === captured.key && authGeneration.current === captured.generation) { lastPollError = e.message; setError(e.message); } }
      finally { fetching = false; }
    };
    const timer = setInterval(poll, 2000);
    return () => { stopped = true; clearInterval(timer); };
  }, [session?.user.id, scopeKey, activeRunIds]);
  function go(next, extra = {}) {
    location.hash =
      next === "workspace"
        ? `workspace?${new URLSearchParams({ project: projectId, tab, ...extra })}`
        : next;
    setMobile(false);
  }
  async function action(fn, { message = "Saved", reload = true, recordKey = null, table = null, run = null } = {}) {
    const captured = { ...view.current }, key = recordKey ? `${captured.key}:${recordKey}` : "global";
    if (activeMutations.current.has(key) || activeMutations.current.has("global") || (!recordKey && activeMutations.current.size)) return;
    activeMutations.current.add(key); pending.current = true;
    if (recordKey) setBusyRecords(new Set(activeMutations.current)); else setBusy(true);
    setError(""); setStatus("Saving…");
    if (recordKey) setRecordErrors(previous => ({...previous, [key]: ""}));
    retry.current = () => action(fn, { message, reload, recordKey, table, run });
    try {
      const result = await fn();
      if (authUser.current !== captured.user || authGeneration.current !== captured.generation) return result;
      if (table && result?.id) patchRows(captured.key, table, [result]);
      if (run) {
        try {
          const latest = await checked(db.from("analysis_runs").select("*").eq("id", run));
          if (authGeneration.current !== captured.generation) return result;
          patchRows(captured.key, "analysis_runs", latest);
          setStaleEpochs(previous => { const next = new Set(previous); next.delete(run); return next; });
        } catch(e) {
          if (authGeneration.current !== captured.generation) return result;
          setStaleEpochs(previous => new Set([...previous, run]));
          if (view.current.key === captured.key) setError("Your change was saved. Load the latest data before finalizing.");
        }
      } else if (reload) await refresh({captured});
      if (view.current.key === captured.key && authGeneration.current === captured.generation) { setStatus(message); retry.current = null; }
      return result;
    } catch(e) {
      if (recordKey && authUser.current === captured.user && authGeneration.current === captured.generation) setRecordErrors(previous => ({...previous, [key]: e.message}));
      if (view.current.key === captured.key && authGeneration.current === captured.generation) { setError(e.message); setStatus("Not saved"); }
    } finally {
      activeMutations.current.delete(key); pending.current = activeMutations.current.size > 0;
      if (recordKey) setBusyRecords(new Set(activeMutations.current)); else setBusy(false);
    }
  }
  async function save(kind, values, record) {
    if (kind === "reviews") values = {decision: values.decision, reason: values.reason || "", locked: values.locked || false};
    const key = requestId();
    const run = kind === "reviews" ? data.recommendations?.find(r => r.id === record?.recommendation_id)?.run_id : null;
    return action(() => mutate(projectId, kind, values, record, key), kind === "reviews" ? {recordKey: record.id, table: kind, run, reload: false} : {});
  }
  async function changeReview(review, option, wording) {
    const run = data.recommendations?.find(r => r.id === review.recommendation_id)?.run_id;
    const operationKey = requestId();
    return action(() => rpc("gs_review_change", {p_review_id: review.id, p_expected_version: review.row_version, p_selected_option: option, p_draft_wording: wording, p_request_id: operationKey}), {recordKey: review.id, table: "reviews", run, reload: false});
  }
  const reviewErrors = Object.fromEntries(Object.entries(recordErrors).filter(([key]) => key.startsWith(`${scopeKey}:`)).map(([key, value]) => [key.slice(scopeKey.length + 1), value]));
  const pendingReviewIds = new Set([...busyRecords].filter(key => key.startsWith(`${scopeKey}:`)).map(key => key.slice(scopeKey.length + 1)));
  if (!authReady)
    return <main className="loading">{t("Checking your account…")}</main>;
  if (page.startsWith("#landing") || !session || page.startsWith("#auth"))
    return <Landing onEnter={enter} configured={configured} entering={entering} entryError={entryError} />;
  const notifications = data.notifications ?? [];
  return (
    <DraftContext.Provider
      value={{ user: session.user.id, project: projectId }}
    >
      <div className={`app ${mobile ? "nav-open" : ""}`}>
        <aside className="sidebar">
          <a className="brand" href="#home">
            <span>
              <Leaf size={20} />
            </span>
            GREEN SPEC
          </a>
          <nav>
            <a className={page.startsWith("#home") ? "active" : ""} href="#home"><LayoutDashboard size={17} />Home</a>
            <a className={!projectId && !page.startsWith("#home") ? "active" : ""} href="#projects">
              <LayoutDashboard size={17} />
              Projects
            </a>
            {projectId && (
              <>
                <p className="nav-label">WORKSPACE</p>
                {tabs.map(([key, label]) => (
                  <a
                    key={key}
                    className={tab === key ? "active" : ""}
                    href={`#workspace?project=${projectId}&tab=${key}`}
                  >
                    <span>
                      {key === "execution" ? (
                        <Package size={17} />
                      ) : key === "members" ? (
                        <Users size={17} />
                      ) : (
                        <Files size={17} />
                      )}
                    </span>
                    {label}
                  </a>
                ))}
              </>
            )}
          </nav>
          <div className="sidebar-bottom">
            <Badge>● SAMPLE ANALYSIS</Badge>
            <p>{t("Sample results are not engineering approval.")}</p>
            <button className="ghost" onClick={() => go("landing")}>
              <ArrowLeft size={15} />
              {t("Back to landing")}
            </button>
          </div>
        </aside>
        {mobile && (
          <button
            className="nav-backdrop"
            aria-label={t("Close menu")}
            onClick={() => setMobile(false)}
          />
        )}
        <div className="main-area">
          <header>
            <button
              className="icon mobile-toggle"
              aria-label={t("Open menu")}
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            <span>{project?.name || (page.startsWith("#home") ? "Home" : "Projects")}</span>
            <div className="header-right">
              <LanguageSwitcher />
              <button
                className="icon"
                aria-label={t("Notifications")}
                onClick={() => setShowBell(!showBell)}
              >
                <Bell size={18} />
                {notifications.some((n) => !n.read_at) && <i />}
              </button>
              <span className="avatar">
                {session.user.is_anonymous ? "G" : session.user.email?.slice(0, 2).toUpperCase()}
              </span>
              <div className="user">
                <b>{session.user.is_anonymous ? `${t("Guest")} ${session.user.id.slice(0, 6)}` : session.user.email}</b>
                <small>{t(({owner:"Owner",editor:"Editor",viewer:"Read only"})[role] || "GREEN SPEC member")}</small>
              </div>
            </div>
          </header>
          <main>
            {error && (
              <div tabIndex={-1} role="alert" className="error">
                <AlertCircle size={17} />
                <div>
                  {t(error)}
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() =>
                        refresh()
                          .then(() => setError(""))
                          .catch((e) => setError(e.message))
                      }
                    >{t("Load latest data")}</button>
                    {retry.current && !error.includes("Someone changed") && (
                      <button
                        className="secondary"
                        onClick={() => retry.current()}
                      >{t("Try again")}</button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {status && (
              <p aria-live="polite" className="save-status">
                {t(status)}
              </p>
            )}
            {project?.archived_at && (
              <div className="notice">
                This project is archived. You can still read its history.{" "}
                {role === "owner" && (
                  <button
                    className="secondary"
                    onClick={() =>
                      action(() =>
                        rpc("gs_archive", {
                          p_project_id: project.id,
                          p_archived: false,
                          p_expected_version: project.row_version,
                        }),
                      )
                    }
                  >{t("Restore project")}</button>
                )}
              </div>
            )}
            {projectId && role === "viewer" && (
              <div className="notice">{t("You have read-only access. Ask the project owner for edit access.")}</div>
            )}
            {!projectId && page.startsWith("#home") ? <HomeDashboard projects={projects} data={data} onNew={() => go("projects")} /> : !projectId ? (
              <>
                <div className="page-title">
                  <div>
                    <p className="eyebrow">YOUR GREEN SPEC WORKSPACE</p>
                    <h1>Build better. Specify greener.</h1>
                    <p>{t("Turn project requirements into informed material decisions.")}</p>
                  </div>
                </div>
                <section className="card">
                  <h2>New analysis</h2>
                  <Form
                    fields={[
                      field("name", "Project name"),
                      field(
                        "description",
                        "Project description (you can add this later)",
                        "textarea",
                        false,
                      ),
                    ]}
                    label="Create project"
                    disabled={busy}
                    onSubmit={(v) =>
                      action(async () => {
                        const p = await rpc("gs_create_project", {
                          p_name: v.name,
                          p_description: v.description || null,
                        });
                        location.hash = `workspace?project=${p.id ?? p}&tab=documents`;
                      })
                    }
                  />
                </section>
                <section className="card">
                  <div className="section-head">
                    <h2>Projects</h2>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={archive}
                        onChange={(e) => setArchive(e.target.checked)}
                      />{t("Show archived")}</label>
                  </div>
                  {projects.filter((p) => archive || !p.archived_at).length ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("Project")}</th>
                            <th>{t("Setup status")}</th>
                            <th>{t("Latest analysis")}</th>
                            <th>{t("Work checked")}</th>
                            <th>{t("Last updated")}</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {projects
                            .filter((p) => archive || !p.archived_at)
                            .map((p) => (
                              <tr key={p.id}>
                                <td>
                                  <strong>{p.name}</strong>
                                  <small>
                                    {p.description || "No description yet"}
                                  </small>
                                </td>
                                <td>
                                  <Badge>
                                    {p.archived_at
                                      ? "Archived"
                                      : p.description
                                        ? (data.documents || []).some(
                                            (d) =>
                                              d.project_id === p.id &&
                                              !d.retired_at &&
                                              (
                                                data.document_versions || []
                                              ).some(
                                                (v) =>
                                                  v.id ===
                                                    d.current_version_id &&
                                                  v.upload_state === "READY" &&
                                                  v.fixture_id,
                                              ),
                                          )
                                          ? "Ready for sample analysis"
                                          : "Add a sample document"
                                        : "Setup incomplete"}
                                  </Badge>
                                </td>
                                <td>
                                  {(() => {
                                    const latest = (data.analysis_runs || [])
                                      .filter((r) => r.project_id === p.id)
                                      .sort(
                                        (a, b) =>
                                          new Date(b.created_at) -
                                          new Date(a.created_at),
                                      )[0];
                                    return latest ? (
                                      <>
                                        <Badge>{latest.status}</Badge>
                                        <small>
                                          {stamp(latest.created_at)}
                                        </small>
                                      </>
                                    ) : (
                                      <small>{t("Not analysed")}</small>
                                    );
                                  })()}
                                </td>
                                <td>
                                  {(() => {
                                    const packs = (data.packages || []).filter(
                                      (x) =>
                                        x.project_id === p.id &&
                                        !x.superseded_at,
                                    );
                                    return packs.length
                                      ? `${packs.filter((x) => x.execution_status === "COMPLETE").length}/${packs.length} Work package`
                                      : "No work started";
                                  })()}
                                </td>
                                <td>{stamp(p.updated_at)}</td>
                                <td>
                                  <a
                                    className="button secondary"
                                    href={`#workspace?project=${p.id}&tab=documents`}
                                  >{t("Open")}<ArrowRight size={15} />
                                  </a>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty title={t("No projects yet")}>{t("Name your first project, then add its documents.")}</Empty>
                  )}
                </section>
              </>
            ) : project ? (
              <>
                <div className="page-title">
                  <div>
                    <a className="back" href="#projects">
                      <ArrowLeft size={14} />{t("All projects")}</a>
                    <h1>{project.name}</h1>
                    <p>
                      {project.description ||
                        "Add a description before analysis"}
                    </p>
                  </div>
                  <Badge>{project.archived_at ? "Archived" : role}</Badge>
                </div>
                <div className="tabs">
                  {tabs.map(([key, label]) => (
                    <a
                      key={key}
                      className={tab === key ? "selected" : ""}
                      href={`#workspace?project=${projectId}&tab=${key}`}
                    >
                      {label}
                    </a>
                  ))}
                </div>
                {tab === "documents" && (
                  <Documents
                    {...{ project, data, canEdit, save, action, go }}
                  />
                )}
                {tab === "review" && (
                  <Review
                    {...{ project, data, canEdit, save, action, go, runId, changeReview, pendingReviewIds, staleEpochs, reviewErrors }}
                  />
                )}
                {tab === "revision" && (
                  <Revisions {...{ project, data, canEdit, save, action }} />
                )}
                {tab === "execution" && (
                  <Execution
                    {...{
                      project,
                      data,
                      canEdit,
                      save,
                      action,
                      go,
                      packageId,
                      session,
                    }}
                  />
                )}
                {tab === "members" && (
                  <Members
                    {...{ project, data, canEdit, save, action, role }}
                  />
                )}
              </>
            ) : (
              <Empty title={t("Project not found")}>{t("Check the link or ask the owner for access.")}</Empty>
            )}
            <footer>{t("GREEN SPEC · Estimates use sample data · Actual results need their own sources")}</footer>
          </main>
        </div>
        {showBell && (
          <div className="drawer">
            <div className="section-head">
              <h2>Notifications</h2>
              <button
                className="icon"
                aria-label={t("Close notifications")}
                onClick={() => setShowBell(false)}
              >
                <X />
              </button>
            </div>
            {notifications.length ? (
              notifications.map((n) => (
                <article key={n.id}>
                  <Badge>{n.read_at ? "Read" : "New"}</Badge>
                  <h3>{n.kind}</h3>
                  <p>{n.message || n.body || "An item needs your attention."}</p>
                  <small>{stamp(n.created_at)}</small>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() =>
                        action(() =>
                          rpc("gs_mark_notification", { p_id: n.id }),
                        )
                      }
                    >{t("Read")}</button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        action(
                          async () => {
                            let target = n.target_id;
                            let section = "proof";
                            const table =
                              n.kind === "TASK_OVERDUE"
                                ? "tasks"
                                : n.kind === "BLOCKING_ISSUE"
                                  ? "issues"
                                  : null;
                            if (table) {
                              const related = await checked(
                                db
                                  .from(table)
                                  .select("package_id")
                                  .eq("id", n.target_id)
                                  .eq("project_id", n.project_id)
                                  .single(),
                              );
                              target = related.package_id;
                              section = table === "tasks" ? "tasks" : "issues";
                            } else if (n.kind === "DELIVERY_LATE")
                              section = "procurement";
                            await rpc("gs_mark_notification", { p_id: n.id });
                            go("workspace", {
                              project: n.project_id,
                              tab: "execution",
                              package: target,
                              section,
                            });
                            setShowBell(false);
                            return true;
                          },
                          { message: "Item opened", reload: false },
                        )
                      }
                    >{t("Open item")}</button>
                  </div>
                </article>
              ))
            ) : (
              <Empty title={t("No notifications")}>{t("Items that need your attention appear here.")}</Empty>
            )}
          </div>
        )}
      </div>
    </DraftContext.Provider>
  );
}
function Landing(props) { return <LandingPage {...props} />; }
function Auth({ onBack, onDone }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(
      location.hash.includes("recovery") ? "update" : "login",
    ),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="auth">
      <div className="auth-brand">
        <Leaf size={35} />
        <h1>GREEN SPEC</h1>
        <p>{t("Build better. Specify greener.")}</p>
      </div>
      <section className="card">
        <button className="ghost" onClick={onBack}>
          <ArrowLeft size={15} />{t("Back to home")}</button>
        <h2>
          {mode === "signup"
            ? "Create account"
            : mode === "reset"
              ? "Reset password"
              : mode === "update"
                ? "Change password"
                : "Sign in"}
        </h2>
        {msg && (
          <p role="status" className="notice">
            {msg}
          </p>
        )}
        <Form
          fields={
            mode === "update"
              ? [field("password", "New password", "password")]
              : mode === "reset"
                ? [field("email", "Email", "email")]
                : [
                    field("email", "Email", "email"),
                    field("password", "Password", "password"),
                  ]
          }
          disabled={busy || !configured}
          label={busy ? "Working…" : "Continue"}
          onSubmit={async (v) => {
            setBusy(true);
            try {
              if (!db) throw new Error("The system is not configured local");
              if (mode === "login") {
                await checked(db.auth.signInWithPassword(v));
                onDone();
              } else if (mode === "signup") {
                const d = await checked(db.auth.signUp(v));
                if (d.session) onDone();
                else setMsg("Account created. Check your email if confirmation is requested.");
              } else if (mode === "update") {
                await checked(db.auth.updateUser({ password: v.password }));
                onDone();
              } else {
                await checked(
                  db.auth.resetPasswordForEmail(v.email, {
                    redirectTo: location.origin + "/#auth?recovery=1",
                  }),
                );
                setMsg("If this email has an account, a password reset link will be sent.");
              }
            } catch (e) {
              setMsg(e.message);
            } finally {
              setBusy(false);
            }
          }}
        />
        <div className="auth-links">
          <button
            className="ghost"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setMsg("");
            }}
          >
            {mode === "signup" ? "I have an account" : "Create account"}
          </button>
          <button className="ghost" onClick={() => setMode("reset")}>{t("Forgot password")}</button>
        </div>
        {location.hash.includes("recovery") && (
          <button className="secondary" onClick={() => setMode("update")}>{t("Reset password")}</button>
        )}
      </section>
    </div>
  );
}
import { fixtures } from "../../shared/fixtures.mjs";
function fileMime(file) {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  return (
    {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    }[extension] ||
    file.type ||
    "application/octet-stream"
  );
}
async function uploadDocument(project, document, file, control = {}) {
  if (file.size > 25 * 1024 * 1024)
    throw new Error("Files must be no larger than 25 MiB");
  if (!/\.(pdf|docx|xlsx)$/i.test(file.name))
    throw new Error("Supports only PDF, DOCX and XLSX");
  const hash = await checksum(file);
  const version = await invoke("document", {
    operation: "begin",
    project_id: project.id,
    document_id: document.id,
    filename: file.name,
    mime: fileMime(file),
    bytes: file.size,
    request_id: requestId(),
  });
  control.version = version;
  await uploadBytes("documents", version.storage_path, file, control.signal);
  return invoke("document", {
    operation: "commit",
    project_id: project.id,
    version_id: version.id,
    checksum: hash,
  });
}
async function uploadBytes(bucket, path, file, signal) {
  const { data } = await db.auth.getSession();
  if (!data.session) throw new Error("Your session expired. Please sign in again.");
  const result = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        "Content-Type": fileMime(file),
        "x-upsert": "false",
      },
      body: file,
      signal,
    },
  );
  if (!result.ok) throw new Error("Upload failed. Please try again.");
}

function Documents({ project, data, canEdit, save, action, go }) {
  const { t } = useLanguage();
  const [scenario, setScenario] = useState("success"),
    [selected, setSelected] = useState([]),
    [uploadState, setUploadState] = useState({}),
    [preview, setPreview] = useState(null);
  const controls = useRef({});
  const versions = data.document_versions ?? [],
    docs = (data.documents ?? []).filter((d) => !d.retired_at);
  const eligible = versions.filter(
    (v) =>
      v.upload_state === "READY" &&
      v.fixture_id &&
      (
        {
          success: ["office-spec"],
          zero: ["zero-spec"],
          partial: ["partial-spec", "partial-boq"],
        }[scenario] || []
      ).includes(v.fixture_id),
  );
  const missing = [
    !project.description?.trim() && "Add a project description",
    !eligible.length && "Load a supported sample file",
  ].filter(Boolean);
  const running = (data.analysis_runs ?? []).some((r) =>
    ["QUEUED", "PROCESSING"].includes(r.status),
  );
  useEffect(
    () => setSelected(eligible.map((v) => v.id)),
    [eligible.map((v) => v.id).join(",")],
  );
  async function loadFixture(f) {
    const key = requestId();
    await action(() =>
      invoke("document", {
        operation: "fixture",
        project_id: project.id,
        fixture_id: f.fixture_id,
        request_id: key,
      }),
    );
  }
  async function upload(doc, file) {
    if (!file) return;
    const hash = await checksum(file);
    const duplicate = versions.find(
      (v) => v.checksum === hash && v.upload_state === "READY",
    );
    if (
      duplicate &&
      !confirm(
        "This file matches a saved version. Create another document anyway?",
      )
    ) {
      setPreview(duplicate);
      return;
    }
    const controller = new AbortController(),
      control = { signal: controller.signal, controller };
    controls.current[doc.id] = control;
    setUploadState((s) => ({
      ...s,
      [doc.id]: { status: "Uploading", file },
    }));
    const result = await action(async () => {
      try {
        return await uploadDocument(project, doc, file, control);
      } catch (e) {
        if (control.version)
          await invoke("document", {
            operation: "cancel",
            project_id: project.id,
            version_id: control.version.id,
          }).catch(() => {});
        if (e.name === "AbortError")
          throw new Error("Upload cancelled. You can try again.");
        throw e;
      }
    });
    setUploadState((s) => ({
      ...s,
      [doc.id]: { status: result ? "Ready" : "Upload failed", file },
    }));
    delete controls.current[doc.id];
  }

  return (
    <>
      <div className="grid two">
        <section className="card">
          <h2>Project details</h2>
          <Form
            key={project.row_version}
            fields={[
              field("name", "Project name"),
              field("description", "Project description", "textarea", false),
            ]}
            initial={project}
            autoSave
            disabled={!canEdit || running}
            onSubmit={(v) => save("projects", v, project)}
          />
          {running && (
            <p className="notice">{t("Analysis is running. Its source files are temporarily locked.")}</p>
          )}
        </section>
        <section className="card">
          <h2>Add document</h2>
          <p>{t("Add a document name, then upload the file.")}</p>
          <Form
            fields={[
              field("title", "Document title"),
              select("type", "Type", ["TOR", "BOQ", "SPEC", "OTHER"]),
            ]}
            disabled={!canEdit}
            label="Add document"
            onSubmit={(v) => save("documents", { type: "TOR", ...v })}
          />
        </section>
      </div>
      <section className="card">
        <div className="section-head">
          <h2>Project documents</h2>
          <Badge>{t("PDF · DOCX · XLSX / 25 MiB")}</Badge>
        </div>
        {!docs.length ? (
          <Empty title={t("No documents yet")}>{t("Add a document or load a sample below.")}</Empty>
        ) : (
          docs.map((doc) => {
            const version =
              versions.find((v) => v.id === doc.current_version_id) ||
              versions
                .filter((v) => v.document_id === doc.id)
                .sort((a, b) => b.version_no - a.version_no)[0];
            return (
              <article className="document" key={doc.id}>
                <div>
                  <FileText size={24} />
                  <div>
                    <h3>{doc.title}</h3>
                    <small>
                      {doc.type} ·{" "}
                      {version
                        ? `${t("Version")} ${version.version_no}`
                        : t("No file")}
                    </small>
                    <p>
                      <Badge tone={version ? "" : "warning"}>
                        {uploadState[doc.id]?.status ||
                          version?.upload_state ||
                          "No file"}
                      </Badge>{" "}
                      {version?.fixture_id ? (
                        <Badge>{t("Supported sample")}</Badge>
                      ) : (
                        version && (
                          <Badge tone="warning">{t("Stored file · analysis not available")}</Badge>
                        )
                      )}
                    </p>
                  </div>
                </div>
                <div className="actions">
                  {version && (
                    <>
                      <button
                        className="secondary"
                        onClick={() =>
                          action(() => download(version.storage_path), {
                            message: "File opened",
                            reload: false,
                          })
                        }
                      >
                        <Download size={14} />{t("Download original")}</button>
                      <button
                        className="secondary"
                        onClick={() => setPreview(version)}
                      >{t("View text / source")}</button>
                    </>
                  )}
                  {uploadState[doc.id]?.status === "Uploading" && (
                    <button
                      className="secondary"
                      onClick={() =>
                        controls.current[doc.id]?.controller.abort()
                      }
                    >{t("Cancel upload")}</button>
                  )}
                  {canEdit && (
                    <>
                      <label className="button secondary">
                        {version ? "Upload new version" : "Upload file"}
                        <input
                          className="file-hidden"
                          aria-label={`Upload ${doc.title}`}
                          type="file"
                          accept=".pdf,.docx,.xlsx"
                          onChange={(e) => upload(doc, e.target.files?.[0])}
                        />
                      </label>
                      {uploadState[doc.id]?.status === "Upload failed" && (
                        <button
                          className="secondary"
                          onClick={() => upload(doc, uploadState[doc.id].file)}
                        >{t("Try again")}</button>
                      )}
                      <button
                        className="ghost"
                        onClick={() =>
                          save(
                            "documents",
                            { retired_at: new Date().toISOString() },
                            doc,
                          )
                        }
                      >{t("Archive document")}</button>
                    </>
                  )}
                </div>
                <details>
                  <summary>{t("Edit document details")}</summary>
                  <Form
                    key={doc.row_version}
                    fields={[
                      field("title", "Document title"),
                      select("type", "Type", ["TOR", "BOQ", "SPEC", "OTHER"]),
                    ]}
                    initial={doc}
                    disabled={!canEdit}
                    onSubmit={(v) => save("documents", v, doc)}
                  />
                </details>
              </article>
            );
          })
        )}
      </section>
      <section className="card">
        <h2>Analyse sample files</h2>
        <div className="notice">{t("Sample analysis only. Your own files are stored but are not analysed. Sources are never replaced without your choice.")}</div>
        <div className="actions">
          {fixtures.map((f) => (
            <button
              key={f.fixture_id}
              className="secondary"
              disabled={!canEdit}
              onClick={() => loadFixture(f)}
            >
              <Plus size={15} />
              {f.title}
            </button>
          ))}
        </div>
        <label className="stack">{t("Sample scenario")}<select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            <option value="success">{t("Success — Material choices")}</option>
            <option value="zero">{t("Zero opportunities — No recommendations")}</option>
            <option value="partial">{t("Partial — Some sources failed")}</option>
          </select>
        </label>
        <h3>Files included in analysis</h3>
        {eligible.map((v) => (
          <label className="check" key={v.id}>
            <input
              type="checkbox"
              checked={selected.includes(v.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, v.id]
                    : selected.filter((x) => x !== v.id),
                )
              }
            />
            {docs.find((d) => d.id === v.document_id)?.title} · Version{" "}
            {v.version_no} · {v.checksum?.slice(0, 12)}
          </label>
        ))}
        <p className="muted">
          Files not included:{" "}
          {versions
            .filter((v) => !selected.includes(v.id))
            .map(
              (v) =>
                docs.find((d) => d.id === v.document_id)?.title || v.filename,
            )
            .join(", ") || "None"}
        </p>
        {missing.length > 0 && (
          <div className="notice warning">
            <b>{t("Not ready to analyse")}</b>
            <ul>
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          disabled={
            !canEdit || running || missing.length > 0 || !selected.length
          }
          onClick={() => {
            const key = requestId();
            action(
              async () => {
                const result = await invoke("analyze", {
                  project_id: project.id,
                  request_id: key,
                  scenario,
                  document_version_ids: selected,
                });
                go("workspace", {
                  tab: "review",
                  run: result.run_id || result.id,
                });
              },
              { message: "Analysis requested" },
            );
          }}
        >{t("Start sample analysis")}<ArrowRight size={16} />
        </button>
      </section>
      {preview && (
        <SourceViewer
          version={preview}
          documents={data.documents}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
function SourceViewer({ version, source, documents, onClose }) {
  const { t } = useLanguage();
  const modalRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const targets = [
          ...modalRef.current.querySelectorAll(
            "button,a,input,select,textarea,[tabindex]",
          ),
        ].filter((x) => !x.disabled);
        const first = targets[0],
          last = targets.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  const title =
    documents?.find((d) => d.id === version.document_id)?.title ||
    version.filename;
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("Source reference")}
      >
        <button
          autoFocus
          className="icon close"
          aria-label={t("Close")}
          onClick={onClose}
        >
          <X />
        </button>
        <h2>{title}</h2>
        <Badge>
          Version {version.version_no} · {version.checksum?.slice(0, 12)}
        </Badge>
        {source && (
          <>
            <h3>Source location</h3>
            <p>{locator(source.locator)}</p>
            <blockquote>{source.exact_text}</blockquote>
          </>
        )}
        {(version.extraction ?? []).length ? (
          <div className="source-lines">
            {version.extraction.map((x, i) => (
              <p
                className={
                  JSON.stringify(x.locator) === JSON.stringify(source?.locator)
                    ? "highlight"
                    : ""
                }
                key={i}
              >
                <small>{locator(x.locator)}</small>
                {x.exact_text}
              </p>
            ))}
          </div>
        ) : (
          <p>{t("No text preview is available for this file. Open the original file to read it.")}</p>
        )}
        <button onClick={() => download(version.storage_path)}>{t("Open / download original")}<Download size={15} />
        </button>
        <p className="muted">{t("This text view does not show the original file layout.")}</p>
      </section>
    </div>
  );
}
function locator(loc) {
  return loc?.kind === "page"
    ? `Page ${loc.page_number}`
    : loc?.kind === "paragraph"
      ? `Paragraph ${loc.paragraph_index}`
      : loc?.kind === "sheet_cell"
        ? `${loc.sheet_name} · ${loc.cell_range}`
        : "No location";
}
function Review({ project, data, canEdit, save, action, go, runId, changeReview, pendingReviewIds, staleEpochs, reviewErrors }) {
  const { t } = useLanguage();
  const [source, setSource] = useState(null),
    [feedback, setFeedback] = useState(""),
    [omit, setOmit] = useState(false),
    [omissionReason, setOmissionReason] = useState(""),
    [replaceReason, setReplaceReason] = useState(""),
    [excludedHandoff, setExcludedHandoff] = useState([]);
  const stage = new URLSearchParams(location.hash.split("?")[1] || "").get("stage") || "overview";
  const onStage = (next, item) => go("workspace", { tab: "review", run: run?.id, stage: next, item: item || new URLSearchParams(location.hash.split("?")[1] || "").get("item") || "" });
  const runs = (data.analysis_runs ?? []).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  const run = runs.find((r) => r.id === runId) || runs[0];
  const recs = (data.recommendations ?? []).filter((r) => r.run_id === run?.id);
  const reviews = data.reviews ?? [];
  const sets = (data.decision_sets ?? [])
    .filter((s) => s.run_id === run?.id)
    .sort((a, b) => b.version_no - a.version_no);
  const final = sets[0];
  const status = (r) =>
    reviews.find((x) => x.recommendation_id === r.id)?.decision || "UNREVIEWED";
  const approved = recs.filter((r) => status(r) === "APPROVED"),
    unreviewed = recs.filter((r) => status(r) === "UNREVIEWED");
  const payload = (r) => selectedPayload(r, reviews.find(x => x.recommendation_id === r.id), data.recommendation_options);
  function total(key) {
    const unique = approved.filter(
      (r, i, a) =>
        a.findIndex(
          (x) => payload(x).work_scope_key === payload(r).work_scope_key,
        ) === i,
    );
    const values = unique.map((r) => payload(r).impacts?.[key]);
    return {
      sum: values.some((v) => v != null)
        ? values.filter((v) => v != null).reduce((a, b) => a + Number(b), 0)
        : null,
      known: values.filter((v) => v != null).length,
      total: values.length,
    };
  }
  const cost = total("cost_saving_thb"),
    carbon = total("carbon_reduction_tco2e");
  const overlaps = approved
    .map(payload)
    .filter(
      (r, i, a) =>
        a.findIndex((x) => x.work_scope_key === r.work_scope_key) !== i,
    );
  const stale =
    run?.stale ||
    Boolean(
      run?.input_snapshot?.context?.description &&
        run.input_snapshot.context.description !== project.description,
    );
  const active = ["QUEUED", "PROCESSING", "queued", "processing"].includes(
    run?.status,
  );
  const finalizeReason = unreviewed.length
    ? "Review every item first"
    : overlaps.length
      ? "More than one change is selected for the same work scope"
      : stale
        ? "Source data changed. Run analysis again."
        : run?.status?.toUpperCase() === "PARTIAL" &&
            (!omit || !omissionReason.trim())
          ? "Confirm the failed sources are skipped and give a reason."
          : active
            ? "Analysing"
            : null;
  if (!run)
    return (
      <section className="card">
        <Empty title={t("No analysis yet")}>{t("Add a description and sample files in Documents first.")}</Empty>
        <button
          className="secondary"
          onClick={() => go("workspace", { tab: "documents" })}
        >{t("Go to Documents")}</button>
      </section>
    );
  return (
    <>
      <div className="section-head">
        <label className="run-select">{t("Analysis history")}<select
            value={run.id}
            onChange={(e) =>
              go("workspace", { tab: "review", run: e.target.value })
            }
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {stamp(r.created_at)} · {({COMPLETED:"Ready",COMPLETE:"Ready",PARTIAL:"Some sources failed",FAILED:"Failed",PROCESSING:"Analysing",QUEUED:"Waiting"})[r.status] || r.status}
              </option>
            ))}
          </select>
        </label>
        <Badge>{t("Sample analysis")}</Badge>
      </div>
      <nav className="analysis-tabs" aria-label={t("Analysis screens")}>{stages.map(([key,name]) => <button key={key} className={stage===key?"selected":""} onClick={()=>onStage(key)}>{name}{key==="selected"?` (${approved.length})`:""}</button>)}</nav>
      {active ? (
        <section className="card processing">
          <RefreshCw className="spin" />
          <h2>Analysing the sample files</h2>
          <p>{t("You can leave this page and return to check progress.")}</p>
          <Badge>{run.status}</Badge>
        </section>
      ) : (
        <>
          <div className="notice">{t("These results come from sample files. They are not an engineering approval or material certification.")}</div>
          {stale && (
            <div className="error">{t("Source data changed. Run analysis again before finalizing.")}</div>
          )}
          {(run.result?.warnings || run.warnings)?.filter(w => !String(typeof w === "string" ? w : w.message || "").startsWith("SIMULATED:")).map((w, i) => (
            <p className="notice warning" key={i}>
              {typeof w === "string" ? w : w.message || w.reason || "Check this source before using the result."}
            </p>
          ))}
          {(run.result?.errors || run.errors)?.length > 0 && (
            <section className="card">
              <h3>Failed sources</h3>
              {(run.result?.errors || run.errors || []).map((e, i) => (
                <p key={i}>{e.message || "This source could not be processed."}</p>
              ))}
              <label className="check">
                <input
                  type="checkbox"
                  checked={omit}
                  onChange={(e) => setOmit(e.target.checked)}
                />{t("Leave out the failed sources and keep a warning in the final revision.")}</label>
              <label className="stack">{t("Reason for skipping")}<textarea
                  value={omissionReason}
                  onChange={(e) => setOmissionReason(e.target.value)}
                />
              </label>
            </section>
          )}
          {run.status?.toUpperCase() === "FAILED" && (
            <section className="card">
              <h2>Analysis failed</h2>
              <button
                disabled={!canEdit}
                onClick={() =>
                  action(() =>
                    invoke("analyze", {
                      project_id: project.id,
                      request_id: run.request_id,
                      scenario: run.scenario,
                      document_version_ids:
                        run.input_snapshot?.document_versions?.map(
                          (v) => v.id,
                        ) || [],
                    }),
                  )
                }
              >{t("Retry this analysis")}</button>
            </section>
          )}
          {["overview", "hotspots", "summary", "completion"].includes(stage) && <div className="stats">
            {[
              ["Approve", approved.length, "Selected changes"],
              [
                cost.sum < 0 ? "Estimated cost increase" : "Estimated savings",
                cost.sum == null ? "Unknown" : `฿${money(Math.abs(cost.sum))}`,
                `${cost.known}/${cost.total} items with data`,
              ],
              [
                "Estimated carbon reduction",
                `${money(carbon.sum)} tCO₂e`,
                `${carbon.known}/${carbon.total} items with data`,
              ],
              [
                "Not reviewed",
                unreviewed.length,
                `${recs.filter((r) => status(r) === "REJECTED").length} rejected items`,
              ],
            ].map(([t, v, n]) => (
              <section className="stat" key={t}>
                <small>{t}</small>
                <strong>{v}</strong>
                <small>{n}</small>
              </section>
            ))}
          </div>}
          {cost.known < cost.total || carbon.known < carbon.total ? (
            <p className="notice warning">{t("Some estimates are missing. Totals include only known values. Missing values are not counted as zero.")}</p>
          ) : null}
          {!recs.length && !active && (
            <section className="card">
              <Empty title={t("No changes found in this sample")}>{t("You can finalize Feature 1 with no selected changes and no project work.")}</Empty>
            </section>
          )}
          <F1Screens {...{ stage, recs, reviews, run, final, canEdit, onStage, project }} options={data.recommendation_options || []} historyRuns={runs} decisionSets={data.decision_sets || []} onRun={(id)=>go("workspace",{tab:"review",run:id,stage:"overview"})} FormComponent={Form} onSource={setSource}
            onDecision={(row, decision, locked, reason) => save("reviews", {decision, locked, reason: reason ?? reviews.find(x => x.recommendation_id === row.id)?.reason ?? ""}, reviews.find(x => x.recommendation_id === row.id))}
            pendingReviewIds={pendingReviewIds} reviewErrors={reviewErrors} onChange={changeReview} />
          {(stage === "summary" || stage === "completion") && (final ? (

            <section className="card finalized">
              <ShieldCheck size={28} />
              <h2>Final revision {final.version_no} complete</h2>
              <p>
                {stamp(final.finalized_at)}
              </p>
              <p>{t("Revision complete You can export the results without creating a revised document or project work.")}</p>
              <h3>Choose approved changes to send to project work</h3>
              {data.decision_items
                .filter(
                  (x) =>
                    x.decision_set_id === final.id && x.decision === "APPROVED",
                )
                .map((item) => {
                  const old = (data.packages || []).find(
                    (p) =>
                      p.scope_key === item.work_scope_key && !p.superseded_at,
                  );
                  return (
                    <div className="record" key={item.id}>
                      <label className="check">
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={!excludedHandoff.includes(item.id)}
                          onChange={(e) =>
                            setExcludedHandoff(
                              e.target.checked
                                ? excludedHandoff.filter((id) => id !== item.id)
                                : [...excludedHandoff, item.id],
                            )
                          }
                        />
                        {item.snapshot.final_wording || item.snapshot.proposed_material}
                      </label>
                      {old && (
                        <div className="grid two compare">
                          <div>
                            <small>Existing work · {old.execution_status}</small>
                            <p>
                              {old.snapshot.proposed_material} ·{" "}
                              {money(old.snapshot.quantity?.value)}{" "}
                              {old.snapshot.quantity?.unit}
                            </p>
                            <p>
                              Saving ฿
                              {money(old.snapshot.impacts?.cost_saving_thb)} ·
                              Reduction{" "}
                              {money(
                                old.snapshot.impacts?.carbon_reduction_tco2e,
                              )}{" "}
                              tCO₂e
                            </p>
                          </div>
                          <div>
                            <small>{t("This revision")}</small>
                            <p>
                              {item.snapshot.final_wording || item.snapshot.proposed_material} ·{" "}
                              {money(item.snapshot.quantity?.value)}{" "}
                              {item.snapshot.quantity?.unit}
                            </p>
                            <p>
                              Saving ฿
                              {money(item.snapshot.impacts?.cost_saving_thb)} ·
                              Reduction{" "}
                              {money(
                                item.snapshot.impacts?.carbon_reduction_tco2e,
                              )}{" "}
                              tCO₂e
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              <p className="muted">{t("Changed items already in progress cannot be replaced here. Uncheck them to send the other items. Existing work and history are kept.")}</p>
              <label className="stack">{t("Reason for replacing work that has not started")}<textarea
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                />
              </label>
              <div className="actions">
                <button
                  className="secondary"
                  onClick={() =>
                    exportFile(`greenspec-decisions-${final.version_no}.json`, {
                      generation_mode: "simulated",
                      ...final,
                      items: data.decision_items.filter(
                        (x) => x.decision_set_id === final.id,
                      ),
                    })
                  }
                >{t("Download JSON")}</button>
                <button
                  className="secondary"
                  onClick={() => {
                    const items = data.decision_items.filter(
                      (x) => x.decision_set_id === final.id,
                    );
                    const quote = (v) =>
                      '"' + String(v ?? "UNKNOWN").replaceAll('"', '""') + '"';
                    exportFile(
                      "decisions.csv",
                      "generation_mode,decision,selected_option,material,final_wording,cost_saving_thb,carbon_reduction_tco2e\n" +
                        items
                          .map((i) =>
                            [
                              "simulated",
                              i.decision,
                              i.snapshot.selected_option || "A",
                              i.snapshot.proposed_material,
                              i.snapshot.final_wording || i.snapshot.proposed_material,
                              i.snapshot.impacts?.cost_saving_thb,
                              i.snapshot.impacts?.carbon_reduction_tco2e,
                            ]
                              .map(quote)
                              .join(","),
                          )
                          .join("\n"),
                      "text/csv;charset=utf-8",
                    );
                  }}
                >{t("Download CSV")}</button>
                <button
                  disabled={!canEdit}
                  onClick={() => {
                    const key = requestId();
                    action(async () => {
                      const result = await rpc("gs_handoff", {
                        p_decision_set_id: final.id,
                        p_item_ids: data.decision_items
                          .filter(
                            (x) =>
                              x.decision_set_id === final.id &&
                              x.decision === "APPROVED" &&
                              !excludedHandoff.includes(x.id),
                          )
                          .map((x) => x.id),
                        p_request_id: key,
                        p_replace_reason: replaceReason || null,
                      });
                      if (result.code)
                        throw new Error(result.message || result.code);
                      return result;
                    }).then(
                      (result) =>
                        result && go("workspace", { tab: "execution" }),
                    );
                  }}
                >{t("Send to project work")}<ArrowRight size={15} />
                </button>
                <button
                  className="secondary"
                  onClick={() => go("workspace", { tab: "revision" })}
                >{t("Create revised document (optional)")}</button>
                <button
                  className="ghost"
                  disabled={!canEdit}
                  onClick={() => {
                    const key = requestId();
                    action(async () => {
                      const result = await rpc("gs_reopen", {
                        p_decision_set_id: final.id,
                        p_request_id: key,
                      });
                      go("workspace", {
                        tab: "review",
                        run: result.run_id || result.id,
                      });
                    });
                  }}
                >{t("Start a new draft")}</button>
              </div>
            </section>
          ) : (
            <section className="card">
              <h2>Feedback for the next round</h2>
              <label className="stack">{t("What would you like to change?")}<textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  disabled={!canEdit}
                />
              </label>
              <div className="actions">
                <button
                  className="secondary"
                  disabled={!canEdit || active}
                  onClick={() => {
                    const key = requestId();
                    action(async () => {
                      await mutate(project.id, "feedback", {
                        run_id: run.id,
                        text: feedback,
                      });
                      const result = await invoke("analyze", {
                        project_id: project.id,
                        request_id: key,
                        scenario: run.scenario,
                        document_version_ids:
                          run.input_snapshot?.document_versions?.map(
                            (v) => v.id || v.document_version_id,
                          ) || [],
                        parent_run_id: run.id,
                        feedback: {
                          overall: feedback,
                          items: reviews.map((r) => ({
                            recommendation_id: r.recommendation_id,
                            decision: r.decision,
                            reason: r.reason,
                            locked: r.locked,
                            lineage_id: recs.find(
                              (x) => x.id === r.recommendation_id,
                            )?.lineage_id,
                          })),
                        },
                      });
                      go("workspace", {
                        tab: "review",
                        run: result.run_id || result.id,
                      });
                    });
                  }}
                >{t("Request another round")}</button>
                <button
                  disabled={
                    pendingReviewIds.size > 0 || staleEpochs.has(run.id) || !canEdit ||
                    Boolean(finalizeReason) ||
                    run.status?.toUpperCase() === "FAILED"
                  }
                  title={finalizeReason || undefined}
                  onClick={() => {
                    if (
                      !confirm(
                        "Finalize this revision? The final revision is saved as a permanent record",
                      )
                    )
                      return;
                    const key = requestId();
                    action(() =>
                      rpc("gs_finalize", {
                        p_run_id: run.id,
                        p_review_epoch: run.review_epoch,
                        p_request_id: key,
                        p_omit_errors: omit,
                        p_omission_reason: omissionReason,
                      }),
                    );
                  }}
                >{t("Finalize revision")}<ShieldCheck size={16} />
                </button>
              </div>
              {finalizeReason && (
                <p className="muted">Cannot finalize yet: {finalizeReason}</p>
              )}
              <p className="muted">{t("A new round keeps only locked, unchanged approved choices. Review new or changed items again.")}</p>
            </section>
          ))}
        </>
      )}
      {source &&
        (() => {
          const v = data.document_versions.find(
            (v) => v.id === source.document_version_id,
          );
          return v ? (
            <SourceViewer
              version={v}
              source={source}
              documents={data.documents}
              onClose={() => setSource(null)}
            />
          ) : (
            <div className="error">{t("Source is not available")}</div>
          );
        })()}
    </>
  );
}
function Revisions({ project, data, canEdit, action }) {
  const { t } = useLanguage();
  const sets = (data.decision_sets ?? []).sort(
    (a, b) => b.version_no - a.version_no,
  );
  const [setId, setSetId] = useState(""),
    [reason, setReason] = useState(""),
    [excluded, setExcluded] = useState([]);
  const decision = sets.find((s) => s.id === setId) || sets[0];
  const revisions = (data.document_revisions ?? []).filter(
    (r) => r.decision_set_id === decision?.id,
  );
  return (
    <>
      <section className="card">
        <h2>Create a document from the final revision</h2>
        <p>{t("Optional for Feature 1 or project work. Supports only DOCX samples with known text locations.")}</p>
        {sets.length ? (
          <>
            <label className="stack">{t("Final revision")}<select
                value={decision.id}
                onChange={(e) => setSetId(e.target.value)}
              >
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    Version {s.version_no} · {stamp(s.finalized_at)}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={!canEdit}
              onClick={() => {
                const key = requestId();
                action(() =>
                  invoke("revision", {
                    operation: "generate",
                    decision_set_id: decision.id,
                    request_id: key,
                  }),
                );
              }}
            >{t("Create revised document")}</button>
          </>
        ) : (
          <Empty title={t("No final revision yet")}>{t("Finalize your choices in TOR Analysis first.")}</Empty>
        )}
        <p className="notice">{t("The original file is kept. A separate document is created. Check the final document layout before use.")}</p>
      </section>
      {revisions.map((r) => (
        <section className="card" key={r.id}>
          <div className="section-head">
            <h2>Revised documents {stamp(r.created_at)}</h2>
            <Badge>{r.status}</Badge>
          </div>
          {r.outdated && (
            <div className="notice warning">{t("This document may not match the current final revision.")}</div>
          )}
          {(r.changes || r.report?.changes || []).map((c, i) => (
            <div className="grid two compare" key={i}>
              <div>
                <small>{t("Before change")}</small>
                <p>{c.before || c.original_text}</p>
              </div>
              <div>
                <small>{t("After change")}</small>
                <p>{c.after || c.proposed_text}</p>
              </div>
            </div>
          ))}
          {(r.unapplied || r.report?.unapplied || []).map((u, i) => (
            <div className="notice warning" key={i}>
              <b>{t("Could not apply")}</b>
              <p>{u.reason || "This change could not be applied."}</p>
              <label className="check">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={excluded.includes(u.recommendation_id || u.id)}
                  onChange={(e) =>
                    setExcluded(
                      e.target.checked
                        ? [...excluded, u.recommendation_id || u.id]
                        : excluded.filter(
                            (x) => x !== (u.recommendation_id || u.id),
                          ),
                    )
                  }
                />{t("Skip this item")}</label>
            </div>
          ))}
          {["PARTIAL", "READY_FOR_REVIEW"].includes(r.status) && (
            <>
              <label className="stack">{t("Reason for skipping this change")}<textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button
                disabled={!canEdit}
                onClick={() => {
                  if (
                    !confirm(
                      "Approve this document with the listed skipped items and reasons.?",
                    )
                  )
                    return;
                  const key = requestId();
                  action(() =>
                    rpc("gs_approve_revision", {
                      p_revision_id: r.id,
                      p_expected_version: r.row_version,
                      p_exclusions: excluded.map((id) => ({
                        recommendation_id: id,
                        reason,
                      })),
                    }),
                  );
                }}
              >{t("Approve revised document")}</button>
            </>
          )}
          <div className="actions">
            {r.output_path && (
              <button
                className="secondary"
                onClick={() =>
                  action(() => download(r.output_path), {
                    message: "Document opened",
                    reload: false,
                  })
                }
              >{t("Download DOCX")}</button>
            )}
            <button
              className="secondary"
              onClick={() =>
                exportFile("revision-report.json", {
                  generation_mode: "simulated",
                  ...r,
                })
              }
            >{t("Download comparison report JSON")}</button>
          </div>
        </section>
      ))}
    </>
  );
}
function Members({ project, data, canEdit, save, action, role }) {
  const { t } = useLanguage();
  return (
    <section className="card">
      <h2>Project members</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("User")}</th>
              <th>{t("Access")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data.project_members ?? []).map((m) => (
              <tr key={m.user_id}>
                <td>{m.email || `${t("Guest")} ${m.user_id.slice(0, 6)}`}</td>
                <td>{t(({owner:"Owner",editor:"Editor",viewer:"Read only"})[m.role] || m.role)}</td>
                <td>
                  {role === "owner" && !project.archived_at && (
                    <button
                      className="ghost"
                      onClick={() =>
                        action(() =>
                          rpc("gs_remove_member", {
                            p_project_id: project.id,
                            p_user_id: m.user_id,
                          }),
                        )
                      }
                    >{t("Remove")}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {role === "owner" && !project.archived_at && (
        <>
          <h3>Add member / change access</h3>
          <p>{t("Use the email of an existing account. This does not send an invitation.")}</p>
          <p className="muted">{t("Guest accounts have no email. Email invitations are only for existing registered accounts.")}</p>
          <Form
            fields={[
              field("email", "Registered user's email", "email"),
              select("role", "Access", ["viewer", "editor", "owner"]),
            ]}
            disabled={!canEdit}
            onSubmit={(v) =>
              action(() =>
                rpc("gs_member", {
                  p_project_id: project.id,
                  p_email: v.email,
                  p_role: v.role || "viewer",
                  p_remove: false,
                }),
              )
            }
          />
          <hr />
          <button
            className="secondary"
            onClick={() => {
              if (
                confirm(
                  "Archive project? You can still read the project. Restore it to make changes.",
                )
              )
                action(() =>
                  rpc("gs_archive", {
                    p_project_id: project.id,
                    p_archived: true,
                    p_expected_version: project.row_version,
                  }),
                );
            }}
          >{t("Archive project")}</button>
        </>
      )}
    </section>
  );
}
function OutcomeComparison({ packages, actuals }) {
  const { t } = useLanguage();
  const metrics = [
    {
      metric: "cost",
      title: "Cost",
      unit: "THB",
      base: "baseline_cost_thb",
      selected: "selected_cost_thb",
    },
    {
      metric: "carbon",
      title: "Carbon",
      unit: "tCO₂e",
      base: "baseline_carbon_tco2e",
      selected: "selected_carbon_tco2e",
    },
  ];
  const sum = (values) =>
    values.some((v) => v != null)
      ? values.filter((v) => v != null).reduce((a, b) => a + Number(b), 0)
      : null;
  return (
    <section className="card">
      <h2>Estimates and actual results</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("items")}</th>
              <th>{t("Original (sample)")}</th>
              <th>{t("Selected material (sample)")}</th>
              <th>{t("Known actual results")}</th>
              <th>{t("Actual result completeness")}</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const records = packages.map((p) =>
                actuals.find(
                  (r) =>
                    r.package_id === p.id &&
                    r.metric === m.metric &&
                    r.total_value != null &&
                    r.source_description &&
                    r.methodology,
                ),
              );
              return (
                <tr key={m.metric}>
                  <td>
                    {m.title} · {m.unit}
                  </td>
                  <td>
                    {money(
                      sum(packages.map((p) => p.snapshot?.impacts?.[m.base])),
                    )}
                  </td>
                  <td>
                    {money(
                      sum(
                        packages.map((p) => p.snapshot?.impacts?.[m.selected]),
                      ),
                    )}
                  </td>
                  <td>{money(sum(records.map((r) => r?.total_value)))}</td>
                  <td>
                    <Badge
                      tone={
                        records.filter(Boolean).length === packages.length &&
                        packages.length
                          ? ""
                          : "warning"
                      }
                    >
                      {records.filter(Boolean).length}/{packages.length} Work package
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted">{t("Actual totals include only sourced values. Missing results stay unknown. Estimates are not used to fill missing results.")}</p>
      <p className="notice">{t("Actual carbon savings cannot be compared yet. Confirm that the source, method, and scope match the baseline sample figures; not calculated from installed quantity")}</p>
    </section>
  );
}
function Execution({
  project,
  data,
  canEdit,
  save,
  action,
  go,
  packageId,
  session,
}) {
  const { t } = useLanguage();
  const [source, setSource] = useState(null);
  const packages = (data.packages ?? []).filter((p) => !p.superseded_at);
  const pack = packages.find((p) => p.id === packageId);
  const members = (data.project_members ?? [])
    .filter((m) => m.role !== "viewer")
    .map((m) => ({ value: m.user_id, label: m.email || `${t("Guest")} ${m.user_id.slice(0, 6)}` }));
  const memberOptions = [{ value: "", label: "Not assigned" }, ...members];
  const complete = packages.filter(
    (p) => p.execution_status === "COMPLETE",
  ).length;
  const costComplete = packages.filter((p) =>
    data.actual_results?.some(
      (r) =>
        r.package_id === p.id &&
        r.metric === "cost" &&
        r.total_value != null &&
        r.source_description &&
        r.methodology,
    ),
  ).length;
  const carbonComplete = packages.filter((p) =>
    data.actual_results?.some(
      (r) =>
        r.package_id === p.id &&
        r.metric === "carbon" &&
        r.total_value != null &&
        r.source_description &&
        r.methodology,
    ),
  ).length;
  if (!pack)
    return (
      <>
        <div className="stats">
          {[
            [
              "Checked and complete",
              `${complete}/${packages.length}`,
              packages.length && complete === packages.length
                ? "Projects completed"
                : "Work not complete",
            ],
            [
              "Actual cost data",
              `${costComplete}/${packages.length}`,
              "Data with a source",
            ],
            [
              "Actual carbon data",
              `${carbonComplete}/${packages.length}`,
              "separate from sample estimates",
            ],
            [
              "Active work packages",
              packages.length,
              "From finalized approved choices",
            ],
          ].map(([t, v, n]) => (
            <section className="stat" key={t}>
              <small>{t}</small>
              <strong>{v}</strong>
              <small>{n}</small>
            </section>
          ))}
        </div>
        <OutcomeComparison
          packages={packages}
          actuals={data.actual_results || []}
        />
        <section className="card">
          <h2>Material work packages</h2>
          {!packages.length ? (
            <Empty title={t("No work packages yet")}>{t("Finalize the revision, then choose approved items to send to project work. Approving an item does not create project work automatically.")}</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("Selected material")}</th>
                    <th>{t("Work progress")}</th>
                    <th>{t("Check")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {packages.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>
                          {p.snapshot?.proposed_material || p.name}
                        </strong>
                        <small>
                          {p.snapshot?.quantity?.value}{" "}
                          {p.snapshot?.quantity?.unit} · Sample targets
                        </small>
                      </td>
                      <td>
                        <Badge>{p.execution_status}</Badge>
                      </td>
                      <td>{p.verification_status}</td>
                      <td>
                        <button
                          className="secondary"
                          onClick={() =>
                            go("workspace", { tab: "execution", package: p.id })
                          }
                        >{t("Open package")}<ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  return (
    <>
      <button
        className="ghost back"
        onClick={() => go("workspace", { tab: "execution" })}
      >
        <ArrowLeft size={14} />{t("All work packages")}</button>
      <div className="page-title">
        <div>
          <p className="eyebrow">SUSTAINABILITY PACKAGE</p>
          <h1>{pack.snapshot?.proposed_material || "Material work packages"}</h1>
          <p>
            {money(pack.snapshot?.quantity?.value)}{" "}
            {pack.snapshot?.quantity?.unit} ·
            Linked to the final revision
          </p>
        </div>
        <Badge>
          {pack.execution_status} / {pack.verification_status}
        </Badge>
      </div>
      <div className="notice">{t("Cost and carbon targets come from sample analysis. Actual results need their own source and calculation method.")}</div>
      <Form
        key={pack.row_version}
        fields={[select("owner_id", "Package owner", memberOptions)]}
        initial={{ owner_id: pack.owner_id || "" }}
        disabled={!canEdit}
        onSubmit={(v) =>
          save("packages", { owner_id: v.owner_id || null }, pack)
        }
      />
      <section className="card">
        <h2>Approved source and targets</h2>
        <div className="grid two">
          <div>
            <h3>Original requirement</h3>
            <p>{pack.snapshot?.original_material}</p>
            {pack.snapshot?.sources?.map((s, i) => (
              <button key={i} className="source" onClick={() => setSource(s)}>
                <FileText size={16} />
                <span>
                  {s.exact_text}
                  <small>{locator(s.locator)} · Open original version</small>
                </span>
              </button>
            ))}
          </div>
          <div>
            <h3>Estimates from sample analysis</h3>
            <p>
              Cost saving ฿{money(pack.snapshot?.impacts?.cost_saving_thb)}
            </p>
            <p>
              Carbon reduction {money(pack.snapshot?.impacts?.carbon_reduction_tco2e)}{" "}
              tCO₂e
            </p>
            <small>{t("These targets are not actual results or evidence of completion.")}</small>
          </div>
        </div>
      </section>
      <PackageDetail
        {...{
          project,
          data,
          pack,
          canEdit,
          save,
          action,
          members,
          memberOptions,
          session,
        }}
      />
      {source &&
        data.document_versions?.find(
          (v) => v.id === source.document_version_id,
        ) && (
          <SourceViewer
            version={data.document_versions.find(
              (v) => v.id === source.document_version_id,
            )}
            source={source}
            documents={data.documents}
            onClose={() => setSource(null)}
          />
        )}
    </>
  );
}
function PackageDetail({
  project,
  data,
  pack,
  canEdit,
  save,
  action,
  members,
  memberOptions,
  session,
}) {
  const { t } = useLanguage();
  const [section, setSection] = useState("tasks"),
    [evidence, setEvidence] = useState([]),
    [verifyNotes, setVerifyNotes] = useState(""),
    [commentKind, setCommentKind] = useState("packages");
  const urlSection = new URLSearchParams(location.hash.split("?")[1] || "").get(
    "section",
  );
  useEffect(() => {
    if (
      [
        "tasks",
        "procurement",
        "implementation",
        "issues",
        "proof",
        "actuals",
        "activity",
      ].includes(urlSection)
    )
      setSection(urlSection);
  }, [urlSection]);
  const pick = (table) =>
    (data[table] ?? []).filter((x) => x.package_id === pack.id);
  const procurement = pick("procurements")[0];
  const allEntries = pick("implementation_entries");
  const entries = allEntries.filter(
    (e) => !allEntries.some((c) => c.corrects_id === e.id),
  );
  const delivered = entries
      .filter((x) => x.kind === "delivery")
      .reduce((a, b) => a + Number(b.quantity), 0),
    installed = entries
      .filter((x) => x.kind === "install")
      .reduce((a, b) => a + Number(b.quantity), 0);
  const quantity = pack.snapshot?.quantity?.value,
    unit = pack.snapshot?.quantity?.unit;
  const sections = [
    ["tasks", "Tasks and dates"],
    ["procurement", "Purchases"],
    ["implementation", "Delivery / installation"],
    ["issues", "Issue"],
    ["proof", "Checks / evidence"],
    ["actuals", "Actual results"],
    ["activity", "Comments / history"],
  ];
  const common = { package_id: pack.id };
  return (
    <>
      <div className="tabs sub-tabs">
        {sections.map(([id, label]) => (
          <button
            key={id}
            className={`ghost ${section === id ? "selected" : ""}`}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {section === "tasks" && (
        <div className="grid two">
          {[
            ["tasks", "Tasks", ["TODO", "IN_PROGRESS", "DONE"]],
            ["milestones", "Schedule", ["TODO", "IN_PROGRESS", "DONE"]],
          ].map(([table, title, statuses]) => (
            <section className="card" key={table}>
              <h2>{title}</h2>
              {pick(table).map((row) => (
                <details className="record" key={row.id}>
                  <summary>
                    {row.title} <Badge>{row.status}</Badge>
                  </summary>
                  <Form
                    key={row.row_version}
                    fields={[
                      field("title", "Title"),
                      select("priority", "Priority", [
                        "normal",
                        "high",
                        "low",
                      ]),
                      select("assignee_id", "Assign", memberOptions),
                      field("due_at", "Set date", "datetime-local", false),
                      select("status", "Status", statuses),
                    ]}
                    initial={{ ...row, due_at: bangkokInput(row.due_at) }}
                    disabled={!canEdit}
                    onSubmit={(v) =>
                      save(
                        table,
                        {
                          ...common,
                          ...v,
                          assignee_id: v.assignee_id || null,
                          due_at: v.due_at ? bangkokUTC(v.due_at) : null,
                        },
                        row,
                      )
                    }
                  />
                </details>
              ))}
              <h3>Add {title}</h3>
              <Form
                fields={[
                  field("title", "Title"),
                  select("priority", "Priority", ["normal", "high", "low"]),
                  select("assignee_id", "Assign", memberOptions),
                  field("due_at", "Set date", "datetime-local", false),
                ]}
                disabled={!canEdit}
                label="Add record"
                onSubmit={(v) =>
                  save(table, {
                    ...common,
                    ...v,
                    assignee_id: v.assignee_id || null,
                    due_at: v.due_at ? bangkokUTC(v.due_at) : null,
                    status: statuses[0],
                  })
                }
              />
            </section>
          ))}
        </div>
      )}
      {section === "procurement" && (
        <section className="card">
          <h2>Save purchase</h2>
          <p>{t("Use the supplier chosen by your team. Supplier recommendation Not available yet")}</p>
          <Form
            key={procurement?.row_version ?? 0}
            fields={[
              field("supplier_name", "Selected supplier", "text", false),
              field("po_reference", "Order number", "text", false),
              field("ordered_qty", "Order quantity", "number"),
              field("unit", "Unit"),
              field(
                "expected_delivery_at",
                "Delivery due",
                "datetime-local",
                false,
              ),
              select("status", "Step", [
                "APPROVED",
                "RFQ",
                "SUPPLIER_SELECTED",
                "PO_ISSUED",
                "SHIPPING",
                "DELIVERED",
                "ACCEPTED",
              ]),
              field(
                "variance_reason",
                "Reason for a different quantity",
                "textarea",
                false,
              ),
            ]}
            initial={
              procurement
                ? {
                    ...procurement,
                    expected_delivery_at: bangkokInput(
                      procurement.expected_delivery_at,
                    ),
                  }
                : { ordered_qty: quantity, unit, status: "APPROVED" }
            }
            disabled={!canEdit}
            onSubmit={(v) =>
              save(
                "procurements",
                {
                  ...common,
                  ...v,
                  expected_delivery_at: v.expected_delivery_at
                    ? bangkokUTC(v.expected_delivery_at)
                    : null,
                },
                procurement,
              )
            }
          />
          <p className="muted">{t("The system checks quantities, supplier, order number, and required dates before saving each step.")}</p>
        </section>
      )}
      {section === "implementation" && (
        <section className="card">
          <h2>Delivery and installation</h2>
          <div className="stats compact">
            <section className="stat">
              <small>{t("Received / target")}</small>
              <strong>
                {money(delivered)} / {money(quantity)} {unit}
              </strong>
            </section>
            <section className="stat">
              <small>{t("Installed / target")}</small>
              <strong>
                {money(installed)} / {money(quantity)} {unit}
              </strong>
            </section>
          </div>
          <Form
            fields={[
              select("kind", "items", ["delivery", "install"]),
              field("quantity", "Quantity", "number"),
              field("unit", "Unit"),
              field("occurred_at", "Date", "datetime-local"),
              field(
                "notes",
                "Notes / reason for extra delivery",
                "textarea",
                false,
              ),
            ]}
            initial={{
              kind: "delivery",
              unit,
              occurred_at: bangkokInput(new Date()),
            }}
            disabled={!canEdit}
            label="Save quantity"
            onSubmit={(v) =>
              save("implementation_entries", {
                ...common,
                ...v,
                occurred_at: bangkokUTC(v.occurred_at),
              })
            }
          />
          <p className="notice">{t("Partial quantities are not complete. Installed quantity cannot exceed received quantity. Corrections are saved as new records. Earlier records are kept.")}</p>
          {entries.map((e) => (
            <article className="record" key={e.id}>
              <b>
                {e.kind} · {money(e.quantity)} {e.unit}
              </b>
              <p>{e.notes}</p>
              <small>{stamp(e.occurred_at)}</small>
              <details>
                <summary>{t("Correct a quantity with a new record")}</summary>
                <Form
                  fields={[
                    field("quantity", "Correct quantity", "number"),
                    field("notes", "Reason for correction", "textarea"),
                  ]}
                  disabled={!canEdit}
                  onSubmit={(v) =>
                    save("implementation_entries", {
                      ...common,
                      kind: e.kind,
                      unit: e.unit,
                      corrects_id: e.id,
                      occurred_at: new Date().toISOString(),
                      ...v,
                    })
                  }
                />
              </details>
            </article>
          ))}
        </section>
      )}
      {section === "issues" && (
        <section className="card">
          <h2>Issues and changes</h2>
          {pick("issues").map((i) => (
            <details className="record" key={i.id}>
              <summary>
                {i.title}{" "}
                <Badge tone={i.blocks_verification ? "warning" : ""}>
                  {i.status} {i.blocks_verification ? "· Blocks approval" : ""}
                </Badge>
              </summary>
              <p>{i.description}</p>
              <Form
                key={i.row_version}
                fields={[
                  select("status", "Status", [
                    "OPEN",
                    "IN_PROGRESS",
                    "RESOLVED",
                  ]),
                  field("resolution", "Change result / reason", "textarea", false),
                  {
                    name: "blocks_verification",
                    label: "Blocks approval",
                    type: "checkbox",
                  },
                  {
                    name: "requires_feature1_review",
                    label: "Needs another review Feature 1",
                    type: "checkbox",
                  },
                ]}
                initial={i}
                disabled={!canEdit}
                onSubmit={(v) => save("issues", v, i)}
              />
            </details>
          ))}
          <h3>Add issue</h3>
          <Form
            fields={[
              field("title", "Title"),
              field("description", "Details", "textarea"),
              select("severity", "Severity", ["normal", "critical"]),
              select("owner_id", "Assigned to", memberOptions),
              {
                name: "blocks_verification",
                label: "Blocks approval",
                type: "checkbox",
              },
              {
                name: "requires_feature1_review",
                label: "Material choice needs another review",
                type: "checkbox",
              },
            ]}
            disabled={!canEdit}
            onSubmit={(v) =>
              save("issues", {
                ...common,
                status: "OPEN",
                ...v,
                owner_id: v.owner_id || null,
                blocks_verification:
                  v.severity === "critical" || v.blocks_verification,
              })
            }
          />
        </section>
      )}
      {section === "proof" && (
        <section className="card">
          <h2>Evidence and checks</h2>
          <p>{t("To pass, add at least one ready evidence file, a checker, notes, the full installed quantity, and clear all blocking issues.")}</p>
          <label className={`button secondary ${!canEdit ? "disabled" : ""}`}>{t("Upload evidence")}<input
              disabled={!canEdit}
              type="file"
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
              className="file-hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                action(async () => {
                  const hash = await checksum(file);
                  const begin = await invoke("document", {
                    operation: "begin",
                    project_id: project.id,
                    package_id: pack.id,
                    filename: file.name,
                    mime: fileMime(file),
                    bytes: file.size,
                    checksum: hash,
                    evidence_kind: "verification",
                    request_id: requestId(),
                  });
                  await checked(
                    db.storage
                      .from("evidence")
                      .upload(begin.storage_path, file, {
                        contentType: fileMime(file),
                        upsert: false,
                      }),
                  );
                  await invoke("document", {
                    operation: "commit",
                    project_id: project.id,
                    evidence_id: begin.id,
                    checksum: hash,
                  });
                });
              }}
            />
          </label>
          {pick("evidence_files").map((e) => (
            <div className="record" key={e.id}>
              <label className="check">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={evidence.includes(e.id)}
                  onChange={(ev) =>
                    setEvidence(
                      ev.target.checked
                        ? [...evidence, e.id]
                        : evidence.filter((x) => x !== e.id),
                    )
                  }
                />
                {e.filename || e.kind} · {e.upload_state}
              </label>
              <button
                className="ghost"
                onClick={() =>
                  action(() => download(e.storage_path, "evidence"), {
                    message: "Evidence opened",
                    reload: false,
                  })
                }
              >{t("View file")}</button>
            </div>
          ))}
          <label className="stack">{t("Checker's notes")}<textarea
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
            />
          </label>
          <div className="actions">
            <button
              disabled={!canEdit || !evidence.length || !verifyNotes.trim()}
              onClick={() =>
                action(() =>
                  rpc("gs_verify", {
                    p_package_id: pack.id,
                    p_result: "PASS",
                    p_notes: verifyNotes,
                    p_evidence_ids: evidence,
                  }),
                )
              }
            >{t("Save as passed")}</button>
            <button
              className="secondary"
              disabled={!canEdit || !verifyNotes.trim()}
              onClick={() =>
                action(() =>
                  rpc("gs_verify", {
                    p_package_id: pack.id,
                    p_result: "NON_CONFORMANCE",
                    p_notes: verifyNotes,
                    p_evidence_ids: evidence,
                  }),
                )
              }
            >{t("Save as failed / needs changes")}</button>
          </div>
          {pick("verifications").map((v) => (
            <article className="record" key={v.id}>
              <Badge>{v.result}</Badge>
              <p>{v.notes}</p>
              <small>
                {v.verifier_id} · {stamp(v.verified_at)}
              </small>
            </article>
          ))}
        </section>
      )}
      {section === "actuals" && (
        <>
          <OutcomeComparison
            packages={[pack]}
            actuals={data.actual_results || []}
          />
          <div className="grid two">
            {[
              ["cost", "Actual cost", "THB"],
              ["carbon", "Actual carbon", "tCO2e"],
            ].map(([metric, title, unit]) => {
              const row = pick("actual_results").find(
                (r) => r.metric === metric,
              );
              return (
                <section className="card" key={metric}>
                  <h2>{title}</h2>
                  <Badge tone={row?.total_value != null ? "" : "warning"}>
                    {row?.total_value != null
                      ? "Data recorded"
                      : "Unknown"}
                  </Badge>
                  <Form
                    key={row?.row_version ?? 0}
                    fields={[
                      field(
                        "total_value",
                        "Total (zero means an actual zero)",
                        "number",
                      ),
                      field("unit", "Unit"),
                      field("source_description", "Source", "textarea"),
                      field(
                        "methodology",
                        "Method / baseline",
                        "textarea",
                      ),
                      select("provenance", "Data source", [
                        "recorded",
                        "simulated",
                      ]),
                    ]}
                    initial={row || { unit, provenance: "recorded" }}
                    disabled={!canEdit}
                    onSubmit={(v) =>
                      save("actual_results", { ...common, metric, ...v }, row)
                    }
                  />
                  <p className="muted">{t("Estimates are not used to fill missing results. Result completeness is separate from work progress.")}</p>
                </section>
              );
            })}
          </div>
        </>
      )}
      {section === "activity" && (
        <section className="card">
          <h2>Comments and history</h2>
          <label className="stack">{t("Comment in")}<select
              value={commentKind}
              onChange={(e) => setCommentKind(e.target.value)}
            >
              <option value="packages">{t("This work package")}</option>
              <option value="tasks">{t("Tasks")}</option>
              <option value="issues">{t("Issue")}</option>
              <option value="verifications">{t("Checks")}</option>
            </select>
          </label>
          <Form
            key={commentKind}
            fields={[
              select(
                "target_id",
                "target items",
                commentKind === "packages"
                  ? [
                      {
                        value: pack.id,
                        label: pack.snapshot?.proposed_material || "This work package",
                      },
                    ]
                  : pick(commentKind).map((x) => ({
                      value: x.id,
                      label: x.title || `${x.result} · ${stamp(x.verified_at)}`,
                    })),
              ),
              field("text", "Comment", "textarea"),
            ]}
            disabled={
              !canEdit ||
              (commentKind !== "packages" && !pick(commentKind).length)
            }
            label="Add comment"
            onSubmit={(v) =>
              save("comments", { ...v, target_kind: commentKind })
            }
          />
          {(data.comments ?? [])
            .filter(
              (c) =>
                c.target_id === pack.id ||
                [
                  ...pick("tasks"),
                  ...pick("issues"),
                  ...pick("verifications"),
                ].some((r) => r.id === c.target_id),
            )
            .map((c) => (
              <article className="record" key={c.id}>
                <p>{c.text}</p>
                <small>
                  {c.actor_id || c.author_id} · {stamp(c.created_at)}
                </small>
              </article>
            ))}
          <h3>Change history</h3>
          {(data.activity_events ?? []).map((e) => (
            <article className="record" key={e.id}>
              <b>{e.event || e.kind}</b>
              <small>
                {e.actor_id} · {stamp(e.created_at)}
              </small>
              <details>
                <summary>{t("Details")}</summary>
                <pre>
                  {JSON.stringify(
                    { before: e.before, after: e.after },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<LanguageProvider><App /></LanguageProvider>);


