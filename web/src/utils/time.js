/**
 * 로컬 시간 기준 날짜 문자열("YYYY-MM-DD") 변환
 */
export function toLocalDateInput(epochMs) {
  const date = new Date(Number.isFinite(epochMs) ? epochMs : Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * datetime-local input용 로컬 시간 문자열("YYYY-MM-DDTHH:mm") 변환
 */
export function toLocalDateTimeInput(epochMs) {
  const date = new Date(Number.isFinite(epochMs) ? epochMs : Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  return `${toLocalDateInput(date.getTime())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 날짜/시간 값을 분 단위 내림(정시 비교용)
 */
export function floorToMinute(epochMs) {
  return Math.floor((Number.isFinite(epochMs) ? epochMs : Date.now()) / 60000) * 60000;
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

/**
 * 날짜("YYYY-MM-DD")와 시·분을 합쳐 epoch ms 생성
 */
export function buildDateTimeMs(dateStr, hours, minutes) {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d, hours, minutes, 0, 0).getTime();
}

/**
 * minTimeMs 미만으로 내려가지 않도록 보정
 */
export function clampTimeWithMin(candidateMs, minTimeMs) {
  if (!Number.isFinite(candidateMs)) return minTimeMs ?? Date.now();
  if (Number.isFinite(minTimeMs) && candidateMs < minTimeMs) {
    return minTimeMs;
  }
  return candidateMs;
}
