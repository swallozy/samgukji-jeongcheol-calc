import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calculator, CalendarRange, RotateCcw, Shield } from 'lucide-react';
import {
  buildRateSchedule,
  computeAutoEtaSchedule,
  findEarliestAffordableTime,
  LEVEL_BRACKET_PENALTIES,
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

const STORAGE_KEY = 'samgukji-w2-jeongcheol-calc:v3';

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
    baseTimeMs: roundedNow,
    currentStock: 1800,
    baseHourlyRate: SEASON_META.defaultHourlyRate,
    cap: SEASON_META.defaultCap,
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

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    const fresh = createInitialState();
    return {
      ...fresh,
      ...parsed,
      rules: parsed.rules?.presets ? { ...fresh.rules, ...parsed.rules } : fresh.rules,
    };
  } catch {
    return createInitialState();
  }
}

export function App() {
  const [state, setState] = useState(loadSavedState);
  const [refOpen, setRefOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota issues
    }
  }, [state]);

  const updateState = (patch) => setState((prev) => ({ ...prev, ...patch }));
  const updateRulesPatch = (patch) =>
    setState((prev) => ({ ...prev, rules: { ...prev.rules, ...patch } }));

  const rateSchedule = useMemo(
    () => buildRateSchedule(state.boosts, state.baseTimeMs),
    [state.boosts, state.baseTimeMs]
  );

  const effectiveStartRate = Math.max(0, state.baseHourlyRate + rateSchedule.immediateBoost);

  const timeToCap = useMemo(
    () =>
      findEarliestAffordableTime({
        startMs: state.baseTimeMs,
        initialStock: state.currentStock,
        initialRate: effectiveStartRate,
        cap: state.cap,
        requiredCost: state.cap,
        scheduledChanges: rateSchedule.scheduledChanges,
      }),
    [state.baseTimeMs, state.currentStock, effectiveStartRate, state.cap, rateSchedule]
  );

  const simulation = useMemo(
    () =>
      simulateTimeline({
        currentStock: state.currentStock,
        baseHourlyRate: state.baseHourlyRate,
        cap: state.cap,
        baseTime: state.baseTimeMs,
        events: state.events,
        boosts: state.boosts,
        rules: state.rules,
      }),
    [
      state.currentStock,
      state.baseHourlyRate,
      state.cap,
      state.baseTimeMs,
      state.events,
      state.boosts,
      state.rules,
    ]
  );

  const handleAddBoost = (boost) => {
    updateState({
      boosts: [
        ...state.boosts,
        { ...boost, id: `boost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
      ],
    });
  };

  const handleUpdateBoost = (id, patch) => {
    updateState({
      boosts: state.boosts.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const handleRemoveBoost = (id) => {
    updateState({
      boosts: state.boosts.filter((item) => item.id !== id),
    });
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
      currentStock: state.currentStock,
      baseHourlyRate: state.baseHourlyRate,
      cap: state.cap,
      baseTime: state.baseTimeMs,
      events: orderedEvents,
      boosts: state.boosts,
      rules: state.rules,
    });

    updateState({ events: scheduledEvents });
  };

  const handleLoadSample = () => {
    const base = state.baseTimeMs;
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

  const handleResetAll = () => {
    setState(createInitialState());
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

      <div className="stack">
        <StatusPanel
          baseTimeMs={state.baseTimeMs}
          onBaseTimeChange={(baseTimeMs) => updateState({ baseTimeMs })}
          onResetBaseTimeNow={() =>
            updateState({ baseTimeMs: Math.floor(Date.now() / 60000) * 60000 })
          }
          currentStock={state.currentStock}
          onCurrentStockChange={(currentStock) => updateState({ currentStock })}
          baseHourlyRate={state.baseHourlyRate}
          onBaseHourlyRateChange={(baseHourlyRate) => updateState({ baseHourlyRate })}
          effectiveStartRate={effectiveStartRate}
          cap={state.cap}
          onCapChange={(cap) => updateState({ cap })}
          connectionRuleActive={state.rules.connectionRuleActive ?? true}
          onConnectionRuleActiveChange={(connectionRuleActive) =>
            updateRulesPatch({ connectionRuleActive })
          }
          allianceHasNoCities={state.rules.allianceHasNoCities ?? false}
          onAllianceHasNoCitiesChange={(allianceHasNoCities) =>
            updateRulesPatch({ allianceHasNoCities })
          }
          timeToCap={timeToCap}
        />

        <IronworksPlanner
          boosts={state.boosts}
          baseTimeMs={state.baseTimeMs}
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
              baseTimeMs={state.baseTimeMs}
              currentStock={state.currentStock}
              baseHourlyRate={state.baseHourlyRate}
              cap={state.cap}
              boosts={state.boosts}
              rules={state.rules}
              target={state.singleTarget}
              onTargetChange={(singleTarget) => updateState({ singleTarget })}
              targetTimeMs={state.singleTargetTimeMs}
              onTargetTimeChange={(singleTargetTimeMs) => updateState({ singleTargetTimeMs })}
              onAddToTimeline={handleAddEvent}
            />
          ) : (
            <TimelinePlanner
              baseTimeMs={state.baseTimeMs}
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
          baseTimeMs={state.baseTimeMs}
          currentStock={state.currentStock}
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
