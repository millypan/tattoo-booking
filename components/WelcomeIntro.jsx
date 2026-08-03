"use client";

import { useEffect, useState } from "react";

export default function WelcomeIntro() {
  const [phase, setPhase] = useState("show");

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase("fade"), 1300);
    const removeTimer = window.setTimeout(() => setPhase("done"), 1750);

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
      aria-label="拾起光陰，刻下印記，即將開始你的旅程"
    >
      <div className="welcome-grain" aria-hidden="true" />
      <div className="welcome-halo" aria-hidden="true">
        <span className="welcome-orbit welcome-orbit-star">
          <span className="welcome-star">✦</span>
        </span>
        <span className="welcome-orbit welcome-orbit-diamond">
          <span className="welcome-diamond" />
        </span>
      </div>
      <div className="welcome-brand" aria-hidden="true">
        <span className="welcome-brand-cn serif">拾光印記所</span>
        <span className="welcome-brand-en">HALO SIGIL</span>
      </div>
      <p className="welcome-message serif">
        拾起光陰，刻下印記
        <span>即將開始你的旅程</span>
      </p>
    </div>
  );
}
