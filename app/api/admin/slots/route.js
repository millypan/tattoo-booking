import { getFutureSlots, createSlots, closeSlot, updateAdminSlot, getAdminPassword } from "../../../../lib/notion";

// 批次建立可能要逐筆呼叫 Notion API（見 lib/notion.js createSlots），
// 上限拉到 60 秒讓合法批次（≤60 筆，見下方 MAX_CREATE_SLOTS）有足夠時間跑完。
export const maxDuration = 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MAX_CREATE_SLOTS = 60;

// 所有方法都先驗證管理密鑰；密碼現在存在 Notion「系統設定」資料庫（getAdminPassword 內建
// ADMIN_SECRET fallback）。password 為 falsy（null／空字串）時一律視為未授權，
// 不可寫成單純 header === password 就放行（那樣 header 空字串、密碼也是 null 會誤判相等）。
async function isAuthed(request) {
  const password = await getAdminPassword();
  if (!password) return false;
  const header = request.headers.get("x-admin-key");
  if (!header) return false;
  return header === password;
}

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(request) {
  if (!(await isAuthed(request))) return unauthorized();
  try {
    const slots = await getFutureSlots();
    return Response.json(slots);
  } catch (e) {
    console.error("admin slots GET error", e);
    return Response.json({ error: "server" }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAuthed(request))) return unauthorized();
  try {
    const { slots, type } = await request.json();
    if (!Array.isArray(slots) || slots.length === 0) {
      return Response.json({ error: "缺少時段清單" }, { status: 400 });
    }
    if (slots.length > MAX_CREATE_SLOTS) {
      return Response.json({ error: "一次最多開 60 個，請分批" }, { status: 400 });
    }
    if (type !== "刺青" && type !== "諮詢") {
      return Response.json({ error: "類型錯誤" }, { status: 400 });
    }
    for (const s of slots) {
      if (!DATE_RE.test(s?.date) || !TIME_RE.test(s?.time)) {
        return Response.json({ error: "時段格式錯誤" }, { status: 400 });
      }
    }
    const result = await createSlots({ slots, type });
    return Response.json(result);
  } catch (e) {
    console.error("admin slots POST error", e);
    return Response.json({ error: "server" }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!(await isAuthed(request))) return unauthorized();
  try {
    const { id, action, date, time, type } = await request.json();
    if (!id) return Response.json({ error: "缺少 id" }, { status: 400 });
    if (action === "update") {
      if (!DATE_RE.test(date) || !TIME_RE.test(time) || !["刺青", "諮詢"].includes(type)) {
        return Response.json({ error: "時段格式錯誤" }, { status: 400 });
      }
      await updateAdminSlot({ id, date, time, type });
      return Response.json({ ok: true });
    }
    await closeSlot(id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("admin slots PATCH error", e);
    return Response.json({ error: e.message || "server" }, { status: 400 });
  }
}
