/**
 * DB 없이 URL 쿼리 파라미터(?s=...)로 동맹 계산기 상태와 앵커 시각을 공유하기 위한 인코더/디코더
 */

function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeShareState(state) {
  const compact = {
    v: 1,
    an: state.allianceName,
    rn: state.routeName,
    tab: state.activeTab,
    as: state.anchorStock,
    at: state.anchorTimeMs,
    sync: state.autoSyncEnabled,
    ti: state.tickIntervalMinutes,
    hr: state.baseHourlyRate,
    cap: state.cap,
    tg: state.targetGoalAmount,
    tc: state.targetCheckTimeMs,
    b: state.boosts,
    r: state.rules,
    st: state.singleTarget,
    stt: state.singleTargetTimeMs,
    ev: state.events,
  };
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  return toBase64Url(bytes);
}

export function decodeShareState(encoded) {
  if (!encoded || typeof encoded !== 'string') return null;
  try {
    const bytes = fromBase64Url(encoded.trim());
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    if (!data || data.v !== 1) return null;

    return {
      allianceName: data.an,
      routeName: data.rn,
      activeTab: data.tab,
      anchorStock: data.as,
      anchorTimeMs: data.at,
      autoSyncEnabled: data.sync,
      tickIntervalMinutes: data.ti,
      baseHourlyRate: data.hr,
      cap: data.cap,
      targetGoalAmount: data.tg,
      targetCheckTimeMs: data.tc,
      boosts: Array.isArray(data.b) ? data.b : undefined,
      rules: data.r,
      singleTarget: data.st,
      singleTargetTimeMs: data.stt,
      events: Array.isArray(data.ev) ? data.ev : undefined,
    };
  } catch {
    return null;
  }
}
