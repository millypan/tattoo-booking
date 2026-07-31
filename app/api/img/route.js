import { getWork } from "../../../lib/notion";

// 圖片代理：把 Notion 圖轉成同源資源，canvas 合成才不會被瀏覽器擋（tainted canvas）。
// 只代理作品資料庫裡的圖，不是開放代理。
export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const workId = params.get("work");
  const i = Math.max(0, Math.min(9, parseInt(params.get("i") || "0", 10) || 0));
  if (!workId || !/^[a-f0-9-]{32,36}$/.test(workId)) {
    return new Response("bad request", { status: 400 });
  }
  try {
    const work = await getWork(workId);
    const url = work.images?.[i] || work.image;
    if (!url) return new Response("no image", { status: 404 });
    const upstream = await fetch(url);
    if (!upstream.ok) return new Response("upstream error", { status: 502 });
    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    console.error("img proxy error", e);
    return new Response("server error", { status: 500 });
  }
}
