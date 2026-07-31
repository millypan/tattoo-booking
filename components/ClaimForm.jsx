"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const Body3D = dynamic(() => import("./Body3D"), {
  ssr: false,
  loading: () => <p className="hint">3D 人體模型載入中…</p>,
});
const TryOn = dynamic(() => import("./TryOn"), { ssr: false });

export default function ClaimForm({ workId, workName, slots, imageCount = 1 }) {
  const [slotId, setSlotId] = useState(null);
  const [spot, setSpot] = useState(null);
  const [sizeChoice, setSizeChoice] = useState("最小建議尺寸");
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [tryOnImage, setTryOnImage] = useState(null); // dataURL
  const [state, setState] = useState("form"); // form | sending | done
  const [error, setError] = useState("");
  const [doneMsg, setDoneMsg] = useState("");

  // 圖檔約定：第 1 張＝展示圖；第 2 張＝去背圖（試貼用）。
  const tryOnImgIndex = imageCount > 1 ? 1 : 0;

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!spot?.region) {
      setError("請先在 3D 人體模型上點選想刺的位置");
      return;
    }
    if (!slotId && slots.length > 0) {
      setError("請先選一個時段");
      return;
    }
    const form = new FormData(e.target);
    setState("sending");
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        spot: `${spot.region}${spot.note ? `（${spot.note}）` : ""}`,
        sizeChoice,
        tryOn: tryOnImage,
        workId,
        slotId,
      }),
    });
    if (!res.ok) {
      setState("form");
      setError("送出失敗，請再試一次，或直接透過 LINE 官方帳號聯絡。");
      return;
    }
    const slotLabel = slots.find((s) => s.id === slotId)?.label || "";
    setDoneMsg(
      `${form.get("name")}，你認領了「${workName}」${slotLabel ? `，時段：${slotLabel}` : ""}。`
    );
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="done" style={{ margin: "20px 0", textAlign: "left" }}>
        <h2 className="serif">這張圖，先幫你留著</h2>
        <p>{doneMsg}</p>
        {sizeChoice !== "最小建議尺寸" ? (
          <p>你選了「想放大」——放大的幅度與價格，米粒會在 LINE 上跟你確認報價。</p>
        ) : null}
        <div className="rulebox">
          <p><b>接下來一步：</b>加 LINE 官方帳號，跟米粒說你的稱呼。</p>
          <p>她會親自看過你選的部位（和試貼照），跟你確認最適合的位置，確定沒問題後把轉帳資訊給你——付總額一半作為定金，入帳後時段正式鎖定、這張圖就是你的了。</p>
          <p>
            {process.env.NEXT_PUBLIC_LINE_URL ? (
              <a className="cta" href={process.env.NEXT_PUBLIC_LINE_URL} target="_blank" rel="noreferrer">加 LINE 官方帳號</a>
            ) : (
              <b>LINE 官方帳號連結（待補）</b>
            )}
          </p>
        </div>
        <Link className="cta ghost" href="/">回圖庫</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="name">怎麼稱呼你</label>
        <input type="text" id="name" name="name" required maxLength={40} />
      </div>
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
      <div className="field">
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
          </div>
        )}
      </div>
      {error ? <p className="err">{error}</p> : null}
      <button className="cta" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "送出中…" : "預約這張圖"}
      </button>
    </form>
  );
}
