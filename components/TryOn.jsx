"use client";
import { useEffect, useRef, useState } from "react";

// 拍照試貼：拍（選）一張自己的照片，把圖案疊上去拖曳／縮放／旋轉，
// 混合模式 multiply 讓墨色吃進皮膚。輸出合成圖可下載或附進預約單。
export default function TryOn({ workId, workName, imgIndex = 0, onUse, onClose }) {
  const canvasRef = useRef(null);
  const [photo, setPhoto] = useState(null); // HTMLImageElement
  const [design, setDesign] = useState(null);
  const [t, setT] = useState({ x: 0.5, y: 0.5, scale: 0.35, rot: 0, alpha: 0.9, ink: true });
  const pointers = useRef(new Map());
  const gesture = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setDesign(img);
    img.src = `/api/img?work=${workId}&i=${imgIndex}`;
  }, [workId, imgIndex]);

  function loadPhoto(file) {
    const img = new Image();
    img.onload = () => setPhoto(img);
    img.src = URL.createObjectURL(file);
  }

  // 重畫
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) return;
    const maxW = 1100;
    const ratio = Math.min(1, maxW / photo.naturalWidth);
    canvas.width = Math.round(photo.naturalWidth * ratio);
    canvas.height = Math.round(photo.naturalHeight * ratio);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);
    if (design) {
      const w = canvas.width * t.scale;
      const h = w * (design.naturalHeight / design.naturalWidth);
      ctx.save();
      ctx.translate(t.x * canvas.width, t.y * canvas.height);
      ctx.rotate(t.rot);
      ctx.globalAlpha = t.alpha;
      ctx.globalCompositeOperation = t.ink ? "multiply" : "source-over";
      ctx.drawImage(design, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }, [photo, design, t]);

  // 手勢：單指拖移、雙指縮放＋旋轉
  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        dist: Math.hypot(b[0] - a[0], b[1] - a[1]),
        ang: Math.atan2(b[1] - a[1], b[0] - a[0]),
        scale: t.scale,
        rot: t.rot,
      };
    }
  }
  function onPointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId);
    pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    const rect = canvasRef.current.getBoundingClientRect();
    if (pointers.current.size === 1) {
      const dx = (e.clientX - prev[0]) / rect.width;
      const dy = (e.clientY - prev[1]) / rect.height;
      setT((s) => ({ ...s, x: Math.min(1, Math.max(0, s.x + dx)), y: Math.min(1, Math.max(0, s.y + dy)) }));
    } else if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const g = gesture.current;
      setT((s) => ({
        ...s,
        scale: Math.min(1.2, Math.max(0.05, (g.scale * dist) / g.dist)),
        rot: g.rot + (ang - g.ang),
      }));
    }
  }
  function onPointerUp(e) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  }

  function exportJpeg() {
    return canvasRef.current?.toDataURL("image/jpeg", 0.82) || null;
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50, overflowY: "auto",
        background: "rgba(12,10,9,.96)", padding: "20px 16px 40px",
      }}
      role="dialog" aria-label="拍照試貼"
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <b className="serif" style={{ fontSize: 18, letterSpacing: ".12em" }}>試貼：{workName}</b>
          <button className="cta ghost" style={{ padding: "6px 16px", letterSpacing: ".1em" }} onClick={onClose}>關閉</button>
        </div>

        {!photo ? (
          <div className="rulebox" style={{ textAlign: "center" }}>
            <p>拍一張想刺的部位（光線亮一點、鏡頭離 30 公分左右最準）</p>
            <label className="cta" style={{ display: "inline-block", cursor: "pointer" }}>
              📸 拍照／選照片
              <input
                type="file" accept="image/*" capture="environment" hidden
                onChange={(e) => e.target.files?.[0] && loadPhoto(e.target.files[0])}
              />
            </label>
            <p className="hint">照片只在你的手機上合成，不會上傳——除非你最後選擇附進預約單。</p>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              style={{ width: "100%", borderRadius: 2, border: "1px solid #332d29", touchAction: "none", cursor: "move" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            <p className="hint" style={{ margin: "8px 0 12px" }}>
              單指拖曳移動位置・雙指縮放＋旋轉
            </p>
            <div className="field">
              <label>大小</label>
              <input type="range" min="0.05" max="1.2" step="0.01" value={t.scale}
                style={{ width: "100%" }}
                onChange={(e) => setT((s) => ({ ...s, scale: +e.target.value }))} />
            </div>
            <div className="field">
              <label>旋轉</label>
              <input type="range" min={-Math.PI} max={Math.PI} step="0.02" value={t.rot}
                style={{ width: "100%" }}
                onChange={(e) => setT((s) => ({ ...s, rot: +e.target.value }))} />
            </div>
            <div className="field">
              <label>墨感（讓圖吃進皮膚）</label>
              <div className="slots" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <button type="button" className={`slot${t.ink ? " on" : ""}`} onClick={() => setT((s) => ({ ...s, ink: true }))}>墨感</button>
                <button type="button" className={`slot${!t.ink ? " on" : ""}`} onClick={() => setT((s) => ({ ...s, ink: false }))}>原圖</button>
              </div>
              <input type="range" min="0.3" max="1" step="0.02" value={t.alpha}
                style={{ width: "100%", marginTop: 8 }}
                onChange={(e) => setT((s) => ({ ...s, alpha: +e.target.value }))} />
              <div className="hint">下面的桿子調濃淡</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <button
                type="button" className="cta"
                onClick={() => { const d = exportJpeg(); if (d) onUse(d); }}
              >
                就是這個位置，附進預約單
              </button>
              <a
                className="cta ghost"
                href={photo ? exportJpeg() : "#"}
                download={`試貼-${workName}.jpg`}
                onClick={(e) => { e.currentTarget.href = exportJpeg() || "#"; }}
              >
                存圖
              </a>
              <label className="cta ghost" style={{ cursor: "pointer" }}>
                重拍
                <input type="file" accept="image/*" capture="environment" hidden
                  onChange={(e) => e.target.files?.[0] && loadPhoto(e.target.files[0])} />
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
