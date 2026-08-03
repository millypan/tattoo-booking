"use client";

import { useEffect, useState } from "react";

export default function WelcomeIntro() {
  const [phase, setPhase] = useState("show");

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase("fade"), 1750);
    const removeTimer = window.setTimeout(() => setPhase("done"), 2350);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`welcome-intro ${phase === "fade" ? "is-fading" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="歡迎來到拾光印記所，即將開始你的旅程"
    >
      <div className="welcome-grain" aria-hidden="true" />
      <div className="welcome-halo" aria-hidden="true">
        <span className="welcome-star">✦</span>
        <span className="welcome-diamond" />
      </div>
      <div className="welcome-brand" aria-hidden="true">
        <span className="welcome-brand-cn serif">拾光印記所</span>
        <span className="welcome-brand-en">HALO SIGIL</span>
      </div>
      <p className="welcome-message serif">
        歡迎來到拾光印記所
        <span>即將開始你的旅程</span>
      </p>
    </div>
  );
}
