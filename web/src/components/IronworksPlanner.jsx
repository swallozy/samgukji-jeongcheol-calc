import React from 'react';
import { Hammer, Plus, Trash2 } from 'lucide-react';
import { IRONWORKS_LEVELS } from '@jeongcheol/core';
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '../utils/time.js';

export function IronworksPlanner({ boosts, baseTimeMs, onAddBoost, onUpdateBoost, onRemoveBoost }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Hammer size={18} color="#e5a93c" />
            제철소 · 추가 생산 계획
          </h2>
          <p className="card-subtitle">
            9렙 이상 성지 제철소 건설/증축 예정분을 넣으면 해당 시점부터 시간당 생산량에 합산됩니다. (현재 생산량에 이미 포함된 제철소는 제외하세요)
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              onAddBoost({
                level: 1,
                count: 1,
                hourlyDelta: 4,
                label: '제철소 1렙',
                effectiveAt: '',
              })
            }
          >
            <Plus size={14} /> 1렙 (+4/h)
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              onAddBoost({
                level: 2,
                count: 1,
                hourlyDelta: 7,
                label: '제철소 2렙',
                effectiveAt: '',
              })
            }
          >
            <Plus size={14} /> 2렙 (+7/h)
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              onAddBoost({
                level: 3,
                count: 1,
                hourlyDelta: 10,
                label: '제철소 3렙',
                effectiveAt: '',
              })
            }
          >
            <Plus size={14} /> 3렙 (+10/h)
          </button>
        </div>
      </div>

      {boosts.length === 0 ? (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-input)',
            border: '1px dashed var(--border-subtle)',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          추가 예정인 제철소가 없습니다. 9렙 이상 성지에 제철소를 새로 지을 계획이 있다면 위 버튼으로 추가해 보세요.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {boosts.map((boost) => (
            <div key={boost.id} className="boost-row">
              <div className="field">
                <label>종류 / 메모</label>
                <select
                  className="select"
                  value={boost.level ?? 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      onUpdateBoost(boost.id, { level: null, label: '직접 증감' });
                    } else {
                      const lvl = IRONWORKS_LEVELS.find((item) => item.level === Number(val));
                      onUpdateBoost(boost.id, {
                        level: Number(val),
                        hourlyDelta: lvl ? lvl.hourlyGain : boost.hourlyDelta,
                        label: lvl ? `제철소 ${lvl.level}렙` : boost.label,
                      });
                    }
                  }}
                >
                  {IRONWORKS_LEVELS.map((lvl) => (
                    <option key={lvl.level} value={lvl.level}>
                      {lvl.label}
                    </option>
                  ))}
                  <option value="custom">직접 입력 (± 생산량)</option>
                </select>
              </div>

              <div className="field">
                <label>개당 +생산 / 개수</label>
                <div className="input-row">
                  <input
                    type="number"
                    className="input num"
                    value={boost.hourlyDelta}
                    title="개당 시간당 정철 증가량"
                    onChange={(e) =>
                      onUpdateBoost(boost.id, { hourlyDelta: Number(e.target.value) || 0 })
                    }
                  />
                  <span style={{ color: 'var(--text-muted)' }}>×</span>
                  <input
                    type="number"
                    min="1"
                    className="input num"
                    style={{ width: '74px' }}
                    value={boost.count}
                    title="개수"
                    onChange={(e) =>
                      onUpdateBoost(boost.id, { count: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </div>
              </div>

              <div className="field">
                <label>
                  <span>적용 시각</span>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => onUpdateBoost(boost.id, { effectiveAt: '' })}
                  >
                    즉시
                  </button>
                </label>
                <input
                  type="datetime-local"
                  className="input num"
                  value={
                    boost.effectiveAt
                      ? toLocalDateTimeInput(boost.effectiveAt)
                      : toLocalDateTimeInput(baseTimeMs)
                  }
                  onChange={(e) => {
                    const ms = fromLocalDateTimeInput(e.target.value);
                    onUpdateBoost(boost.id, { effectiveAt: Number.isFinite(ms) ? ms : '' });
                  }}
                />
              </div>

              <button
                type="button"
                className="btn btn-danger-ghost"
                title="삭제"
                onClick={() => onRemoveBoost(boost.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
