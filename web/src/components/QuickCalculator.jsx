import React from 'react';
import { AlertTriangle, CalendarPlus, CheckCircle2, Clock, XCircle } from 'lucide-react';
import {
  calculateSingleSiege,
  formatDateTimeKST,
  formatDuration,
} from '@jeongcheol/core';
import { SiegeTargetForm } from './SiegeTargetForm.jsx';
import { DateTimePicker } from './DateTimePicker.jsx';

export function QuickCalculator({
  baseTimeMs,
  currentStock,
  baseHourlyRate,
  cap,
  boosts,
  rules,
  target,
  onTargetChange,
  targetTimeMs,
  onTargetTimeChange,
  onAddToTimeline,
}) {
  const safeTargetTimeMs = Math.max(baseTimeMs, targetTimeMs);

  const result = calculateSingleSiege({
    currentStock,
    baseHourlyRate,
    cap,
    baseTime: baseTimeMs,
    targetTime: safeTargetTimeMs,
    target,
    boosts,
    rules,
  });

  const isExceedCap = result.earliest.status === 'exceeds_cap';
  const isBlocked = result.cost.blockedByNoCityRule || isExceedCap;
  const bannerClass = isBlocked
    ? 'danger'
    : result.canAffordAtTarget
    ? 'ok'
    : 'warn';

  return (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">단건 공성 계산기</h2>
            <p className="card-subtitle">
              목표 성지와 공성 예정 시각을 입력하면 예상 보유량과 공성 주둔지 건설 가능 시각을 바로 확인합니다.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-gold btn-sm"
            onClick={() => onAddToTimeline({ ...target, scheduledAt: safeTargetTimeMs })}
          >
            <CalendarPlus size={15} />
            타임라인 일정에 추가
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SiegeTargetForm value={target} onChange={onTargetChange} rules={rules} />

          <div className="field">
            <label htmlFor="single-target-time">
              <span>목표 공성 / 공성 주둔지 건설 시각</span>
              <Clock size={13} />
            </label>
            <DateTimePicker
              id="single-target-time"
              variant="inline"
              minTimeMs={baseTimeMs}
              valueMs={safeTargetTimeMs}
              onChange={onTargetTimeChange}
            />
          </div>

          <div className={`result-banner ${bannerClass}`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '16px' }}>
                {result.cost.blockedByNoCityRule ? (
                  <>
                    <XCircle size={20} color="#ef5350" />
                    <span>동맹 보유 성지 0개일 때는 9레벨 이하만 점령 가능합니다</span>
                  </>
                ) : isExceedCap ? (
                  <>
                    <XCircle size={20} color="#ef5350" />
                    <span>필요 정철이 보유 상한({cap.toLocaleString()})을 초과했습니다</span>
                  </>
                ) : result.canAffordAtTarget ? (
                  <>
                    <CheckCircle2 size={20} color="#34d399" />
                    <span>목표 시각에 공성 주둔지 건설 가능합니다</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={20} color="#fbbf24" />
                    <span className="num">
                      목표 시각 기준 {result.deficit.toLocaleString()} 정철이 부족합니다
                    </span>
                  </>
                )}
              </div>

              {result.earliest.timeMs && !result.canAffordAtTarget && !result.cost.blockedByNoCityRule && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onTargetTimeChange(result.earliest.timeMs)}
                >
                  가능 시각({formatDateTimeKST(result.earliest.timeMs)})으로 맞추기
                </button>
              )}
            </div>

            <div className="kpi-grid num">
              <div className="kpi-box">
                <div className="kpi-label">목표 시각 예상 정철</div>
                <div className="kpi-value">
                  {result.projectedStock.toLocaleString()}
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {' '}
                    / {cap.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="kpi-box">
                <div className="kpi-label">건설 후 잔여 / 부족</div>
                <div
                  className="kpi-value"
                  style={{
                    color: result.canAffordAtTarget ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                  }}
                >
                  {result.canAffordAtTarget
                    ? `+${result.remainingAfterSiege.toLocaleString()} 여유`
                    : `-${result.deficit.toLocaleString()} 부족`}
                </div>
              </div>

              <div className="kpi-box">
                <div className="kpi-label">가장 빠른 건설 가능 시각</div>
                <div className="kpi-value" style={{ fontSize: '15px' }}>
                  {result.earliest.status === 'ready'
                    ? '지금 바로 가능'
                    : result.earliest.status === 'exceeds_cap'
                    ? '보유 상한 초과'
                    : result.earliest.status === 'no_production'
                    ? '생산량 0 (도달 불가)'
                    : `${formatDateTimeKST(result.earliest.timeMs)} (${formatDuration(
                        result.earliest.waitMs
                      )})`}
                </div>
              </div>
            </div>

            {result.overflowLoss > 0 && (
              <div className="alert-line warn num">
                <span>
                  ⚠️ 목표 시각 전에 보유 상한({cap.toLocaleString()})에 도달해{' '}
                  <strong>{result.overflowLoss.toLocaleString()} 정철</strong>이 증발합니다. 중간 공성이나 동맹 주둔지 건설을 배치해 보세요.
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
