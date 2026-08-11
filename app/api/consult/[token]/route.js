import { reserveCustomConsultation } from "../../../../lib/notion";

export async function POST(req, { params }) {
  try {
    const { token } = await params;
    const { slotId } = await req.json();
    if (!/^[a-f0-9]{48}$/.test(token || "") || !/^[a-f0-9-]{32,36}$/i.test(slotId || "")) {
      return Response.json({ error: "資料格式不正確" }, { status: 400 });
    }
    const result = await reserveCustomConsultation({ token, slotId });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const known = {
      INVALID_LINK: [404, "這個連結無效或已失效"],
      ALREADY_SELECTED: [409, "你已經選過諮詢時段"],
      NOT_APPROVED: [403, "這份評估目前尚未開放選時段"],
      SLOT_UNAVAILABLE: [409, "這個時段剛剛已被選走，請改選其他時段"],
    };
    const [status, message] = known[error.message] || [500, "暫時無法保留時段，請稍後再試"];
    console.error("consult slot error", error);
    return Response.json({ error: message }, { status });
  }
}
