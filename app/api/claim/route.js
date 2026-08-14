import { createClaimBooking, getWork, uploadDataUrlImage } from "../../../lib/notion";
import { revalidatePath } from "next/cache";

export async function POST(req) {
  try {
    const { name, phone, spot, workId, slotId, sizeChoice, tryOn, applicationType, coverPhoto } = await req.json();
    const allowedApplicationTypes = ["刺在新的位置", "覆蓋原有刺青或疤痕", "正常新刺", "蓋在原有刺青上"];
    const isCoverApplication = ["覆蓋原有刺青或疤痕", "蓋在原有刺青上"].includes(applicationType);
    const cleanPhone = String(phone || "").replace(/[^0-9+]/g, "").slice(0, 20);
    if (!name?.trim() || !/^\+?\d{8,15}$/.test(cleanPhone) || !spot?.trim() || !workId || !allowedApplicationTypes.includes(applicationType)) {
      return Response.json({ error: "缺少必填欄位" }, { status: 400 });
    }
    if (isCoverApplication && !coverPhoto) {
      return Response.json({ error: "改蓋案件需要舊刺青照片" }, { status: 400 });
    }
    const work = await getWork(workId);
    if (work.status !== "可認領") {
      return Response.json({ error: "這張圖目前無法認領" }, { status: 409 });
    }
    let coverPhotoUploadId = null;
    if (coverPhoto) {
      try {
        coverPhotoUploadId = await uploadDataUrlImage(coverPhoto, "原有刺青照片.jpg");
      } catch (e) {
        console.error("cover photo upload failed", e);
      }
    }
    let tryOnUploadId = null;
    if (tryOn) {
      try {
        tryOnUploadId = await uploadDataUrlImage(tryOn, "試貼圖.jpg");
      } catch (e) {
        console.error("tryOn upload failed", e); // 附圖失敗不擋預約
      }
    }
    const { claimCode } = await createClaimBooking({
      name: name.trim().slice(0, 40),
      phone: cleanPhone,
      spot: spot.trim().slice(0, 100),
      sizeChoice: String(sizeChoice || "最小建議尺寸").slice(0, 30),
      tryOnUploadId,
      coverPhotoUploadId,
      applicationType,
      workId,
      slotId: !isCoverApplication ? (slotId || undefined) : undefined,
    });
    revalidatePath("/");
    revalidatePath(`/work/${workId}`);
    return Response.json({ ok: true, claimCode });
  } catch (e) {
    console.error("claim error", e);
    return Response.json({ error: "server" }, { status: 500 });
  }
}
