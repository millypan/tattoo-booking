import assert from "node:assert/strict";
import test from "node:test";
import {
  cancellationScheduleStatus,
  intervalsOverlap,
  minimalScheduleTitle,
  scheduleInterval,
  scheduleTypeFromCategory,
} from "../lib/scheduleConflict.mjs";

test("11:00 consultation and 13:00 tattoo can coexist", () => {
  const consultation = scheduleInterval({ start: "2026-08-26T11:00:00+08:00", type: "諮詢" });
  const tattoo = scheduleInterval({ start: "2026-08-26T13:00:00+08:00", type: "刺青" });
  assert.equal(intervalsOverlap(consultation, tattoo), false);
});

test("11:00 tattoo closes both 11:00 consultation and 13:00 tattoo slots", () => {
  const manualTattoo = scheduleInterval({ start: "2026-08-26T11:00:00+08:00", type: "刺青" });
  const consultation = scheduleInterval({ start: "2026-08-26T11:00:00+08:00", type: "諮詢" });
  const afternoonTattoo = scheduleInterval({ start: "2026-08-26T13:00:00+08:00", type: "刺青" });
  assert.equal(intervalsOverlap(manualTattoo, consultation), true);
  assert.equal(intervalsOverlap(manualTattoo, afternoonTattoo), true);
});

test("explicit end time overrides the default duration", () => {
  const shortTattoo = scheduleInterval({
    start: "2026-08-26T11:00:00+08:00",
    end: "2026-08-26T12:30:00+08:00",
    type: "刺青",
  });
  const afternoonTattoo = scheduleInterval({ start: "2026-08-26T13:00:00+08:00", type: "刺青" });
  assert.equal(intervalsOverlap(shortTattoo, afternoonTattoo), false);
});

test("booking categories map to their schedule types", () => {
  assert.equal(scheduleTypeFromCategory("諮詢｜已付押金"), "諮詢");
  assert.equal(scheduleTypeFromCategory("刺青｜已付定金"), "刺青");
  assert.equal(scheduleTypeFromCategory("諮＋刺（NT）｜已收押金"), "諮＋刺");
});

test("cancellation types map to minimal calendar statuses", () => {
  assert.equal(cancellationScheduleStatus("事前取消"), "已取消");
  assert.equal(cancellationScheduleStatus("當日未到"), "當日未到");
  assert.equal(cancellationScheduleStatus("遲到視同取消"), "遲到取消");
  assert.equal(cancellationScheduleStatus(null), "已取消");
});

test("cancelled schedules retain their time and add a visible status", () => {
  assert.equal(minimalScheduleTitle("13:00", "諮詢"), "13:00 諮詢");
  assert.equal(minimalScheduleTitle("13:00", "諮詢", "已取消"), "13:00 諮詢｜已取消");
  assert.equal(minimalScheduleTitle("11:00", "刺青", "當日未到"), "11:00 刺青｜當日未到");
  assert.equal(minimalScheduleTitle("15:30", "刺青", "遲到取消"), "15:30 刺青｜遲到取消");
});
