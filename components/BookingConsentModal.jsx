"use client";

import { useEffect, useState } from "react";

export default function BookingConsentModal({ open, type, onClose, onConfirm }) {
  const [checks, setChecks] = useState([false, false, false]);

  useEffect(() => {
    if (open) setChecks([false, false, false]);
  }, [open]);

  if (!open) return null;
  const allChecked = checks.every(Boolean);
  const isCustom = type === "custom";
  const specific = type === "claim"
    ? "我已閱讀並同意認領圖、50% 定金、改期、取消、遲到與作品使用規則。"
    : "我了解這次送出僅供米粒評估風格與可行性，尚未成立諮詢預約，也不需要付款。";

  function toggle(index) {
    setChecks((current) => current.map((value, i) => i === index ? !value : value));
  }

  return (
    <div className="consent-backdrop" role="presentation">
      <section className="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <p className="booking-notice-kicker">送出前的最後確認</p>
        <h3 id="consent-title" className="serif">一起確認這些重要事項</h3>
        <p className="consent-intro">{isCustom ? "確認完成後會送出初步評估資料，尚未成立諮詢預約。" : "確認完成後才會正式送出預約資料。"}</p>

        <label className="consent-item">
          <input type="checkbox" checked={checks[0]} onChange={() => toggle(0)} />
          <span>我已年滿 18 歲，並確認目前沒有懷孕。</span>
        </label>
        <label className="consent-item">
          <input type="checkbox" checked={checks[1]} onChange={() => toggle(1)} />
          <span>若有高血壓、B／C 型肝炎、HIV、心臟疾病、凝血問題、用藥或其他可能影響施作與傷口照顧的狀況，我會在預約前私下主動告知米粒。</span>
        </label>
        <label className="consent-item">
          <input type="checkbox" checked={checks[2]} onChange={() => toggle(2)} />
          <span>{specific}</span>
        </label>

        <div className="consent-actions">
          <button type="button" className="cta ghost" onClick={onClose}>返回修改</button>
          <button type="button" className="cta" disabled={!allChecked} onClick={onConfirm}>{isCustom ? "確認並送出評估" : "確認並送出預約"}</button>
        </div>
      </section>
    </div>
  );
}
