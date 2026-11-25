import React, { useState } from 'react';
import { CalendarClock, Check, Clock, Copy, Database, Gauge, RefreshCw, Target } from 'lucide-react';
import { formatDateTimeKST, formatDuration, SEASON_META } from '@jeongcheol/core';
import {
  fromLocalDateTimeInput,
  getNextClockHourMs,
  toLocalDateTimeInput,
} from '../utils/time.js';

export function StatusPanel({
  allianceName,
  baseTimeMs,
  onBaseTimeChange,
  onResetBaseTimeNow,
  currentStock,
  onCurrentStockChange,
  baseHourlyRate,
  onBaseHourlyRateChange,
  effectiveStartRate,
  cap,
  onCapChange,
  connectionRuleActive,
  onConnectionRuleActiveChange,
  allianceHasNoCities,
  onAllianceHasNoCitiesChange,
  timeToCap,
  targetGoalAmount,
  onTargetGoalAmountChange,
  targetReach,
  targetCheckTimeMs,
  onTargetCheckTimeChange,
  stockAtTime,
}) {
  const [forecastMode, setForecastMode] = useState('amount-to-time');
  const [copiedForecast, setCopiedForecast] = useState(false);

  const fillPercent = Math.min(100, Math.max(0, (currentStock / Math.max(1, cap)) * 100));
  const boostDiff = effectiveStartRate - baseHourlyRate;

  const quickGoalAmounts = Array.from(new Set([1500, 3000, 4500, 6000, 8000, cap])).sort(
    (a, b) => a - b
  );

  const quickCheckTimes = [
    { label: '+6시간', ms: baseTimeMs + 6 * 3600000 },
    { label: '+12시간', ms: baseTimeMs + 12 * 3600000 },
    { label: '+24시간', ms: baseTimeMs + 24 * 3600000 },
    { label: '오늘/다음 21:00', ms: getNextClockHourMs(baseTimeMs, 21, false) },
    { label: '내일 21:00', ms: getNextClockHourMs(baseTimeMs, 21, true) },
  ];

  const reachSummaryText = (() => {
    const prefix = `[${SEASON_META.name}] ${allianceName || '동맹'} 정철 도달 예상 (${currentStock.toLocaleString()} → ${targetReach.targetAmount.toLocaleString()})`;
    if (targetReach.status === 'ready') {
      return `${prefix}: ✅ 이미 목표 수량을 보유 중입니다.`;
    }
    if (targetReach.status === 'exceeds_cap') {
      return `${prefix}: ❌ 목표 수량이 보유 상한(${cap.toLocaleString()})을 초과했습니다.`;
    }
    if (targetReach.status === 'no_production') {
      return `${prefix}: ⚠️ 시간당 생산량이 0이어서 도달할 수 없습니다.`;
    }
    return `${prefix}\n• 필요량: +${targetReach.neededAmount.toLocaleString()} (생산 +${effectiveStartRate}/시간)\n• 남은 시간: ${formatDuration(
      targetReach.waitMs
    )} (${formatDateTimeKST(targetReach.timeMs)} 도달 예상)`;
  })();

  const timeSummaryText = [
    `[${SEASON_META.name}] ${allianceName || '동맹'} 특정 시각 예상 정철`,
    `• 기준(${formatDateTimeKST(baseTimeMs)}): 현재 ${currentStock.toLocaleString()} / 상한 ${cap.toLocaleString()} · 생산 +${effectiveStartRate}/시간`,
    `• 조회 시각: ${formatDateTimeKST(stockAtTime.targetTimeMs)} (${
      stockAtTime.elapsedMs > 0 ? `${formatDuration(stockAtTime.elapsedMs)} 후` : '기준 시각'
    })`,
    `• 예상 보유 정철: ${stockAtTime.projectedStock.toLocaleString()} / ${cap.toLocaleString()} (+${stockAtTime.netGain.toLocaleString()} 증가)` +
      (stockAtTime.overflowLoss > 0
        ? ` ⚠️ 상한 초과 손실 -${stockAtTime.overflowLoss.toLocaleString()}`
        : ''),
  ].join('\n');

  const handleCopyForecast = async () => {
    const text = forecastMode === 'amount-to-time' ? reachSummaryText : timeSummaryText;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedForecast(true);
    setTimeout(() => setCopiedForecast(false), 1800);
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Database size={18} color="#e5a93c" />
            동맹 정철 현재 상태 · 시즌 규칙
          </h2>
          <p className="card-subtitle">
            인게임 동맹 정철 수치와 패업 [{SEASON_META.connectionRulePhaseName}] 적용 여부를 설정해 주세요.
          </p>
        </div>
        <button type="button" className="btn btn-sm" onClick={onResetBaseTimeNow}>
          <RefreshCw size={14} />
          기준 시각 현재로 맞추기
        </button>
      </div>

      <div className="status-grid">
        <div className="field">
          <label htmlFor="base-time-input">
            <span>
              기준 시각{' '}
              <span className="muted-note" style={{ fontWeight: 500 }}>
                (새로고침 시 현재 시각)
              </span>
            </span>
            <Clock size={13} />
          </label>
          <input
            id="base-time-input"
            type="datetime-local"
            className="input num"
            value={toLocalDateTimeInput(baseTimeMs)}
            onChange={(e) => {
              const nextMs = fromLocalDateTimeInput(e.target.value);
              if (Number.isFinite(nextMs)) onBaseTimeChange(nextMs);
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="current-stock-input">
            <span>현재 보유 정철</span>
            <span className="muted-note num">/ {cap.toLocaleString()}</span>
          </label>
          <input
            id="current-stock-input"
            type="number"
            min="0"
            max={cap}
            className="input num"
            value={currentStock}
            onChange={(e) => onCurrentStockChange(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>

        <div className="field">
          <label htmlFor="hourly-rate-input">
            <span>기본 시간당 생산량</span>
            {boostDiff !== 0 && (
              <span className="badge badge-emerald num">
                제철소 반영 {effectiveStartRate}/h
              </span>
            )}
          </label>
          <input
            id="hourly-rate-input"
            type="number"
            min="0"
            className="input num"
            value={baseHourlyRate}
            onChange={(e) => onBaseHourlyRateChange(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>

        <div className="field">
          <label htmlFor="cap-input">
            <span>보유 상한</span>
            <span className="muted-note">W2 기본 10,000</span>
          </label>
          <input
            id="cap-input"
            type="number"
            min="1"
            className="input num"
            value={cap}
            onChange={(e) => onCapChange(Math.max(1, Number(e.target.value) || 1))}
          />
          <div className="chip-row">
            <button
              type="button"
              className={`chip ${cap === 10000 ? 'active' : ''}`}
              onClick={() => onCapChange(10000)}
            >
              10,000 (W2 기본)
            </button>
            <button
              type="button"
              className={`chip ${cap === 3000 ? 'active' : ''}`}
              onClick={() => onCapChange(3000)}
            >
              3,000 (초기 상한)
            </button>
          </div>
        </div>
      </div>

      <div className="form-grid-2" style={{ marginTop: '14px' }}>
        <div className="field">
          <label>패업 [{SEASON_META.connectionRulePhaseName}] 성지 연결 규칙</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-option ${connectionRuleActive ? 'active' : ''}`}
              onClick={() => onConnectionRuleActiveChange(true)}
            >
              적용 중 (관로 미연결 시 추가 소모)
            </button>
            <button
              type="button"
              className={`toggle-option ${!connectionRuleActive ? 'active' : ''}`}
              onClick={() => onConnectionRuleActiveChange(false)}
            >
              적용 전 (거리 페널티 없음)
            </button>
          </div>
        </div>

        <div className="field">
          <label>동맹 성지 보유 상태 (규칙 3)</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-option ${!allianceHasNoCities ? 'active' : ''}`}
              onClick={() => onAllianceHasNoCitiesChange(false)}
            >
              보유 성지 1개 이상
            </button>
            <button
              type="button"
              className={`toggle-option ${allianceHasNoCities ? 'active-danger' : ''}`}
              onClick={() => onAllianceHasNoCitiesChange(true)}
            >
              성지 0개 (9렙↓ 기본 소모만)
            </button>
          </div>
        </div>
      </div>

      <div className="stock-meter">
        <div className="progress-track" title={`보유율 ${fillPercent.toFixed(1)}%`}>
          <div className="progress-fill" style={{ width: `${fillPercent}%` }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px' }}>
          <span className="num">
            <Gauge size={14} style={{ verticalAlign: '-2px', marginRight: 5, color: '#e5a93c' }} />
            실효 생산: <strong>+{effectiveStartRate.toLocaleString()}/시간</strong>
          </span>
          <span className="num" style={{ color: 'var(--text-secondary)' }}>
            상한 가득 차는 시각:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {timeToCap?.status === 'ready'
                ? '이미 상한 도달'
                : timeToCap?.timeMs
                ? `${formatDateTimeKST(timeToCap.timeMs)} (${formatDuration(timeToCap.waitMs)} 후)`
                : '도달 불가 (생산량 0)'}
            </strong>
          </span>
        </div>
      </div>

      <div className="target-reach-box">
        <div className="target-reach-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="tabs">
              <button
                type="button"
                className={`tab-btn ${forecastMode === 'amount-to-time' ? 'active' : ''}`}
                style={{ padding: '6px 11px', fontSize: '12.5px' }}
                onClick={() => setForecastMode('amount-to-time')}
              >
                <Target size={14} /> 목표 수량 → 시간
              </button>
              <button
                type="button"
                className={`tab-btn ${forecastMode === 'time-to-amount' ? 'active' : ''}`}
                style={{ padding: '6px 11px', fontSize: '12.5px' }}
                onClick={() => setForecastMode('time-to-amount')}
              >
                <CalendarClock size={14} /> 특정 시각 → 예상 정철
              </button>
            </div>
            <span className="muted-note">제철소 추가 계획 · 상한 자동 반영</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleCopyForecast}>
            {copiedForecast ? <Check size={13} /> : <Copy size={13} />}
            {copiedForecast ? '복사됨!' : '결과 복사'}
          </button>
        </div>

        {forecastMode === 'amount-to-time' ? (
          <div className="target-reach-grid">
            <div className="field">
              <label htmlFor="target-goal-amount-input">목표 정철 수량</label>
              <input
                id="target-goal-amount-input"
                type="number"
                min="0"
                className="input num"
                value={targetGoalAmount}
                onChange={(e) => onTargetGoalAmountChange(Math.max(0, Number(e.target.value) || 0))}
              />
              <div className="chip-row">
                {quickGoalAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`chip ${targetGoalAmount === amt ? 'active' : ''}`}
                    onClick={() => onTargetGoalAmountChange(amt)}
                  >
                    {amt === cap ? `상한(${amt.toLocaleString()})` : amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="kpi-grid num">
              <div className="kpi-box">
                <div className="kpi-label">추가 필요 정철</div>
                <div className="kpi-value" style={{ color: '#f5c66b' }}>
                  {targetReach.neededAmount > 0
                    ? `+${targetReach.neededAmount.toLocaleString()}`
                    : '0 (달성)'}
                </div>
              </div>

              <div className="kpi-box">
                <div className="kpi-label">남은 시간</div>
                <div
                  className="kpi-value"
                  style={{
                    fontSize: '16px',
                    color:
                      targetReach.status === 'ready'
                        ? 'var(--accent-emerald)'
                        : targetReach.status === 'exceeds_cap'
                        ? 'var(--accent-crimson)'
                        : 'var(--text-primary)',
                  }}
                >
                  {targetReach.status === 'ready'
                    ? '이미 달성됨'
                    : targetReach.status === 'exceeds_cap'
                    ? '보유 상한 초과'
                    : targetReach.status === 'no_production'
                    ? '도달 불가 (생산 0)'
                    : formatDuration(targetReach.waitMs)}
                </div>
              </div>

              <div className="kpi-box">
                <div className="kpi-label">도달 예상 시각</div>
                <div className="kpi-value" style={{ fontSize: '15px' }}>
                  {targetReach.status === 'ready'
                    ? '지금 바로 가능'
                    : targetReach.timeMs
                    ? formatDateTimeKST(targetReach.timeMs)
                    : '-'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="target-reach-grid">
              <div className="field">
                <label htmlFor="target-check-time-input">확인할 날짜 · 시각</label>
                <input
                  id="target-check-time-input"
                  type="datetime-local"
                  className="input num"
                  value={toLocalDateTimeInput(targetCheckTimeMs)}
                  onChange={(e) => {
                    const ms = fromLocalDateTimeInput(e.target.value);
                    if (Number.isFinite(ms)) onTargetCheckTimeChange(ms);
                  }}
                />
                <div className="chip-row">
                  {quickCheckTimes.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="chip"
                      onClick={() => onTargetCheckTimeChange(preset.ms)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="kpi-grid num">
                <div className="kpi-box">
                  <div className="kpi-label">예상 보유 정철</div>
                  <div className="kpi-value" style={{ color: '#f5c66b' }}>
                    {stockAtTime.projectedStock.toLocaleString()}
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {' '}
                      / {cap.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="kpi-box">
                  <div className="kpi-label">순수 증가량</div>
                  <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>
                    +{stockAtTime.netGain.toLocaleString()}
                  </div>
                </div>

                <div className="kpi-box">
                  <div className="kpi-label">경과 시간 / 최종 속도</div>
                  <div className="kpi-value" style={{ fontSize: '14px' }}>
                    {stockAtTime.elapsedMs > 0 ? formatDuration(stockAtTime.elapsedMs) : '기준 시각'}
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      +{stockAtTime.finalRate.toLocaleString()}/시간
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {stockAtTime.overflowLoss > 0 && (
              <div className="alert-line warn num">
                <span>
                  ⚠️ 이 시각 전에 보유 상한({cap.toLocaleString()})에 도달해{' '}
                  <strong>{stockAtTime.overflowLoss.toLocaleString()} 정철</strong>이 초과 손실됩니다.
                </span>
              </div>
            )}

            {stockAtTime.isInvalidTargetTime && (
              <div className="alert-line danger">
                <span>선택한 시각이 기준 시각보다 이전이어서 기준 시각 보유량으로 표시되었습니다.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
