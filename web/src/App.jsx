import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calculator,
  CalendarRange,
  Check,
  Link2,
  RotateCcw,
  Shield,
} from 'lucide-react';
import {
  buildRateSchedule,
  calculateStockAtTime,
  calculateTargetReach,
  computeAutoEtaSchedule,
  findEarliestAffordableTime,
  LEVEL_BRACKET_PENALTIES,
  resolveLiveAnchorStock,
  SEASON_META,
  SIEGE_TARGET_PRESETS,
  simulateTimeline,
} from '@jeongcheol/core';
import { StatusPanel } from './components/StatusPanel.jsx';
import { IronworksPlanner } from './components/IronworksPlanner.jsx';
import { QuickCalculator } from './components/QuickCalculator.jsx';
import { TimelinePlanner } from './components/TimelinePlanner.jsx';
import { ShareSummaryCard } from './components/ShareSummaryCard.jsx';
import { ReferenceModal } from './components/ReferenceModal.jsx';
import { decodeShareState, encodeShareState } from './utils/shareLink.js';

const STORAGE_KEY = 'samgukji-w2-jeongcheol-calc:v4';
const LEGACY_V3_KEY = 'samgukji-w2-jeongcheol-calc:v3';

function createDefaultRules() {
  return {
    presets: SIEGE_TARGET_PRESETS.map((item) => ({ ...item })),
    brackets: LEVEL_BRACKET_PENALTIES.map((item) => ({ ...item })),
    connectionRuleActive: true,
    allianceHasNoCities: false,
  };
}

function createInitialState(nowMs = Date.now()) {
  const roundedNow = Math.floor(nowMs / 60000) * 60000;
  return {
    allianceName: '우리 동맹',
    routeName: '오늘 공성 루트 A',
    activeTab: 'single',
    anchorStock: 1500,
    anchorTimeMs: roundedNow,
    autoSyncEnabled: true,
    tickIntervalMinutes: 5,
    baseHourlyRate: SEASON_META.defaultHourlyRate,
    cap: SEASON_META.defaultCap,
    targetGoalAmount: 6000,
    targetCheckTimeMs: roundedNow + 24 * 3600000,
    boosts: [],
    rules: createDefaultRules(),
    singleTarget: {
      presetId: 'city-11',
      name: '',
      customBaseCost: '',
      extraCost: 0,
      isConnected: true,
      isEnemyZone: false,
      distanceCount: 1,
      customUnitPenalty: '',
    },
    singleTargetTimeMs: roundedNow + 3 * 3600000,
    events: [
      {
        id: 'sample-1',
        presetId: 'city-8',
        name: '1차 8렙 공성지',
        customBaseCost: '',
        extraCost: 0,
        isConnected: true,
        isEnemyZone: false,
        distanceCount: 1,
        customUnitPenalty: '',
        scheduledAt: roundedNow + 2 * 3600000,
      },
      {
        id: 'sample-2',
        presetId: 'gate-11',
        name: '2차 11렙 관문 돌파',
        customBaseCost: '',
        extraCost: 0,
        isConnected: true,
        isEnemyZone: false,
        distanceCount: 1,
        customUnitPenalty: '',
        scheduledAt: roundedNow + 8 * 3600000,
      },
    ],
  };
}

function normalizeLoadedState(parsed, fresh) {
  const nowMs = fresh.anchorTimeMs;
  const singleTargetTimeMs =
    Number.isFinite(parsed.singleTargetTimeMs) && parsed.singleTargetTimeMs >= nowMs
      ? parsed.singleTargetTimeMs
      : fresh.singleTargetTimeMs;
  const targetCheckTimeMs =
    Number.isFinite(parsed.targetCheckTimeMs) && parsed.targetCheckTimeMs >= nowMs
      ? parsed.targetCheckTimeMs
      : fresh.targetCheckTimeMs;

  return {
    ...fresh,
    ...parsed,
    allianceName: parsed.allianceName ?? fresh.allianceName,
    routeName: parsed.routeName ?? fresh.routeName,
    activeTab: parsed.activeTab ?? fresh.activeTab,
    baseHourlyRate: Number.isFinite(Number(parsed.baseHourlyRate))
      ? Number(parsed.baseHourlyRate)
      : fresh.baseHourlyRate,
    cap: Number.isFinite(Number(parsed.cap)) ? Number(parsed.cap) : fresh.cap,
    targetGoalAmount: Number.isFinite(Number(parsed.targetGoalAmount))
      ? Number(parsed.targetGoalAmount)
      : fresh.targetGoalAmount,
    boosts: Array.isArray(parsed.boosts) ? parsed.boosts : fresh.boosts,
    events: Array.isArray(parsed.events) ? parsed.events : fresh.events,
    singleTarget: parsed.singleTarget
      ? { ...fresh.singleTarget, ...parsed.singleTarget }
      : fresh.singleTarget,
    anchorStock: Number.isFinite(Number(parsed.anchorStock))
      ? Number(parsed.anchorStock)
      : Number.isFinite(Number(parsed.currentStock))
      ? Number(parsed.currentStock)
      : fresh.anchorStock,
    anchorTimeMs: Number.isFinite(Number(parsed.anchorTimeMs))
      ? Number(parsed.anchorTimeMs)
      : nowMs,
    autoSyncEnabled: parsed.autoSyncEnabled !== undefined ? Boolean(parsed.autoSyncEnabled) : true,
    tickIntervalMinutes:
      parsed.tickIntervalMinutes !== undefined && Number.isFinite(Number(parsed.tickIntervalMinutes))
        ? Number(parsed.tickIntervalMinutes)
        : 5,
    singleTargetTimeMs,
    targetCheckTimeMs,
    rules: parsed.rules?.presets ? { ...fresh.rules, ...parsed.rules } : fresh.rules,
  };
}

function loadInitialContext() {
  const fresh = createInitialState();

  try {
    const shareParam = new URLSearchParams(window.location.search).get('s');
    if (shareParam) {
      const decoded = decodeShareState(shareParam);
      if (decoded) {
        return {
          state: normalizeLoadedState(decoded, fresh),
          openedFromShare: true,
        };
      }
    }
  } catch {
    // Ignore malformed query string
  }

  try {
    const rawV4 = localStorage.getItem(STORAGE_KEY);
    if (rawV4) {
      return {
        state: normalizeLoadedState(JSON.parse(rawV4), fresh),
        openedFromShare: false,
      };
    }
    const rawV3 = localStorage.getItem(LEGACY_V3_KEY);
    if (rawV3) {
      return {
        state: normalizeLoadedState(JSON.parse(rawV3), fresh),
        openedFromShare: false,
      };
    }
  } catch {
    // Ignore invalid storage
  }

  return { state: fresh, openedFromShare: false };
}

export function App() {
  const [initialContext] = useState(loadInitialContext);
  const [state, setState] = useState(initialContext.state);
  const [showShareBanner, setShowShareBanner] = useState(initialContext.openedFromShare);
  const [refOpen, setRefOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [liveNowMs, setLiveNowMs] = useState(() => Date.now());

  // 1초마다 카운트다운 및 정산 시점 확인, 탭 복귀 시 즉시 동기화
  useEffect(() => {
    if (!state.autoSyncEnabled) return undefined;

    const tick = () => setLiveNowMs(Date.now());
    const timer = setInterval(tick, 1000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state.autoSyncEnabled]);

  // 같은 브라우저 다른 탭 간 상태 동기화
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          setState((prev) => normalizeLoadedState(parsed, prev));
        } catch {
          // Ignore invalid JSON
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota issues
    }
  }, [state]);

  const liveAnchor = useMemo(
    () =>
      resolveLiveAnchorStock({
        anchorStock: state.anchorStock,
        anchorTimeMs: state.anchorTimeMs,
        nowMs: state.autoSyncEnabled ? liveNowMs : state.anchorTimeMs,
        baseHourlyRate: state.baseHourlyRate,
        cap: state.cap,
        boosts: state.boosts,
        tickIntervalMinutes: 5,
        alignToClockGrid: true,
      }),
    [
      state.anchorStock,
      state.anchorTimeMs,
      state.autoSyncEnabled,
      liveNowMs,
      state.baseHourlyRate,
      state.cap,
      state.boosts,
    ]
  );

  // 하위 시뮬레이션/PNG 카드는 분 단위로만 재계산해 1초 카운트다운 중 불필요한 캔버스 재렌더 방지
  const minuteSyncedNowMs = Math.floor(liveNowMs / 60000) * 60000;
  const effectiveBaseTimeMs = state.autoSyncEnabled ? minuteSyncedNowMs : state.anchorTimeMs;
  const effectiveCurrentStock = state.autoSyncEnabled
    ? liveAnchor.currentStock
    : Math.min(state.cap, Math.floor(state.anchorStock));

  const updateState = (patch) => setState((prev) => ({ ...prev, ...patch }));

  // 생산량/상한/제철소 변경 시 과거 누적분을 현재 시각 스냅샷으로 확정해 소급 왜곡 방지
  const updateWithSnapshot = (buildPatch) => {
    const now = Date.now();
    setLiveNowMs(now);
    setState((prev) => {
      if (!prev.autoSyncEnabled) {
        return { ...prev, ...buildPatch(prev) };
      }
      const snapshot = resolveLiveAnchorStock({
        anchorStock: prev.anchorStock,
        anchorTimeMs: prev.anchorTimeMs,
        nowMs: now,
        baseHourlyRate: prev.baseHourlyRate,
        cap: prev.cap,
        boosts: prev.boosts,
        tickIntervalMinutes: 5,
        alignToClockGrid: true,
      });
      return {
        ...prev,
        anchorStock: snapshot.exactStock,
        anchorTimeMs: snapshot.anchorSlotMs,
        ...buildPatch(prev),
      };
    });
  };

  const updateRulesPatch = (patch) =>
    setState((prev) => ({ ...prev, rules: { ...prev.rules, ...patch } }));

  const rateSchedule = useMemo(
    () => buildRateSchedule(state.boosts, effectiveBaseTimeMs),
    [state.boosts, effectiveBaseTimeMs]
  );

  const effectiveStartRate = Math.max(0, state.baseHourlyRate + rateSchedule.immediateBoost);

  const timeToCap = useMemo(
    () =>
      findEarliestAffordableTime({
        startMs: effectiveBaseTimeMs,
        initialStock: effectiveCurrentStock,
        initialRate: effectiveStartRate,
        cap: state.cap,
        requiredCost: state.cap,
        scheduledChanges: rateSchedule.scheduledChanges,
      }),
    [effectiveBaseTimeMs, effectiveCurrentStock, effectiveStartRate, state.cap, rateSchedule]
  );

  const targetReach = useMemo(
    () =>
      calculateTargetReach({
        currentStock: effectiveCurrentStock,
        baseHourlyRate: state.baseHourlyRate,
        cap: state.cap,
        baseTime: effectiveBaseTimeMs,
        targetAmount: state.targetGoalAmount ?? 6000,
        boosts: state.boosts,
      }),
    [
      effectiveCurrentStock,
      state.baseHourlyRate,
      state.cap,
      effectiveBaseTimeMs,
      state.targetGoalAmount,
      state.boosts,
    ]
  );

  const safeTargetCheckTimeMs = Math.max(
    effectiveBaseTimeMs,
    state.targetCheckTimeMs ?? effectiveBaseTimeMs + 24 * 3600000
  );

  const stockAtTime = useMemo(
    () =>
      calculateStockAtTime({
        currentStock: effectiveCurrentStock,
        baseHourlyRate: state.baseHourlyRate,
        cap: state.cap,
        baseTime: effectiveBaseTimeMs,
        targetTime: safeTargetCheckTimeMs,
        boosts: state.boosts,
      }),
    [
      effectiveCurrentStock,
      state.baseHourlyRate,
      state.cap,
      effectiveBaseTimeMs,
      safeTargetCheckTimeMs,
      state.boosts,
    ]
  );

  const simulation = useMemo(
    () =>
      simulateTimeline({
        currentStock: effectiveCurrentStock,
        baseHourlyRate: state.baseHourlyRate,
        cap: state.cap,
        baseTime: effectiveBaseTimeMs,
        events: state.events,
        boosts: state.boosts,
        rules: state.rules,
      }),
    [
      effectiveCurrentStock,
      state.baseHourlyRate,
      state.cap,
      effectiveBaseTimeMs,
      state.events,
      state.boosts,
      state.rules,
    ]
  );

  const handleCurrentStockChange = (nextStock) => {
    const now = Date.now();
    setLiveNowMs(now);
    updateState({
      anchorStock: nextStock,
      anchorTimeMs: state.autoSyncEnabled ? Math.floor(now / 300000) * 300000 : state.anchorTimeMs,
    });
  };

  const handleBaseTimeChange = (nextMs) => {
    updateState({
      autoSyncEnabled: false,
      anchorStock: effectiveCurrentStock,
      anchorTimeMs: nextMs,
    });
  };

  const handleToggleAutoSync = (enabled) => {
    const now = Date.now();
    setLiveNowMs(now);
    if (enabled) {
      updateState({
        autoSyncEnabled: true,
        anchorStock: effectiveCurrentStock,
        anchorTimeMs: Math.floor(now / 300000) * 300000,
      });
    } else {
      updateState({
        autoSyncEnabled: false,
        anchorStock: liveAnchor.exactStock,
        anchorTimeMs: now,
      });
    }
  };

  const handleAddBoost = (boost) => {
    updateWithSnapshot((prev) => ({
      boosts: [
        ...prev.boosts,
        { ...boost, id: `boost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
      ],
    }));
  };

  const handleUpdateBoost = (id, patch) => {
    updateWithSnapshot((prev) => ({
      boosts: prev.boosts.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const handleRemoveBoost = (id) => {
    updateWithSnapshot((prev) => ({
      boosts: prev.boosts.filter((item) => item.id !== id),
    }));
  };

  const handleAddEvent = (ev) => {
    updateState({
      activeTab: 'timeline',
      events: [
        ...state.events,
        { ...ev, id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
      ],
    });
  };

  const handleUpdateEvent = (id, patch) => {
    updateState({
      events: state.events.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const handleMoveEvent = (id, direction) => {
    const orderedIds = simulation.steps.map((s) => s.id);
    const idx = orderedIds.indexOf(id);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= orderedIds.length) return;

    const eventMap = new Map(state.events.map((ev) => [ev.id, ev]));
    const reordered = orderedIds.map((itemId) => ({ ...eventMap.get(itemId) }));
    const aTime = reordered[idx].scheduledAt;
    const bTime = reordered[targetIdx].scheduledAt;

    reordered[idx].scheduledAt = bTime;
    reordered[targetIdx].scheduledAt = aTime;
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];

    updateState({ events: reordered });
  };

  const handleRemoveEvent = (id) => {
    updateState({
      events: state.events.filter((item) => item.id !== id),
    });
  };

  const handleAutoScheduleEta = () => {
    const orderedEvents = simulation.steps
      .map((s) => state.events.find((ev) => ev.id === s.id))
      .filter(Boolean);

    const { events: scheduledEvents } = computeAutoEtaSchedule({
      currentStock: effectiveCurrentStock,
      baseHourlyRate: state.baseHourlyRate,
      cap: state.cap,
      baseTime: effectiveBaseTimeMs,
      events: orderedEvents,
      boosts: state.boosts,
      rules: state.rules,
    });

    updateState({ events: scheduledEvents });
  };

  const handleLoadSample = () => {
    const base = effectiveBaseTimeMs;
    updateState({
      routeName: 'W2 남군 공성 루트',
      events: [
        {
          id: `sample-${Date.now()}-1`,
          presetId: 'city-8',
          name: '1차 8렙 공성지',
          customBaseCost: '',
          extraCost: 0,
          isConnected: true,
          isEnemyZone: false,
          distanceCount: 1,
          customUnitPenalty: '',
          scheduledAt: base + 2 * 3600000,
        },
        {
          id: `sample-${Date.now()}-2`,
          presetId: 'gate-11',
          name: '2차 11렙 관문',
          customBaseCost: '',
          extraCost: 0,
          isConnected: true,
          isEnemyZone: false,
          distanceCount: 1,
          customUnitPenalty: '',
          scheduledAt: base + 10 * 3600000,
        },
        {
          id: `sample-${Date.now()}-3`,
          presetId: 'city-16',
          name: '3차 16렙 무연결 적진',
          customBaseCost: '',
          extraCost: 0,
          isConnected: false,
          isEnemyZone: true,
          distanceCount: 1,
          customUnitPenalty: '',
          scheduledAt: base + 75 * 3600000,
        },
      ],
    });
  };

  const handleCopyShareLink = async () => {
    const encoded = encodeShareState(state);
    const url = `${window.location.origin}${window.location.pathname}?s=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleResetAll = () => {
    const now = Date.now();
    setLiveNowMs(now);
    setShowShareBanner(false);
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setState(createInitialState(now));
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-group">
          <div className="season-badges">
            <span className="badge badge-gold">
              <Shield size={12} /> {SEASON_META.name}
            </span>
            <span className="badge badge-muted">동맹 공성 주둔지 정철 계산기</span>
          </div>
          <h1 className="brand-title">삼국지: 천하결전 정철 계산기</h1>
        </div>

        <div className="topbar-actions">
          <label className="alliance-input-wrap" title="공지 요약에 표시될 동맹 이름">
            <span>동맹명</span>
            <input
              type="text"
              value={state.allianceName}
              onChange={(e) => updateState({ allianceName: e.target.value })}
              placeholder="우리 동맹"
            />
          </label>
          <button type="button" className="btn btn-gold" onClick={handleCopyShareLink}>
            {copiedLink ? <Check size={15} /> : <Link2 size={15} />}
            {copiedLink ? '공유 링크 복사됨!' : '상태 링크 복사'}
          </button>
          <button type="button" className="btn" onClick={() => setRefOpen(true)}>
            <BookOpen size={15} />
            W2 기준표 · 편집
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleResetAll}>
            <RotateCcw size={15} />
            초기화
          </button>
        </div>
      </header>

      {showShareBanner && (
        <div className="shared-banner">
          <span>
            🔗 <strong>공유 링크</strong>에서 불러온 공성 계획입니다. 기준 시점 이후 흐른 시간만큼 현재 정철이 자동 계산되어 반영되었습니다.
          </span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setShowShareBanner(false);
              window.history.replaceState({}, '', window.location.pathname);
            }}
          >
            확인
          </button>
        </div>
      )}

      <div className="stack">
        <StatusPanel
          allianceName={state.allianceName}
          baseTimeMs={effectiveBaseTimeMs}
          anchorTimeMs={state.anchorTimeMs}
          anchorStock={state.anchorStock}
          autoSyncEnabled={state.autoSyncEnabled}
          onToggleAutoSync={handleToggleAutoSync}
          liveAnchor={liveAnchor}
          accumulatedGain={state.autoSyncEnabled ? liveAnchor.accumulatedGain : 0}
          onBaseTimeChange={handleBaseTimeChange}
          currentStock={effectiveCurrentStock}
          onCurrentStockChange={handleCurrentStockChange}
          baseHourlyRate={state.baseHourlyRate}
          onBaseHourlyRateChange={(baseHourlyRate) =>
            updateWithSnapshot(() => ({ baseHourlyRate }))
          }
          effectiveStartRate={effectiveStartRate}
          cap={state.cap}
          onCapChange={(cap) => updateWithSnapshot(() => ({ cap }))}
          connectionRuleActive={state.rules.connectionRuleActive ?? true}
          onConnectionRuleActiveChange={(connectionRuleActive) =>
            updateRulesPatch({ connectionRuleActive })
          }
          allianceHasNoCities={state.rules.allianceHasNoCities ?? false}
          onAllianceHasNoCitiesChange={(allianceHasNoCities) =>
            updateRulesPatch({ allianceHasNoCities })
          }
          timeToCap={timeToCap}
          targetGoalAmount={state.targetGoalAmount ?? 6000}
          onTargetGoalAmountChange={(targetGoalAmount) => updateState({ targetGoalAmount })}
          targetReach={targetReach}
          targetCheckTimeMs={safeTargetCheckTimeMs}
          onTargetCheckTimeChange={(targetCheckTimeMs) =>
            updateState({ targetCheckTimeMs: Math.max(effectiveBaseTimeMs, targetCheckTimeMs) })
          }
          stockAtTime={stockAtTime}
        />

        <IronworksPlanner
          boosts={state.boosts}
          baseTimeMs={effectiveBaseTimeMs}
          onAddBoost={handleAddBoost}
          onUpdateBoost={handleUpdateBoost}
          onRemoveBoost={handleRemoveBoost}
        />
      </div>

      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={state.activeTab === 'single'}
            className={`tab-btn ${state.activeTab === 'single' ? 'active' : ''}`}
            onClick={() => updateState({ activeTab: 'single' })}
          >
            <Calculator size={16} />
            단건 공성 계산
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={state.activeTab === 'timeline'}
            className={`tab-btn ${state.activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => updateState({ activeTab: 'timeline' })}
          >
            <CalendarRange size={16} />
            연쇄 공성 타임라인 ({simulation.steps.length})
          </button>
        </div>
      </div>

      <main className="workspace-grid">
        <div>
          {state.activeTab === 'single' ? (
            <QuickCalculator
              baseTimeMs={effectiveBaseTimeMs}
              currentStock={effectiveCurrentStock}
              baseHourlyRate={state.baseHourlyRate}
              cap={state.cap}
              boosts={state.boosts}
              rules={state.rules}
              target={state.singleTarget}
              onTargetChange={(singleTarget) => updateState({ singleTarget })}
              targetTimeMs={Math.max(effectiveBaseTimeMs, state.singleTargetTimeMs)}
              onTargetTimeChange={(singleTargetTimeMs) =>
                updateState({ singleTargetTimeMs: Math.max(effectiveBaseTimeMs, singleTargetTimeMs) })
              }
              onAddToTimeline={handleAddEvent}
            />
          ) : (
            <TimelinePlanner
              baseTimeMs={effectiveBaseTimeMs}
              routeName={state.routeName}
              onRouteNameChange={(routeName) => updateState({ routeName })}
              events={state.events}
              simulation={simulation}
              rules={state.rules}
              onAddEvent={handleAddEvent}
              onUpdateEvent={handleUpdateEvent}
              onMoveEvent={handleMoveEvent}
              onRemoveEvent={handleRemoveEvent}
              onAutoScheduleEta={handleAutoScheduleEta}
              onLoadSample={handleLoadSample}
              onClearAll={() => updateState({ events: [] })}
            />
          )}
        </div>

        <ShareSummaryCard
          activeTab={state.activeTab}
          allianceName={state.allianceName}
          routeName={state.routeName}
          baseTimeMs={effectiveBaseTimeMs}
          currentStock={effectiveCurrentStock}
          baseHourlyRate={state.baseHourlyRate}
          cap={state.cap}
          boosts={state.boosts}
          rules={state.rules}
          singleTarget={state.singleTarget}
          singleTargetTimeMs={state.singleTargetTimeMs}
          simulation={simulation}
        />
      </main>

      <ReferenceModal
        open={refOpen}
        onClose={() => setRefOpen(false)}
        rules={state.rules}
        onUpdateRules={(rules) => updateState({ rules })}
        onResetRules={() => updateState({ rules: createDefaultRules() })}
      />
    </div>
  );
}

export default App;
