import { confirmAdminPayment, getAdminPassword, getAdminPaymentBooking } from "../../../../lib/notion";

async function isAuthed(request) {
  const password = await getAdminPassword();
  return !!password && request.headers.get("x-admin-key") === password;
}

const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });

export async function GET(request) {
  if (!(await isAuthed(request))) return unauthorized();
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "缺少預約 id" }, { status: 400 });
    return Response.json(await getAdminPaymentBooking(id));
  } catch (e) {
    console.error("admin payment GET error", e);
    return Response.json({ error: e.message || "讀取失敗" }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAuthed(request))) return unauthorized();
  try {
    const result = await confirmAdminPayment(await request.json());
    return Response.json(result);
  } catch (e) {
    console.error("admin payment POST error", e);
    return Response.json({ error: e.message || "建立收款失敗" }, { status: 400 });
  }
}
