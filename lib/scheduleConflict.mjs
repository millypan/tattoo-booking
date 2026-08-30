const DEFAULT_DURATION_MINUTES = {
  諮詢: 120,
  刺青: 240,
  補色: 120,
  現場比圖: 60,
  "諮＋刺": 240,
};

export function scheduleTypeFromCategory(category) {
  if (category?.startsWith("諮＋刺")) return "諮＋刺";
  if (category?.startsWith("刺青")) return "刺青";
  if (category?.startsWith("諮詢")) return "諮詢";
  if (category === "補色" || category === "現場比圖") return category;
  return null;
}

export function cancellationScheduleStatus(cancellationType) {
  if (cancellationType === "當日未到") return "當日未到";
  if (cancellationType === "遲到視同取消") return "遲到取消";
  return "已取消";
}

export function minimalScheduleTitle(timeLabel, type, status = "預定") {
  if (!timeLabel || !type) return "";
  return status === "預定" ? `${timeLabel} ${type}` : `${timeLabel} ${type}｜${status}`;
}

export function scheduleInterval({ start, end, type }) {
  const startMs = new Date(start).getTime();
  if (!Number.isFinite(startMs) || !type) return null;
  const explicitEndMs = end ? new Date(end).getTime() : NaN;
  const fallbackMinutes = DEFAULT_DURATION_MINUTES[type] || 60;
  const endMs = Number.isFinite(explicitEndMs) && explicitEndMs > startMs
    ? explicitEndMs
    : startMs + fallbackMinutes * 60_000;
  return { startMs, endMs };
}

export function intervalsOverlap(a, b) {
  return Boolean(a && b && a.startMs < b.endMs && b.startMs < a.endMs);
}

export { DEFAULT_DURATION_MINUTES };
