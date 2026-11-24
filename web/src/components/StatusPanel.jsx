import React from 'react';
import { Clock, Database, Gauge, RefreshCw } from 'lucide-react';
import { formatDateTimeKST, formatDuration, SEASON_META } from '@jeongcheol/core';
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '../utils/time.js';

export function StatusPanel({
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
}) {
  const fillPercent = Math.min(100, Math.max(0, (currentStock / Math.max(1, cap)) * 100));
  const boostDiff = effectiveStartRate - baseHourlyRate;

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
            <span>기준 시각</span>
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
    </section>
  );
}
