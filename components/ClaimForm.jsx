"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import SharedBookingRules from "./SharedBookingRules";
import BookingConsentModal from "./BookingConsentModal";

const Body3D = dynamic(() => import("./Body3D"), {
  ssr: false,
  loading: () => <p className="hint">3D 人體模型載入中…</p>,
});
const TryOn = dynamic(() => import("./TryOn"), { ssr: false });
const PhotoAttach = dynamic(() => import("./PhotoAttach"), { ssr: false });

export default function ClaimForm({
  workId,
  workName,
  slots,
  imageCount = 1,
  price,
  minimumSize,
}) {
  const [slotId, setSlotId] = useState(null);
  const [spot, setSpot] = useState(null);
  const [sizeChoice, setSizeChoice] = useState("最小建議尺寸");
  const [applicationType, setApplicationType] = useState("刺在新的位置");
  const isCoverApplication = applicationType === "覆蓋原有刺青或疤痕";
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [tryOnImage, setTryOnImage] = useState(null); // dataURL
  const [state, setState] = useState("form"); // form | sending | done
  const [error, setError] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
  const [lineMessage, setLineMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const formRef = useRef(null);

  // 圖檔約定：第 1 張＝展示圖；第 2 張＝去背圖（試貼用）。
  const tryOnImgIndex = imageCount > 1 ? 1 : 0;

  function requestConsent(e) {
    e.preventDefault();
    setError("");
    if (!spot?.region) {
      setError("請先在 3D 人體模型上點選想刺的位置");
      return;
    }
    if (isCoverApplication && !coverPhoto) {
      setError("想覆蓋原有刺青或疤痕，需要先上傳目前狀況的清楚照片");
      return;
    }
    if (!isCoverApplication && !slotId && slots.length > 0) {
      setError("請先選一個時段");
      return;
    }
    setConsentOpen(true);
  }

  async function submit() {
    setConsentOpen(false);
    const form = new FormData(formRef.current);
    setState("sending");
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        spot: `${spot.region}${spot.note ? `（${spot.note}）` : ""}`,
        sizeChoice,
        applicationType,
        coverPhoto,
        tryOn: tryOnImage,
        workId,
        slotId: !isCoverApplication ? slotId : null,
      }),
    });
    if (!res.ok) {
      setState("form");
      setError("送出失敗，請再試一次，或直接透過 LINE 官方帳號聯絡。");
      return;
    }
    const data = await res.json();
    const slotLabel = slots.find((s) => s.id === slotId)?.label || "待米粒評估後安排";
    const customerName = form.get("name");
    setDoneMsg(
      `${customerName}，你認領了「${workName}」。`
    );
    setLineMessage(`米粒你好，我是${customerName}。\n我剛剛認領了「${workName}」。\n選擇尺寸：${sizeChoice}\n預約時段：${slotLabel}\n認領編號：${data.claimCode}\n請幫我確認，謝謝！`);
    setState("done");
  }

  async function copyLineMessage() {
    try {
      await navigator.clipboard.writeText(lineMessage);
      setCopied(true);
    } catch {
      setError("無法自動複製，請長按下方訊息後選擇複製。");
    }
  }

  if (state === "done") {
    return (
      <div className="done" style={{ margin: "20px 0", textAlign: "left" }}>
        <h2 className="serif">{isCoverApplication ? "資料收到了，先幫你評估" : "這張圖，先幫你留著"}</h2>
        <p>{doneMsg}</p>
        {isCoverApplication ? (
          <p>米粒會先看原有刺青的深淺、範圍與位置，確認這張認領圖是否適合直接改蓋，再透過 LINE 和你說明。</p>
        ) : null}
        {sizeChoice !== "最小建議尺寸" ? (
          <p>你選了「想放大」——放大的幅度與價格，米粒會在 LINE 上跟你確認報價。</p>
        ) : null}
        <div className="rulebox claim-line-required">
          <p className="booking-notice-kicker">還差最後一步</p>
          <h3 className="serif">請務必把這段訊息傳到官方 LINE</h3>
          <p>網站無法直接辨識你的 LINE 身分。米粒收到這段訊息後，才能確認這張圖是由你認領。</p>
          <p className="consult-line-message">{lineMessage}</p>
          {error ? <p className="err">{error}</p> : null}
          <div className="consult-actions">
            <button type="button" className="cta" onClick={copyLineMessage}>{copied ? "已複製認領訊息 ✓" : "複製認領確認訊息"}</button>
            {copied && process.env.NEXT_PUBLIC_LINE_URL ? (
              <a className="cta ghost" href={process.env.NEXT_PUBLIC_LINE_URL} target="_blank" rel="noreferrer">前往官方 LINE</a>
            ) : null}
          </div>
          <p className="hint">複製後請前往 LINE 對話，貼上並送出。手機號碼只作為漏傳訊息時的聯絡備援。</p>
        </div>
        {copied ? <Link className="back" href="/">稍後回圖庫</Link> : null}
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={requestConsent}>
      <section className="booking-notice" aria-labelledby="claim-notice-title">
        <p className="booking-notice-kicker">認領前，先讓你知道</p>
        <h3 id="claim-notice-title" className="serif">喜歡這張圖，就安心把流程看完</h3>
        <ul className="booking-notice-highlights">
          <li>每張認領圖只屬於一位客人，認領後不更換主題與內容。</li>
          <li>定金為總價的 50%，需於下單當日完成匯款。</li>
          <li>定金入帳後，請於 6 個月內完成作品。</li>
        </ul>
        <details className="booking-rules">
          <summary>查看完整認領與改期規則</summary>
          <div className="booking-rules-body">
            <h4>作品與費用</h4>
            <p>頁面價格為最小建議尺寸、一般部位的基準價格；特殊部位、放大尺寸或需要調整設計時，會由米粒另外確認報價。</p>
            <p>定金為作品總價的 50%。下單當日完成匯款後，作品與時段才會正式保留；付定後請於 6 個月內完成刺青。</p>
            <h4>改期與取消</h4>
            <p>刺青日前 5 日，可免費改期一次。刺青日前 5 日內（包含刺青當日）提出改期、取消、遲到未到，或因個人因素無法施作，定金皆不退還。</p>
            <p>諮詢或刺青當日遲到超過 30 分鐘，將視同取消，定金不退。</p>
            <h4>施作前提醒</h4>
            <p>當天請先吃飽，並穿著方便露出刺青部位的深色寬鬆衣物。</p>
            <h4>作品與使用</h4>
            <p>認領圖只屬於一位客人，不更換原本的主題與內容；作品著作權仍歸米粒所有，刺青費用不包含圖稿授權。</p>
            <SharedBookingRules />
          </div>
        </details>
      </section>
      <div className="field">
        <label>這張圖想怎麼刺呢？</label>
        <div className="slots">
          {["刺在新的位置", "覆蓋原有刺青或疤痕"].map((option) => (
            <button type="button" key={option} className={`slot${applicationType === option ? " on" : ""}`}
              onClick={() => { setApplicationType(option); setSlotId(null); setError(""); }}>
              {option}
            </button>
          ))}
        </div>
        {isCoverApplication ? (
          <div className="hint">需要先評估舊刺青的深淺、大小、位置與可用空間；不一定每張認領圖都適合直接改蓋。</div>
        ) : null}
      </div>
      {isCoverApplication ? (
        <div className="field">
          <label>上傳原有刺青的清楚照片（必填）</label>
          <PhotoAttach value={coverPhoto} onChange={setCoverPhoto} label="上傳原有刺青照片" previewAlt="原有刺青照片" />
          <div className="hint">請在光線充足、對焦清楚的情況下，完整拍到原圖與周圍皮膚。</div>
        </div>
      ) : null}
      <div className="field">
        <label>想刺的部位</label>
        <Body3D value={spot} onChange={setSpot} />
      </div>
      <div className="field">
        <label>先看看刺在身上的樣子（選用）</label>
        <button
          type="button"
          className="cta ghost"
          onClick={() => {
            setError("");
            setTryOnOpen(true);
          }}
        >
          📸 拍照試貼
        </button>
        {tryOnImage ? (
          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
            <img src={tryOnImage} alt="試貼合成圖" style={{ width: 96, borderRadius: 2, border: "1px solid #332d29" }} />
            <div>
              <div className="hint">這張合成圖會附進預約單，讓米粒看到你期待的位置與大小。</div>
              <button type="button" className="slot" style={{ marginTop: 6 }} onClick={() => setTryOnImage(null)}>移除</button>
            </div>
          </div>
        ) : null}
      </div>
      {tryOnOpen ? (
        <TryOn
          workId={workId}
          workName={workName}
          imgIndex={tryOnImgIndex}
          onUse={(img) => { setTryOnImage(img); setTryOnOpen(false); }}
          onClose={() => setTryOnOpen(false)}
        />
      ) : null}
      <section className="claim-work-summary" aria-labelledby="claim-work-summary-title">
        <p className="booking-notice-kicker">這張圖的資訊</p>
        <h3 id="claim-work-summary-title" className="serif">試貼後，再看看適合的尺寸</h3>
        <ul className="facts">
          <li><span>價格</span><b>{price != null ? `NT$ ${price.toLocaleString()}` : "詢價"}</b></li>
          <li><span>建議尺寸</span><b>{minimumSize || "—"}</b></li>
        </ul>
        <p className="hint">價格以建議尺寸與一般部位為基準；特殊部位、放大尺寸或需要調整設計時，米粒會再和你確認報價。</p>
      </section>
      <div className="claim-form-divider" aria-hidden="true" />
      <div className="field">
        <label htmlFor="name">怎麼稱呼你</label>
        <input type="text" id="name" name="name" required maxLength={40} />
      </div>
      <div className="field">
        <label htmlFor="phone">手機號碼</label>
        <input type="tel" id="phone" name="phone" required inputMode="tel" autoComplete="tel" maxLength={20} placeholder="例：0912 345 678" />
        <div className="hint">只在你漏傳 LINE 認領訊息時作為聯絡備援，不會公開顯示。</div>
      </div>
      <div className="field">
        <label>尺寸</label>
        <div className="slots">
          {["最小建議尺寸", "想放大（另外報價）"].map((s) => (
            <button
              type="button"
              key={s}
              className={`slot${sizeChoice === s ? " on" : ""}`}
              onClick={() => setSizeChoice(s)}
            >
              {s}
            </button>
          ))}
        </div>
        {sizeChoice !== "最小建議尺寸" ? (
          <div className="hint">
            可以放大！放大的幅度與加價，送出後由米粒本人跟你洽談確認。
          </div>
        ) : (
          <div className="hint">頁面上標的是這張圖的最小建議尺寸。</div>
        )}
      </div>
      {!isCoverApplication ? <div className="field">
        <label>選一個刺青時段</label>
        {slots.length === 0 ? (
          <p className="hint">目前沒有開放中的時段——先送出認領，時段之後在 LINE 上約。</p>
        ) : (
          <div className="slots">
            {slots.map((s) => (
              <button
                type="button"
                key={s.id}
                className={`slot${slotId === s.id ? " on" : ""}`}
                onClick={() => setSlotId(s.id)}
              >
                {s.label}
              </button>
            ))}
            <p className="hint">如果以上的時段都沒有辦法的話，請到官方 LINE 詢問其他時段。</p>
          </div>
        )}
      </div> : (
        <div className="field"><p className="hint">改蓋案件會先由米粒評估是否適合；確認可行後，再一起安排刺青時間。</p></div>
      )}
      {error ? <p className="err">{error}</p> : null}
      <button className="cta" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "送出中…" : "預約這張圖"}
      </button>
      <BookingConsentModal
        open={consentOpen}
        type={isCoverApplication ? "claim-cover" : "claim"}
        onClose={() => setConsentOpen(false)}
        onConfirm={submit}
      />
    </form>
  );
}
