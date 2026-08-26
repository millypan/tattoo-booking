import assert from "node:assert/strict";
import test from "node:test";
import { intervalsOverlap, scheduleInterval, scheduleTypeFromCategory } from "../lib/scheduleConflict.mjs";

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
