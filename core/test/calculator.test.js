import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IRONWORKS_LEVELS,
  SEASON_META,
  SIEGE_TARGET_PRESETS,
  calculateSiegeCost,
  calculateSingleSiege,
  calculateStockAtTime,
  calculateTargetReach,
  computeAutoEtaSchedule,
  resolveLiveAnchorStock,
  simulateTimeline,
  formatTimelineSummary,
  formatDuration,
} from '../src/index.js';

const BASE_TIME = Date.parse('2026-11-24T12:00:00+09:00');

test('W2 preset costs and ironworks levels match confirmed Korean server values', () => {
  const expected = {
    'city-4': 500,
    'city-6': 750,
    'city-8': 1000,
    'city-9': 1000,
    'city-10': 1500,
    'city-11': 1500,
    'gate-11': 1500,
    'city-13': 2000,
    'city-14': 2500,
    'city-15': 2500,
    'city-16': 3000,
    'city-18': 4500,
    'city-20': 6000,
  };

  for (const [id, cost] of Object.entries(expected)) {
    const preset = SIEGE_TARGET_PRESETS.find((p) => p.id === id);
    assert.ok(preset, `Preset ${id} should exist`);
    assert.equal(preset.baseCost, cost);
  }

  const lv2 = IRONWORKS_LEVELS.find((l) => l.level === 2);
  assert.ok(lv2);
  assert.equal(lv2.hourlyGain, 7);
  assert.equal(lv2.verified, true);
  assert.equal(SEASON_META.defaultCap, 10000);
  assert.equal(SEASON_META.defaultHourlyRate, 112);
});

test('calculateSiegeCost applies official level-bracket × distance rules, pre-phase, no-city rule, and enemy +50%', () => {
  // 4~8레벨: 500 per gap => 8레벨(1000) + 2칸 × 500 = 2000
  const lv8TwoHops = calculateSiegeCost({
    presetId: 'city-8',
    isConnected: false,
    distanceCount: 2,
  });
  assert.equal(lv8TwoHops.unitPenalty, 500);
  assert.equal(lv8TwoHops.penaltyCost, 1000);
  assert.equal(lv8TwoHops.totalCost, 2000);

  // 9~12레벨: 1500 per gap + 타 진영 시작지역(+50%) => (1500 + 1500) * 1.5 = 4500
  const lv10Enemy = calculateSiegeCost({
    presetId: 'city-10',
    isConnected: false,
    distanceCount: 1,
    isEnemyZone: true,
  });
  assert.equal(lv10Enemy.unitPenalty, 1500);
  assert.equal(lv10Enemy.penaltyCost, 1500);
  assert.equal(lv10Enemy.enemySurcharge, 1500);
  assert.equal(lv10Enemy.totalCost, 4500);

  // 13~20레벨: 3000 per gap => 16레벨(3000) + 2칸 × 3000 = 9000
  const lv16TwoHops = calculateSiegeCost({
    presetId: 'city-16',
    isConnected: false,
    distanceCount: 2,
  });
  assert.equal(lv16TwoHops.unitPenalty, 3000);
  assert.equal(lv16TwoHops.penaltyCost, 6000);
  assert.equal(lv16TwoHops.totalCost, 9000);

  // 규칙 1: 패업 [이릉의 결전] 단계 이전 => 연결 페널티 0
  const prePhase = calculateSiegeCost(
    { presetId: 'city-16', isConnected: false, distanceCount: 2 },
    { connectionRuleActive: false }
  );
  assert.equal(prePhase.penaltyCost, 0);
  assert.equal(prePhase.penaltyExemptReason, 'pre_phase');
  assert.equal(prePhase.totalCost, 3000);

  // 규칙 3: 동맹에 성지가 없을 경우 => 9레벨 이하만 점령 가능, 기본 수량만 소모
  const noCityLv9 = calculateSiegeCost(
    { presetId: 'city-9', isConnected: false, distanceCount: 3 },
    { allianceHasNoCities: true }
  );
  assert.equal(noCityLv9.penaltyCost, 0);
  assert.equal(noCityLv9.blockedByNoCityRule, false);
  assert.equal(noCityLv9.totalCost, 1000);

  const noCityLv11Blocked = calculateSiegeCost(
    { presetId: 'city-11', isConnected: false, distanceCount: 1 },
    { allianceHasNoCities: true }
  );
  assert.equal(noCityLv11Blocked.blockedByNoCityRule, true);
});

test('calculateSingleSiege computes exact wait time and storage cap overflow', () => {
  const result = calculateSingleSiege({
    currentStock: 800,
    baseHourlyRate: 112,
    cap: 10000,
    baseTime: BASE_TIME,
    targetTime: BASE_TIME + 7 * 3600000,
    target: { presetId: 'city-11', isConnected: true },
  });

  assert.equal(result.projectedStock, 1584);
  assert.equal(result.canAffordAtTarget, true);
  assert.equal(result.remainingAfterSiege, 84);
  assert.equal(result.earliest.status, 'wait');
  assert.equal(result.earliest.waitMs, 6.25 * 3600000);
  assert.equal(formatDuration(result.earliest.waitMs), '6시간 15분');

  const capped = calculateSingleSiege({
    currentStock: 9800,
    baseHourlyRate: 112,
    cap: 10000,
    baseTime: BASE_TIME,
    targetTime: BASE_TIME + 5 * 3600000,
    target: { presetId: 'city-4', isConnected: true },
  });
  assert.equal(capped.projectedStock, 10000);
  assert.equal(capped.overflowLoss, 360);
});

test('calculateSingleSiege accounts for scheduled Lv.2 ironworks rate increase (+7/h)', () => {
  const result = calculateSingleSiege({
    currentStock: 100,
    baseHourlyRate: 100,
    cap: 10000,
    baseTime: BASE_TIME,
    targetTime: BASE_TIME + 4 * 3600000,
    target: { presetId: 'city-4', isConnected: true },
    boosts: [
      {
        id: 'iw-2',
        level: 2,
        count: 1,
        effectiveAt: BASE_TIME + 2 * 3600000,
      },
    ],
  });

  assert.equal(result.projectedStock, 514);
  assert.equal(result.effectiveStartRate, 100);
  assert.equal(result.finalRate, 107);
});

test('computeAutoEtaSchedule calculates sequential shortest ETAs accurately', () => {
  const { simulation } = computeAutoEtaSchedule({
    currentStock: 3748,
    baseHourlyRate: 160,
    cap: 10000,
    baseTime: BASE_TIME,
    events: [
      { id: 'r1', name: '장안', presetId: 'city-8', isConnected: true },
      {
        id: 'r2',
        name: '업성',
        presetId: 'city-10',
        isConnected: false,
        distanceCount: 1,
        isEnemyZone: true,
      },
      {
        id: 'r3',
        name: '낙양',
        presetId: 'city-13',
        isConnected: true,
        isEnemyZone: true,
      },
    ],
  });

  assert.equal(simulation.steps.length, 3);
  assert.equal(simulation.summary.totalCost, 8500);
  assert.equal(formatDuration(simulation.steps[0].waitFromBaseMs), '지금 바로 가능');
  assert.equal(formatDuration(simulation.steps[1].waitFromBaseMs), '10시간 57분');
  assert.equal(formatDuration(simulation.steps[2].waitFromBaseMs), '1일 5시간 42분');
  assert.equal(simulation.summary.hasShortage, false);
});

test('simulateTimeline handles no-city transition from step 1 to step 2 and cap limits', () => {
  const sim = simulateTimeline({
    currentStock: 1200,
    baseHourlyRate: 112,
    cap: 10000,
    baseTime: BASE_TIME,
    rules: { connectionRuleActive: true, allianceHasNoCities: true },
    events: [
      {
        id: 'e1',
        name: '첫 6렙 성지 (무성지 면제)',
        presetId: 'city-6',
        isConnected: false,
        distanceCount: 2, // 무성지 상태라 0 추가, 기본 750만 소모
        scheduledAt: BASE_TIME + 2 * 3600000, // 1424 - 750 = 674
      },
      {
        id: 'e2',
        name: '2차 16렙 무연결 (성지 보유 후)',
        presetId: 'city-16',
        isConnected: false,
        distanceCount: 1, // 성지 1개 생긴 후라 3000 + 3000 = 6000
        scheduledAt: BASE_TIME + 5 * 3600000, // 674 + 336 = 1010 < 6000
      },
      {
        id: 'e3',
        name: '단일 상한 초과 테스트',
        presetId: 'city-20',
        isConnected: false,
        distanceCount: 2, // 6000 + 6000 = 12000 > 10000
        scheduledAt: BASE_TIME + 40 * 3600000,
      },
    ],
  });

  assert.equal(sim.steps[0].cost.totalCost, 750);
  assert.equal(sim.steps[0].cost.penaltyExemptReason, 'no_city');
  assert.equal(sim.steps[0].afterSpend, 674);

  assert.equal(sim.steps[1].cost.totalCost, 6000);
  assert.equal(sim.steps[1].affordable, false);
  assert.equal(sim.steps[1].deficit, 4990);

  assert.equal(sim.steps[2].exceedsCap, true);

  const summary = formatTimelineSummary(sim, { allianceName: '테스트맹' });
  assert.match(summary, /테스트맹 정철 공성 계획/);
  assert.match(summary, /성지 미보유 기본 소모/);
});

test('calculateTargetReach computes exact days/hours/minutes for target amount', () => {
  // 1500 -> 6000 at 112/h = 4500 / 112 = 40.17857h -> 1일 16시간 11분
  const reach = calculateTargetReach({
    currentStock: 1500,
    baseHourlyRate: 112,
    cap: 10000,
    baseTime: BASE_TIME,
    targetAmount: 6000,
  });

  assert.equal(reach.status, 'wait');
  assert.equal(reach.neededAmount, 4500);
  assert.equal(formatDuration(reach.waitMs), '1일 16시간 11분');

  // Already reached
  const ready = calculateTargetReach({
    currentStock: 6500,
    baseHourlyRate: 112,
    cap: 10000,
    baseTime: BASE_TIME,
    targetAmount: 6000,
  });
  assert.equal(ready.status, 'ready');
  assert.equal(ready.neededAmount, 0);

  // Exceeds cap
  const overCap = calculateTargetReach({
    currentStock: 1500,
    baseHourlyRate: 112,
    cap: 10000,
    baseTime: BASE_TIME,
    targetAmount: 12000,
  });
  assert.equal(overCap.status, 'exceeds_cap');
});

test('calculateStockAtTime projects accumulated stock and overflow at a target timestamp', () => {
  // 1500 + 24h * 112 = 1500 + 2688 = 4188
  const stock24h = calculateStockAtTime({
    currentStock: 1500,
    baseHourlyRate: 112,
    cap: 10000,
    baseTime: BASE_TIME,
    targetTime: BASE_TIME + 24 * 3600000,
  });
  assert.equal(stock24h.projectedStock, 4188);
  assert.equal(stock24h.netGain, 2688);
  assert.equal(stock24h.overflowLoss, 0);
  assert.equal(stock24h.reachedCap, false);

  // Near cap: 9000 + 12h * 112 = 10344 -> capped 10000, overflow 344
  const stockCap = calculateStockAtTime({
    currentStock: 9000,
    baseHourlyRate: 112,
    cap: 10000,
    baseTime: BASE_TIME,
    targetTime: BASE_TIME + 12 * 3600000,
  });
  assert.equal(stockCap.projectedStock, 10000);
  assert.equal(stockCap.netGain, 1000);
  assert.equal(stockCap.overflowLoss, 344);
  assert.equal(stockCap.reachedCap, true);
});

test('resolveLiveAnchorStock accumulates elapsed hourly production automatically (100 -> 400 after 2h at 150/h)', () => {
  const live = resolveLiveAnchorStock({
    anchorStock: 100,
    anchorTimeMs: BASE_TIME,
    nowMs: BASE_TIME + 2 * 3600000,
    baseHourlyRate: 150,
    cap: 10000,
  });

  assert.equal(live.currentStock, 400);
  assert.equal(live.accumulatedGain, 300);
  assert.equal(live.overflowLoss, 0);
  assert.equal(live.elapsedMs, 2 * 3600000);
});

test('resolveLiveAnchorStock mirrors 5-minute in-game ticks (820 -> 860 over 15m at 160/h)', () => {
  // 4m 59s -> still 0 ticks (820), next tick gain +13
  const beforeFirst = resolveLiveAnchorStock({
    anchorStock: 820,
    anchorTimeMs: BASE_TIME,
    nowMs: BASE_TIME + (4 * 60 + 59) * 1000,
    baseHourlyRate: 160,
    cap: 10000,
    tickIntervalMinutes: 5,
  });
  assert.equal(beforeFirst.completedTicks, 0);
  assert.equal(beforeFirst.currentStock, 820);
  assert.equal(beforeFirst.nextTickGain, 13);

  // 5m 00s -> tick 1 (+13 -> 833)
  const tick1 = resolveLiveAnchorStock({
    anchorStock: 820,
    anchorTimeMs: BASE_TIME,
    nowMs: BASE_TIME + 5 * 60000,
    baseHourlyRate: 160,
    cap: 10000,
    tickIntervalMinutes: 5,
  });
  assert.equal(tick1.completedTicks, 1);
  assert.equal(tick1.currentStock, 833);

  // 15m 00s -> tick 3 (+40 -> 860)
  const tick3 = resolveLiveAnchorStock({
    anchorStock: 820,
    anchorTimeMs: BASE_TIME,
    nowMs: BASE_TIME + 15 * 60000,
    baseHourlyRate: 160,
    cap: 10000,
    tickIntervalMinutes: 5,
  });
  assert.equal(tick3.completedTicks, 3);
  assert.equal(tick3.currentStock, 860);
});
