"use client";

import { useEffect, useState } from "react";

export default function WelcomeIntro() {
  const [phase, setPhase] = useState("show");

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase("fade"), 1600);
    const removeTimer = window.setTimeout(() => setPhase("done"), 2150);

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
      <div className="welcome-shape welcome-circle" aria-hidden="true" />
      <div className="welcome-shape welcome-square" aria-hidden="true" />
      <div className="welcome-shape welcome-line" aria-hidden="true" />
      <p className="welcome-kicker">HALO SIGIL</p>
      <p className="welcome-message serif">
        歡迎來到拾光印記所
        <span>即將開始你的旅程</span>
      </p>
    </div>
  );
}
