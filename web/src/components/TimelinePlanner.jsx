import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { formatDateTimeKST, formatDuration } from '@jeongcheol/core';
import { SiegeTargetForm } from './SiegeTargetForm.jsx';
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '../utils/time.js';

export function TimelinePlanner({
  baseTimeMs,
  routeName,
  onRouteNameChange,
  events,
  simulation,
  rules,
  onAddEvent,
  onUpdateEvent,
  onMoveEvent,
  onRemoveEvent,
  onAutoScheduleEta,
  onLoadSample,
  onClearAll,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(() => ({
    presetId: 'city-8',
    name: '',
    customBaseCost: '',
    extraCost: 0,
    isConnected: true,
    isEnemyZone: false,
    distanceCount: 1,
    customUnitPenalty: '',
    scheduledAt: baseTimeMs + 3 * 3600000,
  }));

  const handleCreate = () => {
    onAddEvent(draft);
    setShowAddForm(false);
    setDraft((prev) => ({
      ...prev,
      name: '',
      scheduledAt: (Number.isFinite(prev.scheduledAt) ? prev.scheduledAt : baseTimeMs) + 4 * 3600000,
    }));
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">연쇄 공성 타임라인 시뮬레이터</h2>
            <p className="card-subtitle">
              여러 성지·관문을 배치해 중간 정철 부족이나 보유 상한 손실이 없는지 검증하고, 최단 시작 시각을 자동 계산합니다.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {events.length > 0 && (
              <button
                type="button"
                className="btn btn-sm"
                title="현재 순서대로 정철이 모이는 즉시 진행할 때의 최단 시각으로 자동 맞춤"
                onClick={onAutoScheduleEta}
              >
                <Zap size={14} color="#e5a93c" />
                최단 ETA 자동 맞추기
              </button>
            )}
            <button type="button" className="btn btn-sm" onClick={onLoadSample}>
              <Sparkles size={14} />
              예시 루트
            </button>
            {events.length > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClearAll}>
                비우기
              </button>
            )}
            <button
              type="button"
              className="btn btn-gold btn-sm"
              onClick={() => {
                const latestMs =
                  events.length > 0
                    ? Math.max(...events.map((e) => Number(e.scheduledAt) || baseTimeMs))
                    : baseTimeMs;
                setDraft((prev) => ({
                  ...prev,
                  isConnected: events.length > 0,
                  scheduledAt: latestMs + 4 * 3600000,
                }));
                setShowAddForm((prev) => !prev);
              }}
            >
              <Plus size={15} />
              성 추가
            </button>
          </div>
        </div>

        <div className="field" style={{ marginBottom: '14px' }}>
          <label htmlFor="route-name-input">공성 루트 이름 (공지 · 이미지 카드 제목)</label>
          <input
            id="route-name-input"
            type="text"
            className="input"
            placeholder="예: 오늘 공성 루트 A"
            value={routeName}
            onChange={(e) => onRouteNameChange(e.target.value)}
          />
        </div>

        {showAddForm && (
          <div
            style={{
              marginBottom: '16px',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-gold)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div className="field">
              <label>공성 예정 시각</label>
              <input
                type="datetime-local"
                className="input num"
                value={toLocalDateTimeInput(draft.scheduledAt)}
                onChange={(e) => {
                  const ms = fromLocalDateTimeInput(e.target.value);
                  if (Number.isFinite(ms)) setDraft((prev) => ({ ...prev, scheduledAt: ms }));
                }}
              />
            </div>

            <SiegeTargetForm
              value={draft}
              onChange={setDraft}
              rules={rules}
              isFirstNoCityStep={events.length === 0}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddForm(false)}
              >
                취소
              </button>
              <button type="button" className="btn btn-gold btn-sm" onClick={handleCreate}>
                <Plus size={14} />
                일정에 넣기
              </button>
            </div>
          </div>
        )}

        {simulation.steps.length === 0 ? (
          <div
            style={{
              padding: '28px 18px',
              textAlign: 'center',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px dashed var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '13.5px',
            }}
          >
            아직 등록된 공성 일정이 없습니다. <strong>[성 추가]</strong> 또는{' '}
            <strong>[예시 루트]</strong>를 눌러 시작해 보세요.
          </div>
        ) : (
          <div className="timeline-list">
            {simulation.steps.map((step, index) => {
              const rawEvent = events.find((ev) => ev.id === step.id);
              const isEditing = editingId === step.id;
              const statusClass =
                step.exceedsCap || step.cost.blockedByNoCityRule
                  ? 'exceeds'
                  : !step.affordable
                  ? 'shortage'
                  : '';

              return (
                <div key={step.id} className={`step-card ${statusClass}`}>
                  <div className="step-header">
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                      <span className="step-index num">{index + 1}</span>
                      <strong style={{ fontSize: '15px' }}>{step.cost.presetLabel}</strong>

                      {step.cost.penaltyExemptReason === 'no_city' ? (
                        <span className="badge badge-muted">성지 미보유 기본</span>
                      ) : step.cost.penaltyExemptReason === 'pre_phase' ? (
                        <span className="badge badge-muted">이릉 결전 전</span>
                      ) : step.cost.isConnected ? (
                        <span className="badge badge-muted">
                          {index > 0 ? '관로 연결(자동)' : '관로 연결'}
                        </span>
                      ) : (
                        <span className="badge badge-amber num">
                          관로 미연결 {step.cost.distanceCount}칸 (+{step.cost.penaltyCost.toLocaleString()})
                        </span>
                      )}

                      {step.cost.isEnemyZone && (
                        <span className="badge badge-sky num">
                          타 진영 +50% (+{step.cost.enemySurcharge.toLocaleString()})
                        </span>
                      )}

                      {step.cost.blockedByNoCityRule ? (
                        <span className="badge badge-crimson">
                          <XCircle size={12} /> 9렙 이하만 가능
                        </span>
                      ) : step.exceedsCap ? (
                        <span className="badge badge-crimson">
                          <XCircle size={12} /> 상한 초과
                        </span>
                      ) : step.affordable ? (
                        <span className="badge badge-emerald">
                          <CheckCircle2 size={12} /> 가능
                        </span>
                      ) : (
                        <span className="badge badge-amber num">
                          <AlertTriangle size={12} /> {step.deficit.toLocaleString()} 부족
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="datetime-local"
                        className="input num"
                        style={{ width: 'auto', padding: '5px 8px', fontSize: '12.5px' }}
                        value={toLocalDateTimeInput(step.scheduledMs)}
                        onChange={(e) => {
                          const ms = fromLocalDateTimeInput(e.target.value);
                          if (Number.isFinite(ms)) {
                            onUpdateEvent(step.id, { scheduledAt: ms });
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="위로"
                        disabled={index === 0}
                        onClick={() => onMoveEvent(step.id, -1)}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="아래로"
                        disabled={index === simulation.steps.length - 1}
                        onClick={() => onMoveEvent(step.id, 1)}
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditingId(isEditing ? null : step.id)}
                      >
                        {isEditing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        수정
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-ghost"
                        title="일정 삭제"
                        onClick={() => onRemoveEvent(step.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="step-metrics num">
                    <div className="step-metric">
                      <div className="kpi-label">도달 시 예상 보유</div>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>
                        {step.availableBeforeSpend.toLocaleString()}
                      </div>
                    </div>
                    <div className="step-metric">
                      <div className="kpi-label">총 소모 정철</div>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: '#f5c66b' }}>
                        -{step.cost.totalCost.toLocaleString()}
                      </div>
                    </div>
                    <div className="step-metric">
                      <div className="kpi-label">소모 후 잔여</div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '15px',
                          color: step.affordable ? 'var(--accent-emerald)' : 'var(--accent-crimson)',
                        }}
                      >
                        {step.affordable
                          ? step.afterSpend.toLocaleString()
                          : `-${step.deficit.toLocaleString()} 부족`}
                      </div>
                    </div>
                    <div className="step-metric">
                      <div className="kpi-label">소요 대기 / 생산</div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', lineHeight: 1.3 }}>
                        <div>{formatDuration(step.waitFromBaseMs)}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          +{step.rateAtStep.toLocaleString()}/시간
                        </div>
                      </div>
                    </div>
                  </div>

                  {step.cost.blockedByNoCityRule && (
                    <div className="alert-line danger">
                      <span>
                        🚫 동맹에 보유 성지가 없을 때는 9레벨 이하 성지만 점령할 수 있습니다.
                      </span>
                    </div>
                  )}

                  {step.overflowOnLeg > 0 && (
                    <div className="alert-line warn num">
                      <span>
                        ⚠️ 이 구간 대기 중 상한({simulation.cap.toLocaleString()}) 초과로{' '}
                        <strong>{step.overflowOnLeg.toLocaleString()} 정철</strong> 손실 발생
                      </span>
                    </div>
                  )}

                  {!step.affordable && step.earliest?.timeMs && !step.cost.blockedByNoCityRule && (
                    <div className="alert-line info num">
                      <span>
                        💡 직전 일정 잔여 기준 최소{' '}
                        <strong>{formatDateTimeKST(step.earliest.timeMs)}</strong> (
                        {formatDuration(step.earliest.timeMs - step.scheduledMs)} 더 대기)부터 가능합니다.
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onUpdateEvent(step.id, { scheduledAt: step.earliest.timeMs })}
                      >
                        <ArrowUpRight size={13} />
                        가능 시각으로 이동
                      </button>
                    </div>
                  )}

                  {step.exceedsCap && (
                    <div className="alert-line danger num">
                      <span>
                        ❌ 단일 공성 비용({step.cost.totalCost.toLocaleString()})이 보유 상한(
                        {simulation.cap.toLocaleString()})을 넘어 실행할 수 없습니다.
                      </span>
                    </div>
                  )}

                  {isEditing && rawEvent && (
                    <div
                      style={{
                        marginTop: '4px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <SiegeTargetForm
                        value={rawEvent}
                        onChange={(updated) => onUpdateEvent(step.id, updated)}
                        rules={rules}
                        isFirstNoCityStep={index === 0}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {simulation.steps.length > 0 && (
          <div
            className="kpi-grid num"
            style={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div className="kpi-box">
              <div className="kpi-label">전체 일정 총 소모</div>
              <div className="kpi-value" style={{ color: '#f5c66b' }}>
                {simulation.summary.totalCost.toLocaleString()}
              </div>
            </div>
            <div className="kpi-box">
              <div className="kpi-label">최종 잔여 정철</div>
              <div
                className="kpi-value"
                style={{
                  color: simulation.summary.hasShortage
                    ? 'var(--accent-amber)'
                    : 'var(--accent-emerald)',
                }}
              >
                {simulation.summary.finalStock.toLocaleString()}
                {simulation.summary.totalOverflow > 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--accent-amber)', marginLeft: 6 }}>
                    (손실 -{simulation.summary.totalOverflow.toLocaleString()})
                  </span>
                )}
              </div>
            </div>
            <div className="kpi-box">
              <div className="kpi-label">일정 종료 후 상한 회복</div>
              <div className="kpi-value" style={{ fontSize: '14px' }}>
                {simulation.summary.timeToFull?.status === 'ready'
                  ? '이미 상한'
                  : simulation.summary.timeToFull?.timeMs
                  ? formatDateTimeKST(simulation.summary.timeToFull.timeMs)
                  : '-'}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
