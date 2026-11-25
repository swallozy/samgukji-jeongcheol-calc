import React from 'react';
import { BookOpen, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { IRONWORKS_LEVELS } from '@jeongcheol/core';

export function ReferenceModal({ open, onClose, rules, onUpdateRules, onResetRules }) {
  if (!open) return null;

  const editablePresets = rules.presets.filter((p) => p.id !== 'custom');

  const updatePreset = (id, patch) => {
    onUpdateRules({
      ...rules,
      presets: rules.presets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const removePreset = (id) => {
    onUpdateRules({
      ...rules,
      presets: rules.presets.filter((p) => p.id !== id),
    });
  };

  const addPreset = () => {
    const newItem = {
      id: `city-custom-${Date.now()}`,
      label: '새 등급 성지',
      category: '성지',
      level: 12,
      baseCost: 1500,
      verified: false,
    };
    onUpdateRules({ ...rules, presets: [...editablePresets, newItem] });
  };

  const updateBracket = (id, patch) => {
    onUpdateRules({
      ...rules,
      brackets: rules.brackets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  };

  const addBracket = () => {
    onUpdateRules({
      ...rules,
      brackets: [
        ...rules.brackets,
        { id: `bracket-${Date.now()}`, minLevel: 1, maxLevel: 3, penalty: 500 },
      ],
    });
  };

  const removeBracket = (id) => {
    onUpdateRules({
      ...rules,
      brackets: rules.brackets.filter((b) => b.id !== id),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="한국 서버 W2 · 남군의 봉화 기준표 및 수치 편집"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <BookOpen size={18} color="#e5a93c" />
              한국 서버 W2 · 남군의 봉화 기준표 및 수치 편집
            </h2>
            <p className="card-subtitle">
              인게임 공식 [성지 연결 규칙]과 W2 확인 수치가 반영되어 있습니다. 필요 시 직접 수정 가능합니다.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onResetRules}>
              <RotateCcw size={14} /> W2 기본값 복원
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              <X size={16} /> 닫기
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-gold)',
              fontSize: '13px',
              lineHeight: 1.65,
            }}
          >
            <strong style={{ color: '#f5c66b', display: 'block', marginBottom: '4px' }}>
              인게임 공식 [성지 연결 규칙 · 공성 주둔지 소모 기준]
            </strong>
            <div>
              1. <strong>성지 연결 규칙</strong> 적용 시 성지 점령에 아군 성지·관문과의 관로 연결 상태가 반영됩니다.
            </div>
            <div>
              2. 아군 성지·관문과 <strong>관로</strong>로 연결되지 않으면 레벨별 단가가 적용되며, 여러 성지를 가로지르면{' '}
              <strong>계속해서 누적</strong>됩니다.
            </div>
            <div>
              3. 동맹에 성지가 없을 경우 <strong>9레벨 이하 성지만 점령</strong>할 수 있으며, 정철은{' '}
              <strong>기본 수량만 소모</strong>됩니다.
            </div>
            <div>
              4. <strong>타 진영 시작 지역</strong> 성지 공격 시 공성 주둔지 건설 정철 총량의 <strong>50%를 추가 소모</strong>합니다.
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '14px' }}>
                1. 관로 미연결 시 거리 간격 1칸당 추가 정철 (목표 레벨별)
              </h3>
              <button type="button" className="btn btn-sm" onClick={addBracket}>
                <Plus size={13} /> 구간 추가
              </button>
            </div>
            <table className="ref-table num">
              <thead>
                <tr>
                  <th>최소 레벨</th>
                  <th>최대 레벨</th>
                  <th>1칸당 추가 정철</th>
                  <th style={{ width: '48px' }}></th>
                </tr>
              </thead>
              <tbody>
                {rules.brackets.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="input num"
                        style={{ padding: '5px 8px', fontSize: '13px' }}
                        value={b.minLevel}
                        onChange={(e) =>
                          updateBracket(b.id, { minLevel: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="input num"
                        style={{ padding: '5px 8px', fontSize: '13px' }}
                        value={b.maxLevel}
                        onChange={(e) =>
                          updateBracket(b.id, { maxLevel: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="input num"
                        style={{ padding: '5px 8px', fontSize: '13px' }}
                        value={b.penalty}
                        onChange={(e) =>
                          updateBracket(b.id, { penalty: Math.max(0, Number(e.target.value) || 0) })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger-ghost"
                        title="삭제"
                        onClick={() => removeBracket(b.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '14px' }}>2. 성지 · 관문 기본 정철 소모량 (수정 가능)</h3>
              <button type="button" className="btn btn-sm" onClick={addPreset}>
                <Plus size={13} /> 등급 추가
              </button>
            </div>
            <table className="ref-table num">
              <thead>
                <tr>
                  <th>이름</th>
                  <th style={{ width: '80px' }}>레벨</th>
                  <th style={{ width: '120px' }}>기본 소모량</th>
                  <th style={{ width: '48px' }}></th>
                </tr>
              </thead>
              <tbody>
                {editablePresets.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input
                        type="text"
                        className="input"
                        style={{ padding: '5px 8px', fontSize: '13px' }}
                        value={p.label}
                        onChange={(e) => updatePreset(p.id, { label: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="input num"
                        style={{ padding: '5px 8px', fontSize: '13px' }}
                        value={p.level ?? ''}
                        onChange={(e) =>
                          updatePreset(p.id, {
                            level: e.target.value === '' ? null : Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="input num"
                        style={{ padding: '5px 8px', fontSize: '13px' }}
                        value={p.baseCost}
                        onChange={(e) =>
                          updatePreset(p.id, { baseCost: Math.max(0, Number(e.target.value) || 0) })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger-ghost"
                        title="삭제"
                        onClick={() => removePreset(p.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '14px' }}>3. 제철소(9렙 이상 성지) 및 기타 규칙</h3>
            <table className="ref-table num">
              <thead>
                <tr>
                  <th>항목</th>
                  <th>수치</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {IRONWORKS_LEVELS.map((lvl) => (
                  <tr key={lvl.level}>
                    <td>제철소 {lvl.level}렙</td>
                    <td>
                      <strong>+{lvl.hourlyGain}/시간</strong>
                    </td>
                    <td>
                      <span className="badge badge-emerald">{lvl.note}</span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>타 진영 시작지역 공격</td>
                  <td>
                    <strong>× 1.5 (+50% 추가)</strong>
                  </td>
                  <td>
                    <span className="badge badge-emerald">적용됨</span>
                  </td>
                </tr>
                <tr>
                  <td>정철 보유 상한 (W2)</td>
                  <td>
                    <strong>10,000</strong>
                  </td>
                  <td>
                    <span className="badge badge-emerald">확인됨</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
