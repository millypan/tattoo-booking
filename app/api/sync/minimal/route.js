import { syncMissingMinimalSchedules, syncTattooTimes } from "../../../../lib/notion";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const secret = process.env.SYNC_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const minimalCreated = await syncMissingMinimalSchedules();
    const tattooTimes = await syncTattooTimes();
    return Response.json({ ok: true, minimalCreated, tattooTimes });
  } catch (error) {
    console.error("minimal schedule sync failed", error);
    return Response.json({ error: "Sync failed" }, { status: 500 });
  }
}
