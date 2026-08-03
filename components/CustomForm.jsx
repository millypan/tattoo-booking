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
const PhotoAttach = dynamic(() => import("./PhotoAttach"), { ssr: false });

export default function CustomForm() {
  const [state, setState] = useState("form");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [spot, setSpot] = useState(null);
  const [partPhoto, setPartPhoto] = useState(null);
  const [refPhoto, setRefPhoto] = useState(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const formRef = useRef(null);

  function requestConsent(e) {
    e.preventDefault();
    setError("");
    if (!spot?.region) {
      setError("請先在 3D 人體模型上點選想刺的位置");
      return;
    }
    if (projectType !== "全新客製" && !partPhoto) {
      setError("舊圖修改、延伸或改蓋，需要先上傳目前刺青的清楚照片");
      return;
    }
    setConsentOpen(true);
  }

  async function submit() {
    setConsentOpen(false);
    const form = new FormData(formRef.current);
    setState("sending");
    const res = await fetch("/api/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        projectType: form.get("projectType"),
        story: form.get("story"),
        style: form.get("style"),
        ref: form.get("ref"),
        refPhoto,
        spot: `${spot.region}${spot.note ? `（${spot.note}）` : ""}｜大概尺寸：${form.get("size") || "未填"}`,
        partPhoto,
      }),
    });
    if (!res.ok) {
      setState("form");
      setError("送出失敗，請再試一次，或直接透過 LINE 官方帳號聯絡。");
      return;
    }
    setName(form.get("name"));
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="done">
        <div className="stamp serif">收</div>
        <h2 className="serif">初步評估資料收到了</h2>
        <p>{name}，我會先確認風格、部位與圖面是否適合施作。這一步還不是正式預約，也不需要付款。</p>
        <div className="rulebox">
          <p><b>記得加 LINE 官方帳號</b>——回覆會從那裡找你。</p>
          <p>我會親自讀過你寫的故事；確認適合承接後，再和你安排諮詢時間。</p>
          <p>選定諮詢時段後才需要支付 1,000 元押金。若需要調整方向，或不建議直接修改舊圖，我也會先說明原因。</p>
          <p>
            {process.env.NEXT_PUBLIC_LINE_URL ? (
              <a className="cta" href={process.env.NEXT_PUBLIC_LINE_URL} target="_blank" rel="noreferrer">加 LINE 官方帳號</a>
            ) : (
              <b>LINE 官方帳號連結（待補）</b>
            )}
          </p>
        </div>
        <Link className="cta ghost" href="/">看看認領圖</Link>
      </div>
    );
  }

  return (
    <form ref={formRef} style={{ maxWidth: "36em" }} onSubmit={requestConsent}>
      <div className="field">
        <label htmlFor="name">怎麼稱呼你</label>
        <input type="text" id="name" name="name" required maxLength={40} />
      </div>
      <div className="field">
        <label htmlFor="projectType">這次想討論的是？</label>
        <select id="projectType" name="projectType" required value={projectType} onChange={(e) => setProjectType(e.target.value)}>
          <option value="">請選擇</option>
          <option value="全新客製">全新客製</option>
          <option value="舊刺青修改／延伸">舊刺青修改／延伸</option>
          <option value="舊刺青改蓋">舊刺青改蓋</option>
        </select>
        {projectType && projectType !== "全新客製" ? (
          <div className="hint">舊圖會依現況、深淺、位置與可用空間評估；不一定適合直接修改，也可能建議調整方向或暫不施作。</div>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="story">為什麼想刻下這個印記呢？</label>
        <textarea id="story" name="story" required maxLength={1000}
          placeholder="一段經歷、一個人、一句想記住的話……用你的話說就好" />
      </div>
      <div className="field">
        <label htmlFor="style">想用哪種風格呈現這個主題呢？</label>
        <textarea id="style" name="style" maxLength={300}
          placeholder="可以描述喜歡的感覺、線條或色彩，也可以在下方貼上參考網址或上傳圖片" />
        <input type="url" id="ref" name="ref" placeholder="貼上 IG／Pinterest 等參考網址（選填）" />
        <div style={{ marginTop: 10 }}>
          <PhotoAttach
            value={refPhoto}
            onChange={setRefPhoto}
            label="上傳風格參考圖片"
            previewAlt="風格參考圖片"
            attachedHint="這張會和你的風格想法一起附進預約單。"
            capture={undefined}
          />
        </div>
      </div>
      <div className="field">
        <label>想刺的部位</label>
        <Body3D value={spot} onChange={setSpot} />
      </div>
      <div className="field">
        <label htmlFor="size">大概尺寸</label>
        <input type="text" id="size" name="size" placeholder="例：約 10 公分" maxLength={40} />
      </div>
      <div className="field">
        <label>{projectType && projectType !== "全新客製" ? "上傳舊刺青目前的清楚照片（必填）" : "拍一張想刺的部位（選用，但很推薦）"}</label>
        <PhotoAttach value={partPhoto} onChange={setPartPhoto} />
        <div className="hint">
          {projectType && projectType !== "全新客製"
            ? "請在光線充足、對焦清楚的情況下，完整拍到原圖與周圍皮膚。"
            : "也能讓米粒在討論前，多準備幾個適合這個部位的構圖方向，和你一起討論。"}
        </div>
      </div>
      <div className="rulebox">
        <p><b>這一步是初步評估：</b>送出後不會直接成立預約，也不需要付款。</p>
        <p>確認適合承接後，才會安排約 1 小時的當面諮詢；選定時段後收取 <b>1,000 元押金</b>。</p>
        <details className="booking-rules compact">
          <summary>查看諮詢改期與取消規則</summary>
          <div className="booking-rules-body">
            <p>諮詢日前 5 日，可免費改期一次；若選擇取消，退回 950 元。</p>
            <p>諮詢日前 5 日內（包含諮詢當日）提出改期、取消、遲到未到，或因其他個人因素無法出席，1,000 元押金皆不退還。</p>
            <p>諮詢或刺青當日遲到超過 30 分鐘，將視同取消，押金或定金不退。</p>
            <p>若有如期到場完成諮詢，最後決定不刺，1,000 元押金仍會全額退回。</p>
            <h4>草圖與設計流程</h4>
            <p>客製作品無法在討論當天直接刺青。請先準備主題、風格、尺寸、部位、文字或字體及參考圖片，讓當天的溝通更完整。</p>
            <p>草圖僅於諮詢現場提供約八成版本討論，不提供電子檔，也不開放拍攝；最終定稿會在刺青當天一起確認。</p>
            <p>討論完確認施作後，原 1,000 元押金會全額折抵刺青費，並於下單當日補足至總價 50% 作為定金。</p>
            <p>作品會依米粒的創作風格與你的故事設計，不接受與他人完全相同的圖案。</p>
            <SharedBookingRules />
          </div>
        </details>
      </div>
      {error ? <p className="err">{error}</p> : null}
      <button className="cta" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "送出中…" : "送出初步評估"}
      </button>
      <BookingConsentModal
        open={consentOpen}
        type="custom"
        onClose={() => setConsentOpen(false)}
        onConfirm={submit}
      />
    </form>
  );
}
