"use client";
import { useState } from "react";

// 拍（選）一張照片，前端先縮到 1200px JPEG 再回傳 dataURL，
// 送出預約時才上傳——照片在那之前只留在客人手機裡。
export default function PhotoAttach({
  value,
  onChange,
  label = "📷 拍下想刺的部位",
  previewAlt = "部位照片",
  attachedHint = "這張會附進預約單，讓米粒看到實際位置與皮膚狀況。",
  capture = "environment",
}) {
  const [busy, setBusy] = useState(false);

  function load(file) {
    setBusy(true);
    const img = new Image();
    img.onload = () => {
      const maxW = 1200;
      const ratio = Math.min(1, maxW / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * ratio);
      canvas.height = Math.round(img.naturalHeight * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      onChange(canvas.toDataURL("image/jpeg", 0.82));
      setBusy(false);
    };
    img.onerror = () => setBusy(false);
    img.src = URL.createObjectURL(file);
  }

  return (
    <div>
      {!value ? (
        <label className="cta ghost" style={{ cursor: "pointer", display: "inline-block" }}>
          {busy ? "處理中…" : label}
          <input
            type="file" accept="image/*" capture={capture} hidden
            onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
          />
        </label>
      ) : (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src={value} alt={previewAlt} style={{ width: 96, borderRadius: 2, border: "1px solid #332d29" }} />
          <div>
            <div className="hint">{attachedHint}</div>
            <button type="button" className="slot" style={{ marginTop: 6 }} onClick={() => onChange(null)}>移除</button>
          </div>
        </div>
      )}
    </div>
  );
}
