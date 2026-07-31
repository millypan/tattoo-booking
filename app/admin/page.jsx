"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  formatSlotLabel,
  weekdayOfDateString,
  taipeiTodayDateString,
  addDaysToDateString,
} from "../../lib/slotFormat.mjs";

const STORAGE_KEY = "mly_admin_key";

const WEEKDAY_OPTIONS = [
  { label: "一", value: 1 },
  { label: "二", value: 2 },
  { label: "三", value: 3 },
  { label: "四", value: 4 },
  { label: "五", value: 5 },
  { label: "六", value: 6 },
  { label: "日", value: 0 },
];

const DEFAULT_TIMES = ["13:00", "15:00", "17:00", "19:00", "21:00"];
const WEEK_RANGE_OPTIONS = [1, 2, 3, 4];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MAX_CREATE_SLOTS = 60; // 對應 app/api/admin/slots/route.js 的 MAX_CREATE_SLOTS，超過就擋在預覽階段

export default function AdminPage() {
  // null=尚未從 localStorage 讀取；""=沒有金鑰；string=有金鑰
  const [adminKey, setAdminKey] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    setAdminKey(saved || "");
  }, []);

  const authed = !!adminKey;

  // 共用 fetch：自動帶密鑰 header；收到 401 就清掉本機密鑰、丟回登入畫面
  const apiFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(path, {
        ...options,
        headers: { ...(options.headers || {}), "x-admin-key": adminKey },
      });
      if (res.status === 401) {
        window.localStorage.removeItem(STORAGE_KEY);
        setAdminKey("");
        setAuthError("密碼錯誤或已失效，請重新輸入");
        throw new Error("unauthorized");
      }
      return res;
    },
    [adminKey]
  );

  async function submitPassword(e) {
    e.preventDefault();
    setAuthError("");
    setCheckingAuth(true);
    const candidate = passwordInput.trim();
    try {
      const res = await fetch("/api/admin/slots", { headers: { "x-admin-key": candidate } });
      if (res.status === 401) {
        setAuthError("密碼錯誤");
      } else if (!res.ok) {
        setAuthError("連線失敗，請再試一次");
      } else {
        window.localStorage.setItem(STORAGE_KEY, candidate);
        setAdminKey(candidate);
      }
    } catch (err) {
      setAuthError("連線失敗，請再試一次");
    }
    setCheckingAuth(false);
  }

  // 密碼改完之後（見 PasswordSection）要立即同步本機存的 adminKey，
  // 不然下一次 apiFetch 還是帶舊密碼、馬上被 401 踢出去。
  const updateStoredAdminKey = useCallback((next) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setAdminKey(next);
  }, []);

  if (adminKey === null) return null; // 讀 localStorage 前先不畫畫面，避免密碼框閃一下又消失

  if (!authed) {
    return (
      <>
        <AdminStyles />
        <div className="gate">
          <BackLink />
          <h1 className="serif">米粒的時段管理</h1>
          <form onSubmit={submitPassword}>
            <div className="field">
              <label htmlFor="pw">管理密碼</label>
              <input
                type="password"
                id="pw"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                required
              />
            </div>
            {authError ? <p className="err">{authError}</p> : null}
            <button className="cta" type="submit" disabled={checkingAuth}>
              {checkingAuth ? "驗證中…" : "進入"}
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminStyles />
      <AdminPanel apiFetch={apiFetch} adminKey={adminKey} onAdminKeyChange={updateStoredAdminKey} />
    </>
  );
}

// 頁面頂部「回預約網站」連結；登入前、登入後兩種畫面都要顯示，用純 <a> 避免額外引入 next/link 的複雜度
function BackLink() {
  return (
    <p style={{ margin: "0 0 18px" }}>
      <a href="/" style={{ color: "var(--bone-dim)", fontSize: 13, letterSpacing: ".04em" }}>
        ← 回預約網站
      </a>
    </p>
  );
}

// 只給 /admin 這頁用的樣式，刻意不動全站共用的 app/globals.css，避免影響其他頁面。
// 沿用 globals.css 已定義的色票變數（--ink-3、--line、--cinnabar 等）維持全站視覺一致。
function AdminStyles() {
  return (
    <style>{`
      .gate{max-width:22em;margin:60px auto}
      .gate h1{font-size:22px;margin:0 0 18px;letter-spacing:.1em;font-weight:600}

      /* globals.css 的 input 選擇器沒有涵蓋 input[type=password]，這裡沿用同一組色票變數補上，
         讓 admin 頁的密碼框跟站內其他輸入框視覺一致（焦點樣式 globals.css 的 input:focus 本來就有涵蓋，不重複加） */
      input[type=password]{
        width:100%;background:var(--ink-3);border:1px solid var(--line);color:var(--bone);
        padding:11px 13px;border-radius:var(--radius);font:inherit;font-size:15px;
      }

      .admin-section{margin:30px 0 40px;padding-top:26px;border-top:1px solid var(--line)}
      .admin-section:first-of-type{border-top:none;padding-top:0}
      .admin-section h2{font-size:18px;letter-spacing:.12em;font-weight:600;margin:0 0 16px}
      .admin-section h3{font-size:13px;letter-spacing:.15em;color:var(--bone-dim);margin:20px 0 8px;font-weight:400}
      .admin-section h3:first-of-type{margin-top:0}

      .time-add{display:flex;gap:8px;align-items:center;margin-top:8px}
      .time-add input{width:110px}

      .preview-list{list-style:none;padding:0;margin:14px 0;border-top:1px solid var(--line)}
      .preview-list li{
        display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line);
        font-size:14px;font-variant-numeric:tabular-nums;color:var(--bone-dim);
      }

      .result-box{border:1px solid var(--line);border-left:3px solid var(--jade);padding:14px 18px;margin-top:16px;font-size:14px}
      .result-box b{color:var(--bone)}
      .result-box .skip-list{color:var(--bone-dim);margin-top:6px}

      .slot-row{
        display:flex;justify-content:space-between;align-items:center;gap:10px;
        padding:12px 0;border-bottom:1px solid var(--line);font-size:14px;
      }
      .slot-row .info{display:flex;flex-direction:column;gap:3px}
      .slot-row .name{font-variant-numeric:tabular-nums;letter-spacing:.03em}
      .slot-row .warn{color:#d9b96b;font-size:12.5px}
      .slot-row .close-btn{
        flex-shrink:0;background:none;border:1px solid var(--line);color:var(--bone-dim);
        padding:7px 16px;border-radius:var(--radius);font-size:13px;letter-spacing:.08em;
      }
      .slot-row .close-btn:hover{border-color:var(--cinnabar);color:var(--cinnabar)}
      .slot-row .close-btn[disabled]{opacity:.5;cursor:wait}
    `}</style>
  );
}

function AdminPanel({ apiFetch, adminKey, onAdminKeyChange }) {
  // 開時段區
  const [weekdays, setWeekdays] = useState(() => new Set());
  const [timeOptions, setTimeOptions] = useState(DEFAULT_TIMES);
  const [selectedTimes, setSelectedTimes] = useState(() => new Set());
  const [customTime, setCustomTime] = useState("");
  const [customTimeError, setCustomTimeError] = useState("");
  const [weeksRange, setWeeksRange] = useState(1);
  const [slotType, setSlotType] = useState("刺青");
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState("");

  // 已開時段區
  const [futureSlots, setFutureSlots] = useState(null);
  const [slotsError, setSlotsError] = useState("");
  const [closingId, setClosingId] = useState(null);

  const loadFutureSlots = useCallback(async () => {
    setSlotsError("");
    try {
      const res = await apiFetch("/api/admin/slots");
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setFutureSlots(data);
    } catch (e) {
      if (e.message !== "unauthorized") setSlotsError("讀取時段失敗，請重新整理再試");
    }
  }, [apiFetch]);

  useEffect(() => {
    loadFutureSlots();
  }, [loadFutureSlots]);

  function toggleWeekday(v) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  function toggleTime(t) {
    setSelectedTimes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function addCustomTime() {
    const t = customTime.trim();
    if (!TIME_RE.test(t)) {
      setCustomTimeError("請輸入 HH:MM 格式，例如 14:30");
      return;
    }
    setCustomTimeError("");
    setTimeOptions((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setSelectedTimes((prev) => new Set(prev).add(t));
    setCustomTime("");
  }

  // 即時預覽：從明天起算 weeksRange×7 天內，篩出符合勾選星期幾的日期 × 勾選時間，依時間升冪排序
  // 星期幾與日期運算一律走 lib/slotFormat.mjs 的台北時區函式，不用瀏覽器本地時間的 getDay()
  const preview = useMemo(() => {
    if (weekdays.size === 0 || selectedTimes.size === 0) return [];
    const today = taipeiTodayDateString();
    const start = addDaysToDateString(today, 1);
    const totalDays = weeksRange * 7;
    const times = [...selectedTimes].sort();
    const items = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDaysToDateString(start, i);
      if (!weekdays.has(weekdayOfDateString(d))) continue;
      for (const t of times) {
        const iso = `${d}T${t}:00+08:00`;
        items.push({ date: d, time: t, iso, label: formatSlotLabel(iso) });
      }
    }
    items.sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
    return items;
  }, [weekdays, selectedTimes, weeksRange]);

  async function submitCreate() {
    if (preview.length === 0) return;
    setCreating(true);
    setCreateError("");
    setCreateResult(null);
    try {
      const res = await apiFetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: preview.map(({ date, time }) => ({ date, time })),
          type: slotType,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setCreateError(body.error || "建立失敗，請再試一次");
      } else {
        const data = await res.json();
        setCreateResult(data);
        await loadFutureSlots();
      }
    } catch (e) {
      if (e.message !== "unauthorized") setCreateError("建立失敗，請再試一次");
    }
    setCreating(false);
  }

  async function handleClose(id, status) {
    const confirmMsg =
      status === "保留中"
        ? "這個時段有客人正在洽談中，確定要關閉？"
        : "確定要關閉這個時段嗎？";
    if (!window.confirm(confirmMsg)) return;
    setClosingId(id);
    try {
      const res = await apiFetch("/api/admin/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setFutureSlots((prev) => (prev || []).filter((s) => s.id !== id));
      }
    } catch (e) {
      // 401 已由 apiFetch 處理跳回登入畫面；其他錯誤靜默失敗，米粒可再按一次關閉
    }
    setClosingId(null);
  }

  return (
    <div>
      <BackLink />
      <h1 className="serif" style={{ fontSize: 22, letterSpacing: ".1em", marginBottom: 6 }}>
        米粒的時段管理
      </h1>
      <p className="hint" style={{ marginBottom: 0 }}>批次開放刺青／諮詢時段，或關閉不需要的時段。</p>

      <section className="admin-section">
        <h2 className="serif">開時段</h2>

        <h3>星期幾（可複選）</h3>
        <div className="chips">
          {WEEKDAY_OPTIONS.map((w) => (
            <button
              key={w.value}
              type="button"
              className={weekdays.has(w.value) ? "on" : ""}
              onClick={() => toggleWeekday(w.value)}
            >
              週{w.label}
            </button>
          ))}
        </div>

        <h3>時間（可複選）</h3>
        <div className="chips">
          {timeOptions.map((t) => (
            <button
              key={t}
              type="button"
              className={selectedTimes.has(t) ? "on" : ""}
              onClick={() => toggleTime(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="time-add">
          <input
            type="text"
            placeholder="HH:MM"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            maxLength={5}
          />
          <button type="button" className="cta ghost" onClick={addCustomTime}>加入自訂時間</button>
        </div>
        {customTimeError ? <p className="err">{customTimeError}</p> : null}

        <h3>套用範圍</h3>
        <div className="chips">
          {WEEK_RANGE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={weeksRange === n ? "on" : ""}
              onClick={() => setWeeksRange(n)}
            >
              未來 {n} 週
            </button>
          ))}
        </div>

        <h3>類型</h3>
        <div className="chips">
          {["刺青", "諮詢"].map((t) => (
            <button
              key={t}
              type="button"
              className={slotType === t ? "on" : ""}
              onClick={() => setSlotType(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <h3>預覽（{preview.length} 個時段）</h3>
        {preview.length === 0 ? (
          <p className="hint">先勾選星期幾與時間，這裡會列出即將建立的時段。</p>
        ) : (
          <ul className="preview-list">
            {preview.map((p) => (
              <li key={p.iso}>
                <span>{p.label}</span>
                <span>{slotType}</span>
              </li>
            ))}
          </ul>
        )}

        {preview.length > MAX_CREATE_SLOTS ? (
          <p className="err">
            一次最多開 {MAX_CREATE_SLOTS} 個，目前預覽 {preview.length} 個，請分批（減少勾選的星期/時段/週數）
          </p>
        ) : (
          <button
            className="cta"
            type="button"
            disabled={preview.length === 0 || creating}
            onClick={submitCreate}
          >
            {creating ? "建立中…" : `建立 ${preview.length} 個時段`}
          </button>
        )}
        {createError ? <p className="err">{createError}</p> : null}
        {createResult ? (
          <div className="result-box">
            {createResult.error ? (
              <p className="err">
                中途出錯，已中止：已成功建立 <b>{createResult.created.length}</b> 個時段、跳過{" "}
                <b>{createResult.skipped.length}</b> 個，不是全部失敗、也不是全部成功。
                <br />
                {createResult.error}
              </p>
            ) : (
              <p>
                建立 <b>{createResult.created.length}</b> 個時段，跳過{" "}
                <b>{createResult.skipped.length}</b> 個（該時間已有時段）。
              </p>
            )}
            {createResult.skipped.length > 0 ? (
              <p className="skip-list">跳過：{createResult.skipped.join("、")}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="admin-section">
        <h2 className="serif">已開時段</h2>
        {slotsError ? <p className="err">{slotsError}</p> : null}
        {futureSlots === null ? (
          <p className="hint">讀取中…</p>
        ) : futureSlots.length === 0 ? (
          <p className="hint">目前沒有未來的開放時段。</p>
        ) : (
          <div>
            {futureSlots.map((s) => (
              <div className="slot-row" key={s.id}>
                <div className="info">
                  <span className="name">{s.name}｜{s.type}</span>
                  {s.status === "保留中" ? <span className="warn">有客人正在洽談</span> : null}
                </div>
                <button
                  type="button"
                  className="close-btn"
                  disabled={closingId === s.id}
                  onClick={() => handleClose(s.id, s.status)}
                >
                  {closingId === s.id ? "關閉中…" : "關閉"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <PasswordSection adminKey={adminKey} onAdminKeyChange={onAdminKeyChange} />
    </div>
  );
}

// 更改密碼區塊：預設收合，展開後填舊密碼／新密碼／確認新密碼。
// 刻意不用外層共用的 apiFetch——apiFetch 收到任何 401 就會清掉本機密鑰、把人踢回登入畫面，
// 但這裡「舊密碼」欄位打錯本來就該回 401，那只是表單驗證錯誤，不該連帶把已登入的 session 登出。
// 所以這裡直接用原生 fetch，401 只當一般表單錯誤處理。
function PasswordSection({ adminKey, onAdminKeyChange }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetFields() {
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  function toggleOpen() {
    setOpen((prev) => !prev);
    setError("");
    setSuccess("");
    resetFields();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (next !== confirm) {
      setError("兩次輸入的新密碼不一致");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "密碼更新失敗，請再試一次");
      } else {
        onAdminKeyChange(next); // 立即同步本機密鑰，下一次請求就要用新密碼
        setSuccess("密碼已更新");
        resetFields();
        setOpen(false);
      }
    } catch (err) {
      setError("連線失敗，請再試一次");
    }
    setSubmitting(false);
  }

  return (
    <section className="admin-section">
      <h2 className="serif">更改密碼</h2>
      <p className="hint">密碼也可以直接在 Notion「系統設定」資料庫裡改。</p>

      {!open ? (
        <button type="button" className="cta ghost" onClick={toggleOpen}>
          展開更改密碼
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
          <div className="field">
            <label htmlFor="pw-current">舊密碼</label>
            <input
              type="password"
              id="pw-current"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="pw-next">新密碼</label>
            <input
              type="password"
              id="pw-next"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="pw-confirm">確認新密碼</label>
            <input
              type="password"
              id="pw-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error ? <p className="err">{error}</p> : null}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="cta" type="submit" disabled={submitting}>
              {submitting ? "更新中…" : "更新密碼"}
            </button>
            <button type="button" className="cta ghost" onClick={toggleOpen}>
              取消
            </button>
          </div>
        </form>
      )}
      {success ? <p className="hint">{success}</p> : null}
    </section>
  );
}
