"use client";
import { useState } from "react";

export default function ConsultSlotForm({ token, slots }) {
  const [slotId, setSlotId] = useState("");
  const [state, setState] = useState("form");
  const [error, setError] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");

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

  if (state === "done") {
    return (
      <div className="done consult-done">
        <div className="stamp serif">約</div>
        <h2 className="serif">時段已為你保留</h2>
        <p className="consult-selected">{selectedLabel}</p>
        <div className="rulebox">
          <p>接下來請回到原本的 LINE 對話告訴米粒「已選好時段」。</p>
          <p>米粒確認後會提供押金資訊；完成 1,000 元押金後，才算正式完成諮詢預約。</p>
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
