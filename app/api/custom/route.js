import { createCustomBooking, uploadDataUrlImage } from "../../../lib/notion";

export async function POST(req) {
  try {
    const { name, story, style, ref, spot, partPhoto, refPhoto } = await req.json();
    if (!name?.trim() || !story?.trim() || !spot?.trim()) {
      return Response.json({ error: "缺少必填欄位" }, { status: 400 });
    }
    let refUrl = (ref || "").trim();
    if (refUrl && !/^https?:\/\//.test(refUrl)) refUrl = "";
    let partPhotoUploadId = null;
    let refPhotoUploadId = null;
    if (partPhoto) {
      try {
        partPhotoUploadId = await uploadDataUrlImage(partPhoto, "部位照片.jpg");
      } catch (e) {
        console.error("part photo upload failed", e); // 附圖失敗不擋預約
      }
    }
    if (refPhoto) {
      try {
        refPhotoUploadId = await uploadDataUrlImage(refPhoto, "風格參考圖.jpg");
      } catch (e) {
        console.error("reference photo upload failed", e); // 附圖失敗不擋預約
      }
    }
    await createCustomBooking({
      name: name.trim().slice(0, 40),
      story: story.trim().slice(0, 1000),
      style: (style || "").slice(0, 300),
      ref: refUrl || null,
      spot: spot.trim().slice(0, 100),
      partPhotoUploadId,
      refPhotoUploadId,
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("custom error", e);
    return Response.json({ error: "server" }, { status: 500 });
  }
}
