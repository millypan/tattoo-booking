"use client";
import { useState } from "react";

// 座標以「身體本人的左右」為準：正面圖中，本人的左手在畫面右側。
const FRONT = [
  { id: "頭部", x: 96, y: 10, w: 48, h: 46, rx: 22 },
  { id: "頸部", x: 106, y: 58, w: 28, h: 18, rx: 8 },
  { id: "胸口", x: 84, y: 78, w: 72, h: 46, rx: 12 },
  { id: "腹部", x: 88, y: 126, w: 64, h: 46, rx: 12 },
  { id: "右肩", x: 58, y: 78, w: 24, h: 22, rx: 10 },
  { id: "左肩", x: 158, y: 78, w: 24, h: 22, rx: 10 },
  { id: "右上臂", x: 54, y: 102, w: 22, h: 54, rx: 11 },
  { id: "左上臂", x: 164, y: 102, w: 22, h: 54, rx: 11 },
  { id: "右前臂", x: 50, y: 158, w: 22, h: 54, rx: 11 },
  { id: "左前臂", x: 168, y: 158, w: 22, h: 54, rx: 11 },
  { id: "右手腕手背", x: 48, y: 214, w: 22, h: 30, rx: 10 },
  { id: "左手腕手背", x: 170, y: 214, w: 22, h: 30, rx: 10 },
  { id: "右大腿", x: 88, y: 174, w: 30, h: 74, rx: 14 },
  { id: "左大腿", x: 122, y: 174, w: 30, h: 74, rx: 14 },
  { id: "右小腿", x: 90, y: 250, w: 26, h: 68, rx: 12 },
  { id: "左小腿", x: 124, y: 250, w: 26, h: 68, rx: 12 },
  { id: "右腳踝腳背", x: 90, y: 320, w: 26, h: 26, rx: 10 },
  { id: "左腳踝腳背", x: 124, y: 320, w: 26, h: 26, rx: 10 },
];

// 背面圖中，本人的左邊就在畫面左側。
const BACK = [
  { id: "後頸", x: 106, y: 58, w: 28, h: 18, rx: 8 },
  { id: "左肩胛", x: 122, y: 80, w: 34, h: 40, rx: 12 },
  { id: "右肩胛", x: 84, y: 80, w: 34, h: 40, rx: 12 },
  { id: "背中脊椎", x: 108, y: 80, w: 24, h: 92, rx: 10 },
  { id: "下背腰", x: 88, y: 140, w: 64, h: 32, rx: 12 },
  { id: "臀部", x: 88, y: 174, w: 64, h: 36, rx: 14 },
  { id: "左大腿後側", x: 122, y: 212, w: 30, h: 62, rx: 14 },
  { id: "右大腿後側", x: 88, y: 212, w: 30, h: 62, rx: 14 },
  { id: "左小腿肚", x: 124, y: 276, w: 26, h: 64, rx: 12 },
  { id: "右小腿肚", x: 90, y: 276, w: 26, h: 64, rx: 12 },
];

// 背面圖的頭與手臂只當輪廓提示，不開放點選（要刺頭／手請在正面選）
const BACK_DECO = [
  { x: 96, y: 10, w: 48, h: 46, rx: 22 },
  { x: 54, y: 102, w: 22, h: 110, rx: 11 },
  { x: 164, y: 102, w: 22, h: 110, rx: 11 },
];

function BodyView({ title, regions, deco = [], height, picked, onPick }) {
  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox={`0 0 240 ${height}`}
        style={{ width: "100%", maxWidth: 220 }}
        role="group"
        aria-label={`${title}人體選位圖`}
      >
        {deco.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx}
            fill="#1f1b18" stroke="#2c2723" strokeWidth={1} pointerEvents="none" />
        ))}
        {regions.map((r) => {
          const on = picked === r.id;
          return (
            <g key={r.id} onClick={() => onPick(on ? null : r.id)} style={{ cursor: "pointer" }}>
              <rect
                x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx}
                fill={on ? "rgba(199,71,46,.55)" : "#282320"}
                stroke={on ? "#C7472E" : "#4a423c"}
                strokeWidth={on ? 2 : 1}
              >
                <title>{r.id}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <figcaption className="hint" style={{ letterSpacing: ".2em" }}>{title}</figcaption>
    </figure>
  );
}

export default function BodyPicker({ value, onChange }) {
  const [note, setNote] = useState("");

  function pick(id) {
    onChange(id ? { region: id, note } : null);
  }
  function updateNote(v) {
    setNote(v);
    if (value?.region) onChange({ region: value.region, note: v });
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          background: "#1c1917",
          border: "1px solid #332d29",
          borderRadius: 2,
          padding: "18px 10px 8px",
        }}
      >
        <BodyView title="正面" regions={FRONT} height={356} picked={value?.region} onPick={pick} />
        <BodyView title="背面" regions={BACK} deco={BACK_DECO} height={356} picked={value?.region} onPick={pick} />
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        點一下人形圖選位置（左右以<b>你自己身體</b>的左右為準）
        {value?.region ? (
          <>
            ・已選：<b style={{ color: "#EAE3D6" }}>{value.region}</b>
          </>
        ) : null}
      </p>
      <input
        type="text"
        placeholder="補充說明（選填）：內側／外側、大概位置…"
        value={note}
        maxLength={60}
        onChange={(e) => updateNote(e.target.value)}
        aria-label="部位補充說明"
      />
    </div>
  );
}
