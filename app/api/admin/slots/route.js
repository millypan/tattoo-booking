import { getFutureSlots, createSlots, closeSlot } from "../../../../lib/notion";

// 批次建立可能要逐筆呼叫 Notion API（見 lib/notion.js createSlots），
// 上限拉到 60 秒讓合法批次（≤60 筆，見下方 MAX_CREATE_SLOTS）有足夠時間跑完。
export const maxDuration = 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MAX_CREATE_SLOTS = 60;

// 所有方法都先驗證管理密鑰；ADMIN_SECRET 未設定時一律視為未授權（不可放行）
function isAuthed(request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-key") === secret;
}

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(request) {
  if (!isAuthed(request)) return unauthorized();
  try {
    const slots = await getFutureSlots();
    return Response.json(slots);
  } catch (e) {
    console.error("admin slots GET error", e);
    return Response.json({ error: "server" }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isAuthed(request)) return unauthorized();
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
  if (!isAuthed(request)) return unauthorized();
  try {
    const { id } = await request.json();
    if (!id) return Response.json({ error: "缺少 id" }, { status: 400 });
    await closeSlot(id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("admin slots PATCH error", e);
    return Response.json({ error: "server" }, { status: 500 });
  }
}
