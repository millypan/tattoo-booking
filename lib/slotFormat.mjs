// 共用：時段名稱格式化＋台北時區日期運算
// 命名為 .mjs 是刻意的——這支檔案需要能被純 node 腳本直接 import 驗證（見驗收要求），
// 若用 .js 會被 Node 依 package.json 沒有 "type":"module" 判定成 CommonJS 而解析失敗。
// Next.js 的 webpack 對 .mjs 副檔名一樣原生支援，不影響網站建置。

const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"]; // index 0=日...6=六
const WEEKDAY_MAP_EN = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// 用 Intl 明確指定 Asia/Taipei 時區解析出年月日時分與星期幾，
// 完全不依賴伺服器（或瀏覽器）本地時區設定，避免 Vercel 的 UTC 環境算錯日期。
function taipeiParts(input) {
  const date = input instanceof Date ? input : new Date(input);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  let hour = Number(map.hour);
  if (hour === 24) hour = 0; // Intl hour12:false 偶爾會用 24 代表午夜 0 點
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    weekday: WEEKDAY_MAP_EN[map.weekday],
  };
}

// 台北時區「8/3（一）13:00」格式；input 可為 Date 物件或任何 Date 建構子接受的字串
export function formatSlotLabel(input) {
  const { month, day, hour, minute, weekday } = taipeiParts(input);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${month}/${day}（${WEEKDAY_ZH[weekday]}）${hh}:${mm}`;
}

// date-only（無具體時間）的顯示標籤：「8/7（五）（未指定時間）」
// 只給「顯示」用，絕對不能拿這個結果寫回 Notion 的「時段名稱」欄——
// 因為我們刻意不捏造一個不存在的時間，只標出日期＋星期幾。
// dateStr 必須是 YYYY-MM-DD（Notion date-only 屬性回傳的格式）。
export function formatDateOnlyLabel(dateStr) {
  const [, mm, dd] = dateStr.match(/^\d{4}-(\d{2})-(\d{2})/) || [];
  const month = Number(mm);
  const day = Number(dd);
  const weekday = weekdayOfDateString(dateStr);
  return `${month}/${day}（${WEEKDAY_ZH[weekday]}）（未指定時間）`;
}

// Notion 手動建時段時，米粒會把日期與時段分開選；將兩者合成網站顯示名稱。
export function formatDateWithTimeLabel(dateStr, timeLabel) {
  const [, mm, dd] = String(dateStr || "").match(/^\d{4}-(\d{2})-(\d{2})/) || [];
  if (!mm || !dd || !timeLabel) return "";
  const weekday = weekdayOfDateString(dateStr);
  return `${Number(mm)}/${Number(dd)}（${WEEKDAY_ZH[weekday]}）${timeLabel}`;
}

// 將 date-only 與「10:00-11:00」之類的選單值合成可比較的台北時區時間。
export function combineDateAndTimeStart(dateStr, timeLabel) {
  const match = String(timeLabel || "").match(/^(\d{1,2}):(\d{2})/);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || "")) || !match) return null;
  const hour = String(Number(match[1])).padStart(2, "0");
  return `${dateStr}T${hour}:${match[2]}:00+08:00`;
}

// 依台北時區回傳「今天」日期字串 YYYY-MM-DD
export function taipeiTodayDateString(input = new Date()) {
  const { year, month, day } = taipeiParts(input);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// 依台北時區回傳「今天 00:00」的 ISO 字串（含 +08:00 偏移），拿來當 Notion 日期篩選的下界
export function taipeiTodayStartISO(input = new Date()) {
  return `${taipeiTodayDateString(input)}T00:00:00+08:00`;
}

// 公開網站不接受當日預約：以台北時間「明天 00:00」作為最早可選時間。
// 當日臨時安排仍可由米粒透過 LINE／Notion 人工處理。
export function taipeiTomorrowStartISO(input = new Date()) {
  const tomorrow = addDaysToDateString(taipeiTodayDateString(input), 1);
  return `${tomorrow}T00:00:00+08:00`;
}

export function isTomorrowOrLaterInTaipei(input, now = new Date()) {
  const start = new Date(input).getTime();
  const cutoff = new Date(taipeiTomorrowStartISO(now)).getTime();
  return Number.isFinite(start) && start >= cutoff;
}

// 給 YYYY-MM-DD 字串，回傳台北時區的星期幾（0=日...6=六）
// 固定套用中午 12:00 + 08:00 偏移當基準，避免任何午夜邊界的解析誤差
export function weekdayOfDateString(dateStr) {
  const { weekday } = taipeiParts(`${dateStr}T12:00:00+08:00`);
  return weekday;
}

// 純日曆天數加法（YYYY-MM-DD → YYYY-MM-DD），用 UTC 運算避免任何時區/夏令時干擾
// 台灣沒有夏令時，日曆天數加法本身與時區無關，只要輸入輸出都是單純的年月日字串即可。
export function addDaysToDateString(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export { WEEKDAY_ZH };
