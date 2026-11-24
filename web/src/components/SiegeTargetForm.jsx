import React from 'react';
import { calculateSiegeCost, findBracketPenalty } from '@jeongcheol/core';

/**
 * 단건 계산기와 타임라인 편집기에서 공용으로 사용하는 목표/관로/타진영 설정 폼
 */
export function SiegeTargetForm({ value, onChange, rules, isFirstNoCityStep = true }) {
  const presets = rules.presets;
  const effectiveRules = isFirstNoCityStep
    ? rules
    : { ...rules, allianceHasNoCities: false };

  const cost = calculateSiegeCost(value, effectiveRules);
  const selectedPreset = presets.find((p) => p.id === value.presetId);
  const bracketInfo = findBracketPenalty(cost.level, rules.brackets);

  const patch = (next) => onChange({ ...value, ...next });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="form-grid-2">
        <div className="field">
          <label>목표 성지 · 관문 등급</label>
          <select
            className="select"
            value={value.presetId}
            onChange={(e) => {
              const nextId = e.target.value;
              const found = presets.find((p) => p.id === nextId);
              patch({
                presetId: nextId,
                customBaseCost: found && nextId !== 'custom' ? '' : value.customBaseCost ?? 500,
              });
            }}
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.id === 'custom'
                  ? preset.label
                  : `${preset.label} (기본 ${preset.baseCost.toLocaleString()})`}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>표시 이름 (선택)</label>
          <input
            type="text"
            className="input"
            placeholder={selectedPreset?.label || '예: 남군 11렙 관문'}
            value={value.name || ''}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="field">
          <label>
            <span>기본 정철 소모량</span>
            {value.presetId !== 'custom' && (
              <span className="muted-note">비워두면 등급 기본값 사용</span>
            )}
          </label>
          <input
            type="number"
            min="0"
            className="input num"
            placeholder={String(selectedPreset?.baseCost ?? 0)}
            value={value.presetId === 'custom' ? value.customBaseCost ?? 0 : value.customBaseCost ?? ''}
            onChange={(e) =>
              patch({
                customBaseCost:
                  e.target.value === ''
                    ? value.presetId === 'custom'
                      ? 0
                      : ''
                    : Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </div>

        <div className="field">
          <label>기타 추가 소모 (주둔지/대영 등)</label>
          <input
            type="number"
            min="0"
            className="input num"
            placeholder="0"
            value={value.extraCost || ''}
            onChange={(e) =>
              patch({
                extraCost: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </div>
      </div>

      {value.presetId === 'custom' && (
        <div className="field">
          <label>목표 성지 · 관문 레벨 (연결 페널티 및 9렙 제한 판정용)</label>
          <input
            type="number"
            min="1"
            max="20"
            className="input num"
            placeholder="예: 12"
            value={value.customLevel ?? ''}
            onChange={(e) =>
              patch({
                customLevel: e.target.value === '' ? '' : Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </div>
      )}

      <div className="form-grid-2">
        <div className="field">
          <label>관로 연결 여부 (인접 여부)</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-option ${value.isConnected !== false ? 'active' : ''}`}
              onClick={() => patch({ isConnected: true })}
            >
              관로 인접 연결 (+0)
            </button>
            <button
              type="button"
              className={`toggle-option ${value.isConnected === false ? 'active-danger' : ''}`}
              onClick={() =>
                patch({
                  isConnected: false,
                  distanceCount: value.distanceCount || 1,
                })
              }
            >
              관로 미연결 (거리 비례)
            </button>
          </div>
        </div>

        <div className="field">
          <label>타 진영 시작지역 공격</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-option ${value.isEnemyZone !== true ? 'active' : ''}`}
              onClick={() => patch({ isEnemyZone: false })}
            >
              일반 지역 (×1.0)
            </button>
            <button
              type="button"
              className={`toggle-option ${value.isEnemyZone === true ? 'active-danger' : ''}`}
              onClick={() => patch({ isEnemyZone: true })}
            >
              타 진영 시작지역 (+50%)
            </button>
          </div>
        </div>
      </div>

      {cost.blockedByNoCityRule && (
        <div className="alert-line danger">
          <span>
            🚫 성지 연결 규칙 3: 동맹에 보유 성지가 없을 때는 9레벨 이하 성지만 점령할 수 있습니다.
          </span>
        </div>
      )}

      {value.isConnected === false && (
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {cost.penaltyExemptReason === 'no_city' ? (
            <div className="muted-note" style={{ color: '#7dd3fc' }}>
              ℹ️ 규칙 3 적용: 동맹에 성지가 없으므로 거리 페널티 없이 기본 수량만 소모됩니다.
            </div>
          ) : cost.penaltyExemptReason === 'pre_phase' ? (
            <div className="muted-note" style={{ color: '#7dd3fc' }}>
              ℹ️ 규칙 1 적용: 패업 [이릉의 결전] 단계 이전으로 설정되어 거리 페널티가 적용되지 않습니다.
            </div>
          ) : (
            <>
              <div className="form-grid-2">
                <div className="field">
                  <label>가로지른 성지 수 (누적 간격)</label>
                  <input
                    type="number"
                    min="1"
                    className="input num"
                    value={value.distanceCount ?? 1}
                    onChange={(e) =>
                      patch({ distanceCount: Math.max(1, Math.floor(Number(e.target.value) || 1)) })
                    }
                  />
                </div>

                <div className="field">
                  <label>
                    <span>간격 1칸당 추가 정철</span>
                    <span className="muted-note">
                      {bracketInfo.bracketLabel
                        ? `${bracketInfo.bracketLabel} 자동`
                        : '레벨 미지정'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input num"
                    placeholder={String(bracketInfo.unitCost)}
                    value={value.customUnitPenalty ?? ''}
                    onChange={(e) =>
                      patch({
                        customUnitPenalty:
                          e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
              </div>
              <div className="muted-note num">
                적용 규칙: {cost.level ? `${cost.level}레벨` : '목표'} 기준 간격 1칸당{' '}
                <strong style={{ color: '#f5c66b' }}>{cost.unitPenalty.toLocaleString()}</strong> ×{' '}
                {cost.distanceCount}칸 ={' '}
                <strong style={{ color: '#fbbf24' }}>+{cost.penaltyCost.toLocaleString()}</strong>
              </div>
            </>
          )}
        </div>
      )}

      <div className="cost-breakdown num">
        <span>
          기본 <strong>{cost.baseCost.toLocaleString()}</strong>
          {!cost.isConnected && cost.penaltyCost > 0 && (
            <>
              {' '}
              + 관로 미연결 <strong>{cost.penaltyCost.toLocaleString()}</strong> ({cost.distanceCount}칸 ×{' '}
              {cost.unitPenalty.toLocaleString()})
            </>
          )}
          {cost.isEnemyZone && (
            <>
              {' '}
              + 타 진영(+50%) <strong>{cost.enemySurcharge.toLocaleString()}</strong>
            </>
          )}
          {cost.extraCost > 0 && (
            <>
              {' '}
              + 기타 <strong>{cost.extraCost.toLocaleString()}</strong>
            </>
          )}
        </span>
        <span style={{ fontSize: '15px', fontWeight: 800, color: '#f5c66b' }}>
          총 필요 정철: {cost.totalCost.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
