import { createHmac, timingSafeEqual } from "node:crypto";
import { syncBookingMinimalSchedules } from "../../../../lib/notion";

export const dynamic = "force-dynamic";

function validSignature(body, signature, verificationToken) {
  if (!signature || !verificationToken) return false;
  const expected = `sha256=${createHmac("sha256", verificationToken).update(body).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function POST(request) {
  const body = await request.text();
  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.verification_token) {
    console.log("NOTION_WEBHOOK_VERIFICATION_TOKEN", event.verification_token);
    return Response.json({ ok: true });
  }

  const verificationToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN;
  const signature = request.headers.get("x-notion-signature");
  if (!validSignature(body, signature, verificationToken)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["page.created", "page.properties_updated"].includes(event.type) || event.entity?.type !== "page") {
    return Response.json({ ok: true, ignored: true });
  }

  try {
    const result = await syncBookingMinimalSchedules(event.entity.id);
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error("Notion webhook sync failed", error);
    return Response.json({ error: "Sync failed" }, { status: 500 });
  }
}
