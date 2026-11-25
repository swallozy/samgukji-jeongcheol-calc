/**
 * DB 없이 URL 쿼리 파라미터(?s=...)로 동맹 계산기 상태와 앵커 시각을 공유하기 위한 인코더/디코더
 */
import { LEVEL_BRACKET_PENALTIES, SEASON_META, SIEGE_TARGET_PRESETS } from '@jeongcheol/core';

function presetsMatchDefault(presets) {
  if (!Array.isArray(presets) || presets.length !== SIEGE_TARGET_PRESETS.length) return false;
  return presets.every((p, idx) => {
    const def = SIEGE_TARGET_PRESETS[idx];
    return (
      p &&
      p.id === def.id &&
      p.label === def.label &&
      p.category === def.category &&
      (p.level ?? null) === (def.level ?? null) &&
      Number(p.baseCost) === Number(def.baseCost)
    );
  });
}

function bracketsMatchDefault(brackets) {
  if (!Array.isArray(brackets) || brackets.length !== LEVEL_BRACKET_PENALTIES.length) return false;
  return brackets.every((b, idx) => {
    const def = LEVEL_BRACKET_PENALTIES[idx];
    return (
      b &&
      b.id === def.id &&
      Number(b.minLevel) === Number(def.minLevel) &&
      Number(b.maxLevel) === Number(def.maxLevel) &&
      Number(b.penalty) === Number(def.penalty)
    );
  });
}

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
  const compactRules = {
    connectionRuleActive: state.rules?.connectionRuleActive ?? true,
    allianceHasNoCities: state.rules?.allianceHasNoCities ?? false,
  };
  if (state.rules?.presets && !presetsMatchDefault(state.rules.presets)) {
    compactRules.presets = state.rules.presets;
  }
  if (state.rules?.brackets && !bracketsMatchDefault(state.rules.brackets)) {
    compactRules.brackets = state.rules.brackets;
  }

  const compact = {
    v: 1,
    an: state.allianceName,
    rn: state.routeName,
    tab: state.activeTab,
    as: state.anchorStock,
    at: state.anchorTimeMs,
    sync: state.autoSyncEnabled,
    hr: state.baseHourlyRate,
    cap: state.cap,
    tg: state.targetGoalAmount,
    tc: state.targetCheckTimeMs,
    b: state.boosts,
    r: compactRules,
    st: state.singleTarget,
    stt: state.singleTargetTimeMs,
    ev: state.events,
  };
  if (
    state.tickIntervalMinutes !== undefined &&
    state.tickIntervalMinutes !== (SEASON_META.tickIntervalMinutes ?? 5)
  ) {
    compact.ti = state.tickIntervalMinutes;
  }
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
