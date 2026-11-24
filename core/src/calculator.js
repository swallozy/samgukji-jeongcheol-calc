import {
  ENEMY_ZONE_MULTIPLIER,
  IRONWORKS_LEVELS,
  LEVEL_BRACKET_PENALTIES,
  SEASON_META,
  SIEGE_TARGET_PRESETS,
} from './w2Data.js';

const HOUR_MS = 3600000;
const MINUTE_MS = 60000;

/**
 * 시각 값을 안전하게 epoch ms로 변환합니다.
 * @param {number|string|Date} value
 * @returns {number}
 */
export function toEpochMs(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value);
  return NaN;
}

/**
 * 음수/NaN 방지용 유한 숫자 정규화 헬퍼
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
export function clampNonNegative(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return num;
}

/**
 * 목표 성지·관문 레벨에 해당하는 거리 간격당 정철 증가 수치를 찾습니다.
 * (4~8레벨: 500, 9~12레벨: 1,500, 13~20레벨: 3,000)
 * @param {number|null|undefined} level
 * @param {Array<{ minLevel: number, maxLevel: number, penalty: number }>} brackets
 * @returns {{ unitCost: number, bracketLabel: string | null }}
 */
export function findBracketPenalty(level, brackets = LEVEL_BRACKET_PENALTIES) {
  const lvl = Number(level);
  if (!Number.isFinite(lvl) || lvl <= 0) {
    return { unitCost: 0, bracketLabel: null };
  }
  const matched = brackets.find((b) => lvl >= Number(b.minLevel) && lvl <= Number(b.maxLevel));
  if (!matched) return { unitCost: 0, bracketLabel: null };
  return {
    unitCost: clampNonNegative(matched.penalty, 0),
    bracketLabel: matched.label || `${matched.minLevel}~${matched.maxLevel}레벨`,
  };
}

/**
 * 목표(공성지/관문/커스텀 시설)의 총 정철 소모량을 계산합니다.
 *
 * 인게임 [성지 연결 규칙]:
 * 1. 패업 [이릉의 결전] 단계부터 성지 연결 메커니즘 적용
 * 2. 관로 경로 기준 인접하지 않을 경우: 목표 레벨 구간 단가 × 거리 간격(칸 수) 추가 소모
 * 3. 동맹 보유 성지 0개 시: 9레벨 이하만 점령 가능하며 기본 수량만 소모
 *
 * @param {object} target
 * @param {object} [rules] 사용자 편집 기준표 및 동맹 상태 옵션
 */
export function calculateSiegeCost(target = {}, rules = {}) {
  const presets = rules.presets ?? SIEGE_TARGET_PRESETS;
  const brackets = rules.brackets ?? LEVEL_BRACKET_PENALTIES;

  const preset =
    presets.find((item) => item.id === target.presetId) ??
    presets[presets.length - 1] ??
    SIEGE_TARGET_PRESETS[SIEGE_TARGET_PRESETS.length - 1];

  const useCustomBase =
    target.presetId === 'custom' ||
    (target.customBaseCost !== undefined &&
      target.customBaseCost !== null &&
      target.customBaseCost !== '');

  const baseCost = useCustomBase
    ? clampNonNegative(target.customBaseCost, preset.baseCost)
    : preset.baseCost;

  const effectiveLevel =
    target.customLevel !== undefined && target.customLevel !== null && target.customLevel !== ''
      ? Number(target.customLevel)
      : preset.level;

  // 전역 상태(rules) 또는 개별 target의 성지 연결 규칙 활성화/보유 성지 유무 반영
  const connectionRuleActive =
    target.connectionRuleActive ?? rules.connectionRuleActive ?? true;
  const allianceHasNoCities =
    target.allianceHasNoCities ?? rules.allianceHasNoCities ?? false;

  const blockedByNoCityRule =
    allianceHasNoCities &&
    Number.isFinite(Number(effectiveLevel)) &&
    Number(effectiveLevel) > SEASON_META.noCityMaxLevel;

  const isConnected = target.isConnected !== false;
  const bracketInfo = findBracketPenalty(effectiveLevel, brackets);

  const hasCustomUnitOverride =
    target.customUnitPenalty !== undefined &&
    target.customUnitPenalty !== null &&
    target.customUnitPenalty !== '';

  const unitPenalty = hasCustomUnitOverride
    ? clampNonNegative(target.customUnitPenalty, bracketInfo.unitCost)
    : bracketInfo.unitCost;

  const distanceCount = isConnected
    ? 0
    : Math.max(1, Math.floor(clampNonNegative(target.distanceCount, 1)));

  // 규칙 1([이릉의 결전] 전) 또는 규칙 3(동맹 성지 없음)이면 추가 거리 페널티 미적용
  const penaltyExemptReason = allianceHasNoCities
    ? 'no_city'
    : !connectionRuleActive
    ? 'pre_phase'
    : null;

  const penaltyCost =
    isConnected || penaltyExemptReason !== null ? 0 : distanceCount * unitPenalty;

  const isEnemyZone = target.isEnemyZone === true;
  const subtotalBeforeEnemy = baseCost + penaltyCost;
  const enemySurcharge = isEnemyZone
    ? Math.round(subtotalBeforeEnemy * (ENEMY_ZONE_MULTIPLIER - 1))
    : 0;
  const extraCost = clampNonNegative(target.extraCost, 0);

  return {
    presetLabel: target.name?.trim() || preset.label,
    level: effectiveLevel ?? null,
    bracketLabel: bracketInfo.bracketLabel,
    baseCost,
    penaltyCost,
    unitPenalty,
    distanceCount,
    isConnected,
    connectionRuleActive,
    allianceHasNoCities,
    penaltyExemptReason,
    blockedByNoCityRule,
    isEnemyZone,
    enemySurcharge,
    extraCost,
    totalCost: subtotalBeforeEnemy + enemySurcharge + extraCost,
  };
}

/**
 * 제철소/추가 생산 계획 목록을 정규화된 시간별 변동 이벤트 배열로 정리합니다.
 */
export function buildRateSchedule(boosts = [], baseTimeMs) {
  let immediateBoost = 0;
  const scheduledChanges = [];

  for (const boost of boosts) {
    if (boost?.enabled === false) continue;

    let hourlyDelta = 0;
    if (boost.hourlyDelta !== undefined && boost.hourlyDelta !== null && boost.hourlyDelta !== '') {
      hourlyDelta = Number(boost.hourlyDelta);
    } else if (boost.level) {
      const found = IRONWORKS_LEVELS.find((lvl) => lvl.level === Number(boost.level));
      hourlyDelta = found ? found.hourlyGain : 0;
    }

    if (!Number.isFinite(hourlyDelta) || hourlyDelta === 0) continue;

    const count = Math.max(1, Math.floor(clampNonNegative(boost.count, 1)));
    const totalDelta = hourlyDelta * count;
    const effectiveMs = boost.effectiveAt ? toEpochMs(boost.effectiveAt) : NaN;

    if (!Number.isFinite(effectiveMs) || effectiveMs <= baseTimeMs) {
      immediateBoost += totalDelta;
    } else {
      scheduledChanges.push({
        timeMs: effectiveMs,
        delta: totalDelta,
        label: boost.label || `제철소 ${boost.level || ''}렙 ×${count}`.trim(),
      });
    }
  }

  scheduledChanges.sort((a, b) => a.timeMs - b.timeMs);
  return { immediateBoost, scheduledChanges };
}

/**
 * [startMs, endMs] 구간 동안 보유 상한과 구간별 생산량 변화를 반영해
 * 최종 보유량과 상한 초과로 증발한 손실량을 계산합니다.
 */
function advanceStock({
  startMs,
  endMs,
  initialStock,
  initialRate,
  cap,
  scheduledChanges,
}) {
  if (endMs <= startMs) {
    const clamped = Math.min(cap, initialStock);
    return {
      stock: clamped,
      overflow: Math.max(0, initialStock - clamped),
      finalRate: initialRate,
    };
  }

  let cursorMs = startMs;
  let stock = Math.min(cap, initialStock);
  let overflow = Math.max(0, initialStock - stock);
  let currentRate = initialRate;

  for (const change of scheduledChanges) {
    if (change.timeMs <= startMs) {
      currentRate = Math.max(0, currentRate + change.delta);
      continue;
    }
    if (change.timeMs >= endMs) break;

    if (change.timeMs > cursorMs) {
      const elapsedHours = (change.timeMs - cursorMs) / HOUR_MS;
      const gained = currentRate * elapsedHours;
      const nextRaw = stock + gained;
      if (nextRaw > cap) {
        overflow += nextRaw - cap;
        stock = cap;
      } else {
        stock = nextRaw;
      }
      cursorMs = change.timeMs;
    }
    currentRate = Math.max(0, currentRate + change.delta);
  }

  if (endMs > cursorMs) {
    const elapsedHours = (endMs - cursorMs) / HOUR_MS;
    const gained = currentRate * elapsedHours;
    const nextRaw = stock + gained;
    if (nextRaw > cap) {
      overflow += nextRaw - cap;
      stock = cap;
    } else {
      stock = nextRaw;
    }
  }

  return { stock, overflow, finalRate: currentRate };
}

/**
 * 현재 시점 startMs, 보유량 initialStock에서 목표 비용 requiredCost에
 * 가장 먼저 도달하는 시각(epoch ms)을 반환합니다.
 */
export function findEarliestAffordableTime({
  startMs,
  initialStock,
  initialRate,
  cap,
  requiredCost,
  scheduledChanges = [],
}) {
  if (requiredCost <= initialStock) {
    return { status: 'ready', timeMs: startMs, waitMs: 0 };
  }
  if (requiredCost > cap) {
    return { status: 'exceeds_cap', timeMs: null, waitMs: null };
  }

  let cursorMs = startMs;
  let stock = Math.min(cap, initialStock);
  let currentRate = initialRate;

  for (const change of scheduledChanges) {
    if (change.timeMs <= startMs) {
      currentRate = Math.max(0, currentRate + change.delta);
      continue;
    }
    const segHours = (change.timeMs - cursorMs) / HOUR_MS;
    const segGain = currentRate * segHours;

    if (currentRate > 0 && stock + segGain >= requiredCost) {
      const neededHours = (requiredCost - stock) / currentRate;
      const reachMs = Math.ceil(cursorMs + neededHours * HOUR_MS);
      return { status: 'wait', timeMs: reachMs, waitMs: reachMs - startMs };
    }

    stock = Math.min(cap, stock + segGain);
    cursorMs = change.timeMs;
    currentRate = Math.max(0, currentRate + change.delta);
  }

  if (currentRate <= 0) {
    return { status: 'no_production', timeMs: null, waitMs: null };
  }

  const neededHours = (requiredCost - stock) / currentRate;
  const reachMs = Math.ceil(cursorMs + neededHours * HOUR_MS);
  return { status: 'wait', timeMs: reachMs, waitMs: reachMs - startMs };
}

/**
 * 단건 공성 계산기
 */
export function calculateSingleSiege({
  currentStock = 0,
  baseHourlyRate = SEASON_META.defaultHourlyRate,
  cap = SEASON_META.defaultCap,
  baseTime = Date.now(),
  targetTime,
  target = {},
  boosts = [],
  rules = {},
} = {}) {
  const baseMs = toEpochMs(baseTime);
  const targetMs = targetTime ? toEpochMs(targetTime) : baseMs;
  const safeCap = Math.max(1, clampNonNegative(cap, SEASON_META.defaultCap));
  const safeStock = Math.min(safeCap, clampNonNegative(currentStock, 0));
  const safeBaseRate = clampNonNegative(baseHourlyRate, 0);

  const { immediateBoost, scheduledChanges } = buildRateSchedule(boosts, baseMs);
  const effectiveStartRate = Math.max(0, safeBaseRate + immediateBoost);

  const cost = calculateSiegeCost(target, rules);
  const isInvalidTargetTime = !Number.isFinite(targetMs) || targetMs < baseMs;
  const evalEndMs = isInvalidTargetTime ? baseMs : targetMs;

  const { stock: exactProjected, overflow, finalRate } = advanceStock({
    startMs: baseMs,
    endMs: evalEndMs,
    initialStock: safeStock,
    initialRate: effectiveStartRate,
    cap: safeCap,
    scheduledChanges,
  });

  const projectedStock = Math.floor(exactProjected);
  const overflowLoss = Math.floor(overflow);
  const remainingAfterSiege = projectedStock - cost.totalCost;
  const deficit = Math.max(0, cost.totalCost - projectedStock);

  const earliest = findEarliestAffordableTime({
    startMs: baseMs,
    initialStock: safeStock,
    initialRate: effectiveStartRate,
    cap: safeCap,
    requiredCost: cost.totalCost,
    scheduledChanges,
  });

  return {
    baseTimeMs: baseMs,
    targetTimeMs: evalEndMs,
    isInvalidTargetTime,
    currentStock: safeStock,
    cap: safeCap,
    effectiveStartRate,
    finalRate,
    cost,
    projectedStock,
    exactProjected,
    overflowLoss,
    canAffordAtTarget: remainingAfterSiege >= 0,
    remainingAfterSiege,
    deficit,
    earliest,
  };
}

/**
 * 연쇄 공성 타임라인 시뮬레이터
 * 첫 번째 성지를 점령하고 나면(step 0 이후) 동맹에 성지가 1개 이상 생기므로
 * allianceHasNoCities는 첫 유효 단계에만 적용되고 이후 단계부터는 성지 연결 규칙이 적용됩니다.
 */
export function simulateTimeline({
  currentStock = 0,
  baseHourlyRate = SEASON_META.defaultHourlyRate,
  cap = SEASON_META.defaultCap,
  baseTime = Date.now(),
  events = [],
  boosts = [],
  rules = {},
  preserveOrder = false,
} = {}) {
  const baseMs = toEpochMs(baseTime);
  const safeCap = Math.max(1, clampNonNegative(cap, SEASON_META.defaultCap));
  const safeStock = Math.min(safeCap, clampNonNegative(currentStock, 0));
  const safeBaseRate = clampNonNegative(baseHourlyRate, 0);

  const { immediateBoost, scheduledChanges } = buildRateSchedule(boosts, baseMs);
  const effectiveStartRate = Math.max(0, safeBaseRate + immediateBoost);

  const mappedEvents = events
    .filter((ev) => ev && ev.enabled !== false)
    .map((ev, index) => {
      const scheduledMs = toEpochMs(ev.scheduledAt);
      return {
        ...ev,
        originalIndex: index,
        scheduledMs: Number.isFinite(scheduledMs) ? scheduledMs : baseMs,
      };
    });

  const normalizedEvents = preserveOrder
    ? mappedEvents
    : [...mappedEvents].sort((a, b) => a.scheduledMs - b.scheduledMs || a.originalIndex - b.originalIndex);

  let cursorMs = baseMs;
  let stock = safeStock;
  let currentRate = effectiveStartRate;
  let totalCost = 0;
  let totalOverflow = 0;
  let hasShortage = false;
  let hasCapExceed = false;
  let hasNoCityRuleBlock = false;
  let hasAllianceCityYet = !(rules.allianceHasNoCities ?? false);

  const steps = normalizedEvents.map((ev) => {
    const isBeforeBase = ev.scheduledMs < baseMs;
    const stepEndMs = Math.max(cursorMs, ev.scheduledMs);
    const stepRules = {
      ...rules,
      allianceHasNoCities: !hasAllianceCityYet,
    };
    const cost = calculateSiegeCost(ev, stepRules);

    const earliest = findEarliestAffordableTime({
      startMs: cursorMs,
      initialStock: stock,
      initialRate: currentRate,
      cap: safeCap,
      requiredCost: cost.totalCost,
      scheduledChanges,
    });

    const advanced = advanceStock({
      startMs: cursorMs,
      endMs: stepEndMs,
      initialStock: stock,
      initialRate: currentRate,
      cap: safeCap,
      scheduledChanges,
    });

    const exactBeforeSpend = advanced.stock;
    const availableBeforeSpend = Math.floor(exactBeforeSpend);
    const overflowOnLeg = Math.floor(advanced.overflow);
    const deficit = Math.max(0, cost.totalCost - availableBeforeSpend);
    const affordable = deficit === 0;
    const exceedsCap = cost.totalCost > safeCap;

    const exactAfterSpend = affordable
      ? Math.max(0, exactBeforeSpend - cost.totalCost)
      : 0;
    const afterSpend = affordable ? availableBeforeSpend - cost.totalCost : 0;

    if (!affordable) hasShortage = true;
    if (exceedsCap) hasCapExceed = true;
    if (cost.blockedByNoCityRule) hasNoCityRuleBlock = true;

    // 첫 성지 점령 성공(규칙 위반 아님) 이후에는 동맹이 성지를 보유한 것으로 간주
    if (!cost.blockedByNoCityRule) {
      hasAllianceCityYet = true;
    }

    totalCost += cost.totalCost;
    totalOverflow += overflowOnLeg;

    cursorMs = stepEndMs;
    stock = exactAfterSpend;
    currentRate = advanced.finalRate;

    return {
      id: ev.id ?? `step-${ev.originalIndex}`,
      scheduledMs: ev.scheduledMs,
      waitFromBaseMs: Math.max(0, stepEndMs - baseMs),
      isBeforeBase,
      cost,
      rateAtStep: currentRate,
      availableBeforeSpend,
      overflowOnLeg,
      affordable,
      exceedsCap,
      deficit,
      afterSpend,
      earliest,
    };
  });

  const timeToFull = findEarliestAffordableTime({
    startMs: cursorMs,
    initialStock: stock,
    initialRate: currentRate,
    cap: safeCap,
    requiredCost: safeCap,
    scheduledChanges,
  });

  return {
    baseTimeMs: baseMs,
    currentStock: safeStock,
    cap: safeCap,
    effectiveStartRate,
    finalRate: currentRate,
    scheduledChanges,
    steps,
    summary: {
      stepCount: steps.length,
      totalCost,
      totalOverflow,
      hasShortage,
      hasCapExceed,
      hasNoCityRuleBlock,
      hasAnyOverflow: totalOverflow > 0,
      finalStock: Math.floor(stock),
      totalWaitMs: steps.length > 0 ? steps[steps.length - 1].waitFromBaseMs : 0,
      timeToFull,
    },
  };
}

/**
 * 입력된 공성 루트 순서대로 "정철이 모이는 즉시" 진행할 때의
 * 최적(최단) 시작 시각(scheduledAt)을 자동 계산해 반환합니다.
 */
export function computeAutoEtaSchedule({
  currentStock = 0,
  baseHourlyRate = SEASON_META.defaultHourlyRate,
  cap = SEASON_META.defaultCap,
  baseTime = Date.now(),
  events = [],
  boosts = [],
  rules = {},
} = {}) {
  const baseMs = toEpochMs(baseTime);
  const safeCap = Math.max(1, clampNonNegative(cap, SEASON_META.defaultCap));
  const safeStock = Math.min(safeCap, clampNonNegative(currentStock, 0));
  const safeBaseRate = clampNonNegative(baseHourlyRate, 0);

  const { immediateBoost, scheduledChanges } = buildRateSchedule(boosts, baseMs);
  let cursorMs = baseMs;
  let stock = safeStock;
  let currentRate = Math.max(0, safeBaseRate + immediateBoost);
  let hasAllianceCityYet = !(rules.allianceHasNoCities ?? false);

  const scheduledEvents = events.map((ev) => {
    if (!ev || ev.enabled === false) return ev;
    const cost = calculateSiegeCost(ev, {
      ...rules,
      allianceHasNoCities: !hasAllianceCityYet,
    });
    if (!cost.blockedByNoCityRule) hasAllianceCityYet = true;

    const earliest = findEarliestAffordableTime({
      startMs: cursorMs,
      initialStock: stock,
      initialRate: currentRate,
      cap: safeCap,
      requiredCost: cost.totalCost,
      scheduledChanges,
    });

    if (earliest.timeMs !== null) {
      const advanced = advanceStock({
        startMs: cursorMs,
        endMs: earliest.timeMs,
        initialStock: stock,
        initialRate: currentRate,
        cap: safeCap,
        scheduledChanges,
      });
      cursorMs = earliest.timeMs;
      stock = Math.max(0, advanced.stock - cost.totalCost);
      currentRate = advanced.finalRate;
      return { ...ev, scheduledAt: earliest.timeMs };
    }

    return { ...ev, scheduledAt: cursorMs };
  });

  return {
    events: scheduledEvents,
    simulation: simulateTimeline({
      currentStock: safeStock,
      baseHourlyRate: safeBaseRate,
      cap: safeCap,
      baseTime: baseMs,
      events: scheduledEvents,
      boosts,
      rules,
      preserveOrder: true,
    }),
  };
}

/**
 * 한국 시간(KST) 기준 읽기 편한 날짜/시각 문자열 포맷터
 */
export function formatDateTimeKST(epochMs) {
  if (!Number.isFinite(epochMs)) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(epochMs));
}

/**
 * 대기 시간을 'N일 M시간 K분' 형식으로 변환
 */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '지금 바로 가능';
  const totalMinutes = Math.ceil(ms / MINUTE_MS);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}일`);
  if (hours > 0) parts.push(`${hours}시간`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}분`);
  return parts.join(' ');
}

/**
 * 디스코드/카카오톡 공지 복붙용 텍스트 요약 생성 (웹 + 디스코드 봇 공용)
 */
export function formatTimelineSummary(sim, { allianceName = '동맹', seasonName = SEASON_META.name } = {}) {
  const lines = [];
  lines.push(`[${seasonName}] ${allianceName} 정철 공성 계획`);
  lines.push(
    `• 기준(${formatDateTimeKST(sim.baseTimeMs)}): 보유 ${sim.currentStock.toLocaleString()} / 상한 ${sim.cap.toLocaleString()} · 생산 +${sim.effectiveStartRate}/시간`
  );

  if (sim.steps.length === 0) {
    lines.push('• 등록된 공성 일정이 없습니다.');
    return lines.join('\n');
  }

  lines.push('');
  sim.steps.forEach((step, idx) => {
    const statusTag = step.cost.blockedByNoCityRule
      ? '🚫 무성지 9렙 제한 초과'
      : step.exceedsCap
      ? '❌ 상한 초과'
      : step.affordable
      ? '✅ 가능'
      : `⚠️ ${step.deficit.toLocaleString()} 부족`;

    const tags = [];
    if (step.cost.penaltyExemptReason === 'no_city') {
      tags.push('성지 미보유 기본 소모');
    } else if (step.cost.penaltyExemptReason === 'pre_phase') {
      tags.push('이릉의 결전 이전(연결 미적용)');
    } else if (step.cost.isConnected) {
      tags.push('관로 연결');
    } else {
      tags.push(`관로 미연결 ${step.cost.distanceCount}칸 +${step.cost.penaltyCost.toLocaleString()}`);
    }
    if (step.cost.isEnemyZone) {
      tags.push(`타 진영 +50% (+${step.cost.enemySurcharge.toLocaleString()})`);
    }

    lines.push(
      `${idx + 1}. [${formatDateTimeKST(step.scheduledMs)}] ${step.cost.presetLabel} | 필요 ${step.cost.totalCost.toLocaleString()} (${tags.join(', ')}) → ${statusTag}`
    );

    if (step.affordable) {
      lines.push(
        `   └ 예상 보유 ${step.availableBeforeSpend.toLocaleString()} → 소모 후 잔여 ${step.afterSpend.toLocaleString()}` +
          (step.overflowOnLeg > 0 ? ` (상한 손실 -${step.overflowOnLeg.toLocaleString()})` : '')
      );
    } else if (step.earliest?.timeMs) {
      lines.push(
        `   └ 현재 예상 ${step.availableBeforeSpend.toLocaleString()} (최소 ${formatDateTimeKST(step.earliest.timeMs)}부터 가능)`
      );
    }
  });

  lines.push('');
  lines.push(
    `• 총 소모: ${sim.summary.totalCost.toLocaleString()} | 최종 잔여: ${sim.summary.finalStock.toLocaleString()}` +
      (sim.summary.totalOverflow > 0
        ? ` | 상한 손실 총 ${sim.summary.totalOverflow.toLocaleString()}`
        : '')
  );

  return lines.join('\n');
}
