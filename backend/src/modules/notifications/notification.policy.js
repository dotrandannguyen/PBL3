export const buildSchedulePoints = (baseTime, reminders = []) => {
  const now = new Date();

  // Không có reminder → return luôn
  if (!Array.isArray(reminders) || reminders.length === 0) {
    return [];
  }

  const seenOffsets = new Set();

  const result = reminders
    .map((item) => {
      const { phase = "CUSTOM", offset } = item;

      // validate offset
      if (typeof offset !== "number" || isNaN(offset)) {
        return null;
      }

      // giới hạn: ±7 ngày (tùy m chỉnh)
      if (offset < -10080 || offset > 10080) {
        return null;
      }

      // tránh duplicate offset
      if (seenOffsets.has(offset)) {
        return null;
      }
      seenOffsets.add(offset);

      const runAt = new Date(baseTime.getTime() + offset * 60000);

      // bỏ các mốc đã qua
      if (runAt <= now) {
        return null;
      }

      return {
        phase,
        offset,
        runAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.runAt - b.runAt);

  return result;
};