import { createClaimBooking, getWork, uploadDataUrlImage } from "../../../lib/notion";
import { revalidatePath } from "next/cache";

export async function POST(req) {
  try {
    const { name, spot, workId, slotId, sizeChoice, tryOn } = await req.json();
    if (!name?.trim() || !spot?.trim() || !workId) {
      return Response.json({ error: "缺少必填欄位" }, { status: 400 });
    }
    const work = await getWork(workId);
    if (work.status !== "可認領") {
      return Response.json({ error: "這張圖目前無法認領" }, { status: 409 });
    }
    let tryOnUploadId = null;
    if (tryOn) {
      try {
        tryOnUploadId = await uploadDataUrlImage(tryOn, "試貼圖.jpg");
      } catch (e) {
        console.error("tryOn upload failed", e); // 附圖失敗不擋預約
      }
    }
    await createClaimBooking({
      name: name.trim().slice(0, 40),
      spot: spot.trim().slice(0, 100),
      sizeChoice: String(sizeChoice || "最小建議尺寸").slice(0, 30),
      tryOnUploadId,
      workId,
      slotId: slotId || undefined,
    });
    revalidatePath("/");
    revalidatePath(`/work/${workId}`);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("claim error", e);
    return Response.json({ error: "server" }, { status: 500 });
  }
}
