import {
  formatSlotLabel,
  formatDateOnlyLabel,
  formatDateWithTimeLabel,
  combineDateAndTimeStart,
  taipeiTodayStartISO,
} from "./slotFormat.mjs";
import { randomBytes } from "node:crypto";

const NOTION = "https://api.notion.com/v1";

// 這個網站現在交給米粒，資料庫全部是米粒自己的 Notion 帳號——絕對不能留任何寫死的資料庫 id
// 當 fallback（那樣會在米粒漏設環境變數時默默讀到士瑋的資料庫）。
// 這 7 個變數一律只從 process.env 讀，完全沒有寫死的預設值；缺少哪個由 requireEnv() 在
// 真正要打 Notion API 那一刻才檢查、丟出明確的中文錯誤。
export const WORKS_DB = process.env.WORKS_DB;
export const SLOTS_DB = process.env.SLOTS_DB;
export const BOOKINGS_DB = process.env.BOOKINGS_DB;
export const SERIES_DB = process.env.SERIES_DB;
export const CUSTOMERS_DB = process.env.CUSTOMERS_DB;
export const SETTINGS_DB = process.env.SETTINGS_DB;

// 統一的環境變數檢查：任何一個必要變數（NOTION_TOKEN／各資料庫 id）沒設定，
// 就在「第一次真的要用它打 Notion API」的當下丟出明確的中文錯誤，而不是在模組載入
// （import）當下就檢查——Next.js build 時模組本身會被載入做靜態分析，如果檢查寫在模組
// 頂層，某些邊界情況下可能讓 build 直接掛掉；延後到呼叫路徑上才檢查就不會有這個風險。
// 每次都直接讀 process.env（不吃預先快取的模組頂層常數），確保測試時改 process.env
// 能立刻反映、也確保任何呼叫路徑第一次用到某個變數時一定會被驗到。
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `環境變數 ${name} 未設定——請到 Vercel 專案 Settings → Environment Variables 補上，對照 .env.example`
    );
  }
  return value;
}

// 首頁載入時一次檢查全部必要變數：像 CUSTOMERS_DB 這種只在深處呼叫路徑（且被 try/catch
// 吞錯不擋預約）用到的變數，若漏設會「預約照常、客戶卡靜默不建」，搬家後很難發現。
// 在 getWorks()（每次進站必經）先全量檢查，漏設任何一個都會讓首頁直接報出是哪個變數，
// 搬家驗收第一項就會抓到。
const REQUIRED_ENV = [
  "NOTION_TOKEN", "WORKS_DB", "SLOTS_DB", "BOOKINGS_DB",
  "SERIES_DB", "CUSTOMERS_DB", "SETTINGS_DB",
];
function requireAllEnv() {
  for (const name of REQUIRED_ENV) requireEnv(name);
}

function getHeaders() {
  return {
    Authorization: `Bearer ${requireEnv("NOTION_TOKEN")}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
}

async function notion(path, body, method = "POST") {
  const res = await fetch(`${NOTION}${path}`, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Notion ${res.status}`);
  return json;
}

// Notion database query 一次最多回 100 筆（has_more/next_cursor 分頁）。
// 這支 helper 用 do/while 迴圈把 start_cursor 一路帶下去，直到 has_more 為 false，
// 回傳完整、不受 100 筆上限截斷的 results 陣列。
// 注意：body 裡若帶 start_cursor:undefined，JSON.stringify 會直接省略該欄位，
// 等同第一次查詢不帶 start_cursor，行為與原本單次查詢一致。
async function notionQueryAll(path, body) {
  let results = [];
  let cursor;
  do {
    const res = await notion(path, { ...body, start_cursor: cursor }, "POST");
    results = results.concat(res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

const text = (prop) => (prop?.rich_text || prop?.title || []).map((t) => t.plain_text).join("");
const consultationToken = () => randomBytes(24).toString("hex");

function slotTimeOption(page) {
  return page.properties?.["時段"]?.select?.name || "";
}

function slotDisplayLabel(page) {
  const existing = text(page.properties?.["時段名稱"]);
  if (existing) return existing;
  const start = page.properties?.["日期時間"]?.date?.start;
  if (!start) return "";
  return start.includes("T")
    ? formatSlotLabel(start)
    : formatDateWithTimeLabel(start, slotTimeOption(page));
}

function slotStartISO(page) {
  const start = page.properties?.["日期時間"]?.date?.start;
  if (!start) return null;
  return start.includes("T") ? start : combineDateAndTimeStart(start, slotTimeOption(page));
}

// 網站正式網址的解析順序：
// 1. NEXT_PUBLIC_SITE_URL（手動設定，最優先）
// 2. Vercel 系統自動提供的 VERCEL_PROJECT_PRODUCTION_URL（只是網域，不含協定，要自己補 https://）
// 3. 兩者都沒有 → null
// 每次呼叫都重新讀 process.env（不快取），方便測試、也不會有「模組載入當下讀到舊值」的疑慮。
export function resolveSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return null;
}

// 新列的「網站連結」欄由網站自動回填，米粒不用手動貼；失敗不影響網站顯示。
// SITE_URL 解析不出來（null）就整段跳過，絕對不能把 null/undefined/不完整字串拼進網址寫回 Notion。
function backfillLinks(pages, pathPrefix) {
  const siteUrl = resolveSiteUrl();
  if (!siteUrl) return;
  for (const page of pages) {
    if (!page.properties?.["網站連結"]?.url) {
      notion(
        `/pages/${page.id}`,
        { properties: { "網站連結": { url: `${siteUrl}/${pathPrefix}/${page.id}` } } },
        "PATCH"
      ).catch(() => {});
    }
  }
}

function mapWork(page) {
  const p = page.properties;
  const files = p["圖檔"]?.files || [];
  const images = files.map((f) => f?.file?.url || f?.external?.url).filter(Boolean);
  return {
    id: page.id,
    name: text(p["作品名稱"]),
    image: images[0] || null,
    images,
    imageCount: images.length,
    styles: (p["風格標籤"]?.multi_select || []).map((s) => s.name),
    size: text(p["尺寸"]),
    price: p["價格"]?.number ?? null,
    status: p["狀態"]?.select?.name || "可認領",
    description: text(p["備註"]),
    spot: text(p["建議部位"]),
    seriesId: p["所屬系列"]?.relation?.[0]?.id || null,
  };
}

function mapSeries(page) {
  const p = page.properties;
  const file = p["封面圖"]?.files?.[0];
  return {
    id: page.id,
    name: text(p["系列名稱"]),
    cover: file?.file?.url || file?.external?.url || null,
    desc: text(p["說明"]),
  };
}

export async function getSeriesList() {
  const r = await notion(`/databases/${requireEnv("SERIES_DB")}/query`, {
    sorts: [{ timestamp: "created_time", direction: "descending" }],
  });
  backfillLinks(r.results, "series");
  return r.results.map(mapSeries);
}

export async function getSeries(id) {
  const page = await notion(`/pages/${id}`, null, "GET");
  return mapSeries(page);
}

export async function getWorks() {
  requireAllEnv();
  const r = await notion(`/databases/${requireEnv("WORKS_DB")}/query`, {
    filter: {
      or: [
        { property: "狀態", select: { equals: "可認領" } },
        { property: "狀態", select: { equals: "洽談中" } },
        { property: "狀態", select: { equals: "已認領" } },
      ],
    },
    sorts: [{ timestamp: "created_time", direction: "descending" }],
  });
  backfillLinks(r.results, "work");
  return r.results.map(mapWork);
}

export async function getWork(id) {
  const page = await notion(`/pages/${id}`, null, "GET");
  return mapWork(page);
}

export async function getOpenSlots(type) {
  const results = await notionQueryAll(`/databases/${requireEnv("SLOTS_DB")}/query`, {
    filter: {
      and: [
        { property: "狀態", select: { equals: "開放" } },
        { property: "類型", select: { equals: type } },
        { property: "日期時間", date: { on_or_after: taipeiTodayStartISO() } },
      ],
    },
    sorts: [{ property: "日期時間", direction: "ascending" }],
  });
  return results.flatMap((page) => {
    const existingLabel = text(page.properties["時段名稱"]);
    const derivedLabel = slotDisplayLabel(page);
    // 日期或時段尚未填完整時先不顯示，避免客人看到無法辨識的空白選項。
    if (!derivedLabel) return [];
    if (existingLabel) return [{ id: page.id, label: existingLabel }];
    // 名稱留白時，以「日期時間＋時段」自動產生並回填，米粒不必重複 key 名稱。
    notion(
      `/pages/${page.id}`,
      { properties: { "時段名稱": { title: [{ text: { content: derivedLabel } }] } } },
      "PATCH"
    ).catch(() => {});
    return [{ id: page.id, label: derivedLabel }];
  });
}

function mapConsultationBooking(page) {
  const p = page.properties;
  const selectedSlot = p["預約時段"]?.relation?.[0]?.id || null;
  return {
    id: page.id,
    name: text(p["訂單名稱"]),
    assessment: p["評估結果"]?.select?.name || null,
    status: p["狀態"]?.select?.name || null,
    selectedSlot,
  };
}

// 專屬連結只用一組不可猜測的隨機權杖查詢，不把 Notion 頁面 id 或客人的提案內容放進網址。
export async function getCustomConsultation(token) {
  if (!/^[a-f0-9]{48}$/.test(token || "")) return null;
  const results = await notion(`/databases/${requireEnv("BOOKINGS_DB")}/query`, {
    filter: {
      and: [
        { property: "選時段權杖", rich_text: { equals: token } },
        { property: "類型", select: { equals: "客製圖" } },
      ],
    },
    page_size: 1,
  });
  return results.results[0] ? mapConsultationBooking(results.results[0]) : null;
}

export async function getConsultationSelectionPage(token) {
  const booking = await getCustomConsultation(token);
  if (!booking) return { state: "invalid", booking: null, slots: [] };
  if (booking.selectedSlot) {
    const slotPage = await notion(`/pages/${booking.selectedSlot}`, null, "GET");
    return {
      state: "selected",
      booking,
      slots: [],
      selectedLabel: slotDisplayLabel(slotPage) || "已選擇諮詢時段",
    };
  }
  if (!["確定承接", "可先諮詢評估"].includes(booking.assessment)) {
    return { state: "not-open", booking, slots: [] };
  }
  return { state: "open", booking, slots: await getOpenSlots("諮詢") };
}

export async function reserveCustomConsultation({ token, slotId }) {
  const booking = await getCustomConsultation(token);
  if (!booking) throw new Error("INVALID_LINK");
  if (booking.selectedSlot) throw new Error("ALREADY_SELECTED");
  if (!["確定承接", "可先諮詢評估"].includes(booking.assessment)) throw new Error("NOT_APPROVED");

  const slot = await notion(`/pages/${slotId}`, null, "GET");
  const p = slot.properties;
  const start = slotStartISO(slot);
  const isFuture = start && new Date(start).getTime() > Date.now();
  if (p["類型"]?.select?.name !== "諮詢" || p["狀態"]?.select?.name !== "開放" || !isFuture) {
    throw new Error("SLOT_UNAVAILABLE");
  }

  // Notion 沒有跨頁 transaction；先鎖時段，訂單更新失敗時盡力把時段還原。
  await notion(`/pages/${slotId}`, {
    properties: {
      "狀態": { select: { name: "保留中" } },
      "關聯預約": { relation: [{ id: booking.id }] },
    },
  }, "PATCH");
  try {
    await notion(`/pages/${booking.id}`, {
      properties: {
        "預約時段": { relation: [{ id: slotId }] },
        "狀態": { select: { name: "已選時段－待押金" } },
      },
    }, "PATCH");
  } catch (error) {
    await notion(`/pages/${slotId}`, {
      properties: { "狀態": { select: { name: "開放" } }, "關聯預約": { relation: [] } },
    }, "PATCH").catch(() => {});
    throw error;
  }
  return { label: slotDisplayLabel(slot) || formatSlotLabel(start) };
}

// --- 以下為 /admin 批次開時段頁使用 ---

// 查未來（含今天，台北時區判斷）且狀態為開放／保留中的時段，供管理頁列出
export async function getFutureSlots() {
  const results = await notionQueryAll(`/databases/${requireEnv("SLOTS_DB")}/query`, {
    filter: {
      and: [
        { property: "日期時間", date: { on_or_after: taipeiTodayStartISO() } },
        {
          or: [
            { property: "狀態", select: { equals: "開放" } },
            { property: "狀態", select: { equals: "保留中" } },
          ],
        },
      ],
    },
    sorts: [{ property: "日期時間", direction: "ascending" }],
  });
  return results.map((page) => {
    const p = page.properties;
    const start = p["日期時間"]?.date?.start || null;
    let name = slotDisplayLabel(page);
    if (!name && start) {
      // 「時段名稱」空白時，用「日期時間」推導一個顯示用標籤（只用來顯示，絕對不寫回 Notion，
      // 跟 getOpenSlots 的不回填原則一致）：有具體時間就照常格式化，
      // date-only（沒有 "T"）就顯示「未指定時間」，不捏造時間。
      name = start.includes("T") ? formatSlotLabel(start) : formatDateOnlyLabel(start);
    }
    return {
      id: page.id,
      name,
      start,
      type: p["類型"]?.select?.name || null,
      status: p["狀態"]?.select?.name || null,
    };
  });
}

// 批次建立時段：{date:"2026-08-03", time:"13:00"} 陣列 + 類型；
// 同一個日期時間（不論類型）若已存在未來時段（排除「關閉」）就跳過該筆
export async function createSlots({ slots, type }) {
  const existingPages = await notionQueryAll(`/databases/${requireEnv("SLOTS_DB")}/query`, {
    filter: {
      and: [
        { property: "日期時間", date: { on_or_after: taipeiTodayStartISO() } },
        { property: "狀態", select: { does_not_equal: "關閉" } },
      ],
    },
  });
  // 去重集合只用「有具體時間」（start 字串含 "T"）的既有列建立時間戳。
  // Notion 的 date 屬性可能只填日期沒填時間（date-only，例如米粒手動開的列），
  // 這種 start（如 "2026-08-07"）若拿去 new Date() 會被解析成 UTC 午夜，
  // 混進時間戳集合可能對某個 +08:00 的具體時段（尤其是換算後恰好落在 08:00 附近的）
  // 產生誤判（誤放行本該跳過的重複、或誤跳過本不重複的時段）。
  // 這裡直接把 date-only 列排除在時間戳去重集合之外：它們就不會參與「是否已存在」的判斷，
  // 保證不會有時間戳誤判；代價是如果米粒手動開了一筆 date-only 的當天佔位列，
  // 批次工具仍可能在同一天建立另一筆有具體時間的時段（這是業務邏輯上的邊界情況，
  // 不是這裡要修的「比較邏輯錯誤」，先不處理，留給米粒人工判斷／關閉多餘的列）。
  const existingTimes = new Set(
    existingPages
      .map((p) => p.properties["日期時間"]?.date?.start)
      .filter((s) => typeof s === "string" && s.includes("T"))
      .map((s) => new Date(s).getTime())
  );
  const created = [];
  const skipped = [];
  for (let i = 0; i < slots.length; i++) {
    const { date, time } = slots[i];
    const iso = `${date}T${time}:00+08:00`;
    const ts = new Date(iso).getTime();
    const label = formatSlotLabel(iso);
    if (existingTimes.has(ts)) {
      skipped.push(label);
      continue;
    }
    try {
      await notion(`/pages`, {
        parent: { database_id: requireEnv("SLOTS_DB") },
        properties: {
          "時段名稱": { title: [{ text: { content: label } }] },
          "日期時間": { date: { start: iso } },
          "類型": { select: { name: type } },
          "狀態": { select: { name: "開放" } },
        },
      });
    } catch (e) {
      // 中途失敗：中止迴圈，但把目前為止已成功建立／跳過的結果照樣回傳給前端，
      // 不讓整個函式拋出例外把之前已建立的清單「弄丟」（呼叫端不會看到任何結果）。
      return {
        created,
        skipped,
        error: `第 ${i + 1} 筆建立失敗：${e.message || "未知錯誤"}，已中止，前面已成功的時段仍然有效`,
      };
    }
    existingTimes.add(ts); // 防止同一批次裡自己重複的日期時間又建一次
    created.push(label);
  }
  return { created, skipped };
}

// 把某筆時段標記為「關閉」（select 選項不存在時 Notion API 會自動建立，預期行為）
export async function closeSlot(id) {
  return notion(`/pages/${id}`, { properties: { "狀態": { select: { name: "關閉" } } } }, "PATCH");
}

// --- 以下為「系統設定」資料庫：後台密碼（讓米粒可以自己在 Notion 改密碼） ---

async function findSettingsRow(itemName) {
  const r = await notion(`/databases/${requireEnv("SETTINGS_DB")}/query`, {
    filter: { property: "項目", title: { equals: itemName } },
    page_size: 2,
  });
  return r.results[0] || null;
}

// 查「系統設定」資料庫裡「項目」＝「後台密碼」那一列的「值」。
// 安全防呆：查不到那一列、「值」是空字串、或整個查詢過程丟例外（Notion 掛掉、資料庫 id 打錯等），
// 一律 catch 起來退回 process.env.ADMIN_SECRET；連 ADMIN_SECRET 也沒設定就回傳 null。
// 這樣米粒不小心刪掉那一列，也不會把自己（跟米粒）鎖在後台外面。
export async function getAdminPassword() {
  try {
    const row = await findSettingsRow("後台密碼");
    const value = row ? text(row.properties["值"]).trim() : "";
    if (value) return value;
  } catch (e) {
    console.error("getAdminPassword: Notion 查詢失敗，退回 ADMIN_SECRET", e);
  }
  return (process.env.ADMIN_SECRET || "").trim() || null;
}

// 把「後台密碼」那一列的「值」更新成 next；理論上那一列應該一直存在，
// 但防呆一下：如果真的找不到（例如被誤刪），就新建一列。
export async function setAdminPassword(next) {
  const row = await findSettingsRow("後台密碼");
  if (row) {
    await notion(
      `/pages/${row.id}`,
      { properties: { "值": { rich_text: [{ text: { content: next } }] } } },
      "PATCH"
    );
  } else {
    await notion(`/pages`, {
      parent: { database_id: requireEnv("SETTINGS_DB") },
      properties: {
        "項目": { title: [{ text: { content: "後台密碼" } }] },
        "值": { rich_text: [{ text: { content: next } }] },
      },
    });
  }
}

// 找同名客戶：恰好一位→回傳 id；沒有→建新客戶卡（標籤：新客）；多位同名→回 null 交米粒人工判斷
async function findOrCreateCustomer(name) {
  try {
    const r = await notion(`/databases/${requireEnv("CUSTOMERS_DB")}/query`, {
      filter: { property: "稱呼", title: { equals: name } },
      page_size: 2,
    });
    if (r.results.length === 1) return r.results[0].id;
    if (r.results.length > 1) return null;
    const created = await notion(`/pages`, {
      parent: { database_id: requireEnv("CUSTOMERS_DB") },
      properties: {
        "稱呼": { title: [{ text: { content: name } }] },
        "標籤": { multi_select: [{ name: "新客" }] },
      },
    });
    return created.id;
  } catch (e) {
    console.error("findOrCreateCustomer failed", e); // 客戶連結失敗不擋預約
    return null;
  }
}

// 把 dataURL 圖片上傳到 Notion（File Upload API 兩步），回傳 file_upload id
export async function uploadDataUrlImage(dataUrl, filename) {
  const m = /^data:image\/(jpeg|png);base64,(.+)$/.exec(dataUrl || "");
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 4_000_000) return null; // 防呆：太大就不附
  const created = await notion(`/file_uploads`, { filename, content_type: `image/${m[1]}` });
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: `image/${m[1]}` }), filename);
  const h = getHeaders();
  const res = await fetch(`${NOTION}/file_uploads/${created.id}/send`, {
    method: "POST",
    headers: { Authorization: h.Authorization, "Notion-Version": h["Notion-Version"] },
    body: form,
  });
  const sent = await res.json();
  return sent.status === "uploaded" ? created.id : null;
}

export async function createClaimBooking({ name, spot, workId, slotId, sizeChoice, tryOnUploadId }) {
  const moneyNote = `尺寸：${sizeChoice || "最小建議尺寸"}`;
  const customerId = await findOrCreateCustomer(name);
  const properties = {
    "訂單名稱": { title: [{ text: { content: name } }] },
    "類型": { select: { name: "認領圖" } },
    "想刺部位": { rich_text: [{ text: { content: spot } }] },
    "金額備註": { rich_text: [{ text: { content: moneyNote } }] },
    "關聯作品": { relation: [{ id: workId }] },
    "狀態": { select: { name: "待確認" } },
  };
  if (customerId) properties["關聯客戶"] = { relation: [{ id: customerId }] };
  if (slotId) properties["預約時段"] = { relation: [{ id: slotId }] };
  if (tryOnUploadId) {
    properties["試貼圖"] = {
      files: [{ type: "file_upload", file_upload: { id: tryOnUploadId }, name: "試貼圖.jpg" }],
    };
  }
  const booking = await notion(`/pages`, {
    parent: { database_id: requireEnv("BOOKINGS_DB") },
    properties,
  });
  if (slotId) {
    await notion(`/pages/${slotId}`, { properties: { "狀態": { select: { name: "保留中" } } } }, "PATCH");
  }
  // 認領送單後即轉洽談中（舊版 variant 判斷在 mapWork 從未設值下恆為真，等價移除）
  await notion(`/pages/${workId}`, { properties: { "狀態": { select: { name: "洽談中" } } } }, "PATCH");
  return booking;
}

export async function createCustomBooking({ name, projectType, story, style, ref, spot, partPhotoUploadId, refPhotoUploadId }) {
  const customerId = await findOrCreateCustomer(name);
  const token = consultationToken();
  const siteUrl = resolveSiteUrl();
  const props = {
    "訂單名稱": { title: [{ text: { content: name } }] },
    "類型": { select: { name: "客製圖" } },
    "主題故事": { rich_text: [{ text: { content: `案件類型：${projectType}\n${story}` } }] },
    "想刺部位": { rich_text: [{ text: { content: `${spot}｜風格想法：${style || "尚未確定"}` } }] },
    "狀態": { select: { name: "待確認" } },
    "選時段權杖": { rich_text: [{ text: { content: token } }] },
  };
  if (siteUrl) props["選時段連結"] = { url: `${siteUrl}/consult/${token}` };
  if (customerId) props["關聯客戶"] = { relation: [{ id: customerId }] };
  if (ref) props["參考圖連結"] = { url: ref };
  const attachedPhotos = [];
  if (partPhotoUploadId) {
    attachedPhotos.push({ type: "file_upload", file_upload: { id: partPhotoUploadId }, name: "部位照片.jpg" });
  }
  if (refPhotoUploadId) {
    attachedPhotos.push({ type: "file_upload", file_upload: { id: refPhotoUploadId }, name: "風格參考圖.jpg" });
  }
  if (attachedPhotos.length) {
    props["部位照片"] = {
      files: attachedPhotos,
    };
  }
  return notion(`/pages`, { parent: { database_id: requireEnv("BOOKINGS_DB") }, properties: props });
}
