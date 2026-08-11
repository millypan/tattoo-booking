"use client";
import { useState } from "react";

export default function ConsultSlotForm({ token, slots }) {
  const [slotId, setSlotId] = useState("");
  const [state, setState] = useState("form");
  const [error, setError] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [copied, setCopied] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!slotId) return setError("請先選擇一個方便的時段");
    setState("sending");
    setError("");
    const res = await fetch(`/api/consult/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setState("form");
      setError(data.error || "暫時無法保留時段，請稍後再試");
      return;
    }
    setSelectedLabel(data.label || "已選擇諮詢時段");
    setState("done");
  }

  async function copyLineMessage() {
    const message = `米粒你好，我已經選好諮詢時間：${selectedLabel}，再麻煩你提供押金資訊，謝謝！`;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setError("");
    } catch {
      setError("無法自動複製，請長按下方文字後選擇複製");
    }
  }

  if (state === "done") {
    return (
      <div className="done consult-done">
        <div className="stamp serif">約</div>
        <h2 className="serif">時段已為你保留</h2>
        <p className="consult-selected">{selectedLabel}</p>
        <div className="rulebox">
          <p><b>把這段訊息傳給米粒：</b></p>
          <p className="consult-line-message">米粒你好，我已經選好諮詢時間：{selectedLabel}，再麻煩你提供押金資訊，謝謝！</p>
          <p>米粒確認後會提供押金資訊；完成 1,000 元押金後，才算正式完成諮詢預約。</p>
        </div>
        {error ? <p className="err">{error}</p> : null}
        <div className="consult-actions">
          <button className="cta" type="button" onClick={copyLineMessage}>
            {copied ? "已複製訊息" : "複製訊息"}
          </button>
          {process.env.NEXT_PUBLIC_LINE_URL ? (
            <a className="cta ghost" href={process.env.NEXT_PUBLIC_LINE_URL} target="_blank" rel="noreferrer">回到 LINE</a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="slots consult-slots">
        {slots.map((slot) => (
          <button
            type="button"
            className={`slot${slotId === slot.id ? " on" : ""}`}
            key={slot.id}
            onClick={() => setSlotId(slot.id)}
          >
            {slot.label}
          </button>
        ))}
      </div>
      {error ? <p className="err">{error}</p> : null}
      <button className="cta" type="submit" disabled={state === "sending" || !slotId}>
        {state === "sending" ? "保留中…" : "確認這個諮詢時段"}
      </button>
    </form>
  );
}
