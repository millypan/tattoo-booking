const NOTION = "https://api.notion.com/v1";
const HEADERS = {
  Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

export const WORKS_DB = process.env.WORKS_DB;
export const SLOTS_DB = process.env.SLOTS_DB;
export const BOOKINGS_DB = process.env.BOOKINGS_DB;
export const SERIES_DB = process.env.SERIES_DB || "a4dc630f-c070-40f9-9ef2-0d3a00199135";
export const CUSTOMERS_DB = process.env.CUSTOMERS_DB || "569917fa-f817-4a24-bcb0-0adf3acdc754";

async function notion(path, body, method = "POST") {
  const res = await fetch(`${NOTION}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Notion ${res.status}`);
  return json;
}

const text = (prop) => (prop?.rich_text || prop?.title || []).map((t) => t.plain_text).join("");

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tattoo-booking-omega.vercel.app";

// 新列的「網站連結」欄由網站自動回填，米粒不用手動貼；失敗不影響網站顯示
function backfillLinks(pages, pathPrefix) {
  for (const page of pages) {
    if (!page.properties?.["網站連結"]?.url) {
      notion(
        `/pages/${page.id}`,
        { properties: { "網站連結": { url: `${SITE_URL}/${pathPrefix}/${page.id}` } } },
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
  const r = await notion(`/databases/${SERIES_DB}/query`, {
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
  const r = await notion(`/databases/${WORKS_DB}/query`, {
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
  const r = await notion(`/databases/${SLOTS_DB}/query`, {
    filter: {
      and: [
        { property: "狀態", select: { equals: "開放" } },
        { property: "類型", select: { equals: type } },
      ],
    },
    sorts: [{ property: "日期時間", direction: "ascending" }],
  });
  return r.results.map((page) => ({
    id: page.id,
    label: text(page.properties["時段名稱"]),
  }));
}

// 找同名客戶：恰好一位→回傳 id；沒有→建新客戶卡（標籤：新客）；多位同名→回 null 交米粒人工判斷
async function findOrCreateCustomer(name) {
  try {
    const r = await notion(`/databases/${CUSTOMERS_DB}/query`, {
      filter: { property: "稱呼", title: { equals: name } },
      page_size: 2,
    });
    if (r.results.length === 1) return r.results[0].id;
    if (r.results.length > 1) return null;
    const created = await notion(`/pages`, {
      parent: { database_id: CUSTOMERS_DB },
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
  const res = await fetch(`${NOTION}/file_uploads/${created.id}/send`, {
    method: "POST",
    headers: { Authorization: HEADERS.Authorization, "Notion-Version": HEADERS["Notion-Version"] },
    body: form,
  });
  const sent = await res.json();
  return sent.status === "uploaded" ? created.id : null;
}

export async function createClaimBooking({ name, spot, workId, slotId, sizeChoice, tryOnUploadId }) {
  const moneyNote = `尺寸：${sizeChoice || "最小建議尺寸"}`;
  const customerId = await findOrCreateCustomer(name);
  const properties = {
    "稱呼": { title: [{ text: { content: name } }] },
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
    parent: { database_id: BOOKINGS_DB },
    properties,
  });
  if (slotId) {
    await notion(`/pages/${slotId}`, { properties: { "狀態": { select: { name: "保留中" } } } }, "PATCH");
  }
  // 認領送單後即轉洽談中（舊版 variant 判斷在 mapWork 從未設值下恆為真，等價移除）
  await notion(`/pages/${workId}`, { properties: { "狀態": { select: { name: "洽談中" } } } }, "PATCH");
  return booking;
}

export async function createCustomBooking({ name, story, style, ref, spot, partPhotoUploadId }) {
  const customerId = await findOrCreateCustomer(name);
  const props = {
    "稱呼": { title: [{ text: { content: name } }] },
    "類型": { select: { name: "客製圖" } },
    "主題故事": { rich_text: [{ text: { content: story } }] },
    "想刺部位": { rich_text: [{ text: { content: `${spot}｜偏好風格：${style}` } }] },
    "狀態": { select: { name: "待確認" } },
  };
  if (customerId) props["關聯客戶"] = { relation: [{ id: customerId }] };
  if (ref) props["參考圖連結"] = { url: ref };
  if (partPhotoUploadId) {
    props["部位照片"] = {
      files: [{ type: "file_upload", file_upload: { id: partPhotoUploadId }, name: "部位照片.jpg" }],
    };
  }
  return notion(`/pages`, { parent: { database_id: BOOKINGS_DB }, properties: props });
}
