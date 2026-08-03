"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const Body3D = dynamic(() => import("./Body3D"), {
  ssr: false,
  loading: () => <p className="hint">3D 人體模型載入中…</p>,
});
const PhotoAttach = dynamic(() => import("./PhotoAttach"), { ssr: false });

const STYLES = ["美式傳統", "線條", "水墨", "點刺", "不確定，聊了再說"];

export default function CustomForm() {
  const [state, setState] = useState("form");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [spot, setSpot] = useState(null);
  const [partPhoto, setPartPhoto] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!spot?.region) {
      setError("請先在 3D 人體模型上點選想刺的位置");
      return;
    }
    const form = new FormData(e.target);
    setState("sending");
    const res = await fetch("/api/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        story: form.get("story"),
        style: form.get("style"),
        ref: form.get("ref"),
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
        <h2 className="serif">想法收到了</h2>
        <p>{name}，你的想法我看得到了。我會盡快回覆你能不能做，可以的話同時跟你約討論時間。</p>
        <div className="rulebox">
          <p><b>記得加 LINE 官方帳號</b>——回覆會從那裡找你。</p>
          <p>米粒會親自讀過你寫的故事，在 LINE 上跟你聊聊可行的方向。</p>
          <p>約定討論時段前需付 1,000 元押金：當天有來且確定要刺，全額折抵刺青費用；聊完決定不刺，全額退回。放心來聊。</p>
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
    <form style={{ maxWidth: "36em" }} onSubmit={submit}>
      <div className="field">
        <label htmlFor="name">怎麼稱呼你</label>
        <input type="text" id="name" name="name" required maxLength={40} />
      </div>
      <div className="field">
        <label htmlFor="story">這個刺青對你來說是什麼？</label>
        <textarea id="story" name="story" required maxLength={1000}
          placeholder="一段經歷、一個人、一句想記住的話……用你的話說就好" />
      </div>
      <div className="field">
        <label htmlFor="style">喜歡的風格</label>
        <select id="style" name="style">
          {STYLES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="hint">在圖庫看到喜歡的感覺，也可以直接寫是哪一張</div>
      </div>
      <div className="field">
        <label htmlFor="ref">參考圖連結（選填）</label>
        <input type="url" id="ref" name="ref" placeholder="IG／Pinterest 連結，或之後在 LINE 傳給我" />
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
        <label>拍一張想刺的部位（選用，但很推薦）</label>
        <PhotoAttach value={partPhoto} onChange={setPartPhoto} />
        <div className="hint">米粒看得到實際位置和皮膚，評估「能不能做」會快很多。照片送出預約前只留在你手機裡。</div>
      </div>
      <div className="rulebox">
        <p><b>當面討論怎麼進行：</b>安排在上午，一次約 1 到 1.5 小時。</p>
        <p>約討論前會收 <b>1,000 元押金</b>——當天有來且確定要刺，全額折抵刺青費用；聊完決定不刺，全額退回。</p>
        <details className="booking-rules compact">
          <summary>查看諮詢改期與取消規則</summary>
          <div className="booking-rules-body">
            <p>距離諮詢日超過 5 日，可免費改期一次；若選擇取消，退回 950 元。</p>
            <p>諮詢日前 5 日內（包含諮詢當日）提出改期、取消、遲到未到，或因其他個人因素無法出席，1,000 元押金皆不退還。</p>
            <p>若有如期到場完成諮詢，最後決定不刺，1,000 元押金仍會全額退回。</p>
          </div>
        </details>
      </div>
      <label className="rules-check">
        <input type="checkbox" name="acceptRules" required />
        <span>我已閱讀並同意諮詢押金與改期規則。</span>
      </label>
      {error ? <p className="err">{error}</p> : null}
      <button className="cta" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "送出中…" : "送出想法"}
      </button>
    </form>
  );
}
