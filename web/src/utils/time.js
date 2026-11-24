/**
 * datetime-local input용 로컬 시간 문자열("YYYY-MM-DDTHH:mm") 변환
 */
export function toLocalDateTimeInput(epochMs) {
  const date = new Date(Number.isFinite(epochMs) ? epochMs : Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/**
 * datetime-local 문자열을 epoch ms로 변환
 */
export function fromLocalDateTimeInput(value) {
  if (!value) return NaN;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

/**
 * 기준 시각으로부터 특정 시(hour, 예: 21시)의 오늘 또는 내일 epoch ms 구하기
 */
export function getNextClockHourMs(baseMs, targetHour, forceTomorrow = false) {
  const base = new Date(baseMs);
  const candidate = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    targetHour,
    0,
    0,
    0
  );
  if (forceTomorrow || candidate.getTime() <= baseMs) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.getTime();
}
