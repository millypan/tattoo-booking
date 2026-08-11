import Link from "next/link";
import ConsultSlotForm from "../../../components/ConsultSlotForm";
import { getConsultationSelectionPage } from "../../../lib/notion";

export const dynamic = "force-dynamic";

export default async function ConsultationPage({ params }) {
  const { token } = await params;
  const data = await getConsultationSelectionPage(token);

  if (data.state === "invalid") {
    return <Message stamp="歉" title="這個連結無法使用">請回到原本的 LINE 對話聯絡米粒，我會陪你確認下一步。</Message>;
  }
  if (data.state === "not-open") {
    return <Message stamp="候" title="還在確認你的想法">這份資料目前還沒有開放選時段。米粒確認後，會從 LINE 告訴你下一步。</Message>;
  }
  if (data.state === "selected") {
    return <Message stamp="約" title="你已經選好時段">{data.selectedLabel}。接下來請回到 LINE 告訴米粒「已選好時段」，完成押金後才算正式預約。</Message>;
  }

  return (
    <main className="public-page custom-page consult-page">
      <Link className="back" href="/">← 回到拾光印記所</Link>
      <section className="consult-card">
        <p className="consult-kicker">CUSTOM CONSULTATION</p>
        <h1 className="serif">選擇你的諮詢時間</h1>
        <p>{data.booking.name}，謝謝你願意把這段故事交給米粒。請選一個方便當面聊聊的時間。</p>
        {data.slots.length ? (
          <ConsultSlotForm token={token} slots={data.slots} />
        ) : (
          <div className="rulebox">
            <p><b>目前沒有開放中的諮詢時段。</b></p>
            <p>米粒正在整理接下來的時間，請先回 LINE 告訴我，我會再通知你。</p>
          </div>
        )}
        <p className="hint">選定時段後會先為你保留；完成 1,000 元押金後，才算正式完成諮詢預約。</p>
      </section>
    </main>
  );
}

function Message({ stamp, title, children }) {
  return (
    <main className="public-page custom-page consult-page">
      <div className="done">
        <div className="stamp serif">{stamp}</div>
        <h2 className="serif">{title}</h2>
        <p>{children}</p>
        <Link className="cta ghost" href="/">回到首頁</Link>
      </div>
    </main>
  );
}
