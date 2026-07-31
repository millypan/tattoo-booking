import { getAdminPassword, setAdminPassword } from "../../../../lib/notion";

const MIN_LEN = 6;
const MAX_LEN = 50;
// JS 正規表示式的 \s 涵蓋 Unicode Zs 類別，包含全形空白 U+3000，不用另外處理。
const WHITESPACE_RE = /\s/;

function unauthorized() {
  return Response.json({ error: "舊密碼不正確" }, { status: 401 });
}

// 驗證邏輯說明（對應規格裡「header 跟 body.current 要不要都驗」的模糊點）：
// 這裡兩者都驗，理由如下——
// 1. x-admin-key header 驗證的是「這個請求真的來自已登入的管理者」（跟 slots API 同一套邏輯），
//    這是安全性的主要防線：沒有它，任何人都能呼叫這支 API 亂改密碼。
// 2. body.current 額外驗證的意義不是安全性（header 已經證明身份），而是 UX 上避免使用者
//    在「舊密碼」欄位打錯字卻仍然被允許改密碼——多一層「你真的知道現在的密碼是什麼」的確認，
//    行為上更接近一般「改密碼」表單的預期（打錯舊密碼要擋下來，不能因為瀏覽器已登入就直接放行）。
// 兩者都用同一個 currentPassword 來源比對，不會互相矛盾，也不會降低安全性。
export async function POST(request) {
  try {
    const currentPassword = await getAdminPassword();
    if (!currentPassword) return unauthorized();

    const header = request.headers.get("x-admin-key");
    if (!header || header !== currentPassword) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const { current, next } = body || {};
    if (!current || current !== currentPassword) return unauthorized();

    if (
      typeof next !== "string" ||
      next.length < MIN_LEN ||
      next.length > MAX_LEN ||
      WHITESPACE_RE.test(next)
    ) {
      return Response.json(
        { error: `新密碼長度需為 ${MIN_LEN}～${MAX_LEN} 字，且不能包含空白` },
        { status: 400 }
      );
    }

    await setAdminPassword(next);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("admin password POST error", e);
    return Response.json({ error: "伺服器忙線，請再試一次" }, { status: 500 });
  }
}
