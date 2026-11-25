import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, Clock, Minus, Plus } from 'lucide-react';
import { formatDateTimeKST } from '@jeongcheol/core';
import {
  buildDateTimeMs,
  clampTimeWithMin,
  floorToMinute,
  getNextClockHourMs,
  toLocalDateInput,
} from '../utils/time.js';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/**
 * 앱 공용 한국형 24시간 날짜·시각 선택기
 * - allowPast=false(기본)일 때 minTimeMs 이전 날짜·시간 선택 원천 차단
 * - variant="inline": 항상 펼쳐진 폼용
 * - variant="popover": 타임라인 카드/제철소 행용 컴팩트 버튼 + 팝오버
 */
export function DateTimePicker({
  id,
  valueMs,
  onChange,
  minTimeMs,
  allowPast = false,
  variant = 'inline',
  showQuickPresets = true,
  showNudge = true,
  quickPresets,
}) {
  const [open, setOpen] = useState(false);
  const [clampedHint, setClampedHint] = useState(false);
  const containerRef = useRef(null);

  const safeMinMs = allowPast ? undefined : floorToMinute(minTimeMs ?? Date.now());
  const effectiveValueMs = clampTimeWithMin(
    Number.isFinite(valueMs) ? valueMs : safeMinMs ?? Date.now(),
    safeMinMs
  );

  const currentDate = new Date(effectiveValueMs);
  const currentDateStr = toLocalDateInput(effectiveValueMs);
  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();

  const nowRef = new Date(safeMinMs ?? Date.now());
  const todayStr = toLocalDateInput(nowRef.getTime());
  const tomorrowStr = toLocalDateInput(
    new Date(nowRef.getFullYear(), nowRef.getMonth(), nowRef.getDate() + 1).getTime()
  );
  const dayAfterStr = toLocalDateInput(
    new Date(nowRef.getFullYear(), nowRef.getMonth(), nowRef.getDate() + 2).getTime()
  );

  useEffect(() => {
    if (!open || variant !== 'popover') return undefined;
    const onPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, variant]);

  const commitTime = (candidateMs) => {
    if (!Number.isFinite(candidateMs)) return;
    if (safeMinMs !== undefined && candidateMs < safeMinMs) {
      setClampedHint(true);
      setTimeout(() => setClampedHint(false), 1800);
      onChange(safeMinMs);
      return;
    }
    onChange(candidateMs);
  };

  const baseForPresets = safeMinMs ?? effectiveValueMs;
  const presets =
    quickPresets ??
    [
      { label: '+1시간', ms: baseForPresets + 1 * 3600000 },
      { label: '+3시간', ms: baseForPresets + 3 * 3600000 },
      { label: '+6시간', ms: baseForPresets + 6 * 3600000 },
      { label: '+12시간', ms: baseForPresets + 12 * 3600000 },
      { label: '오늘/다음 21:00', ms: getNextClockHourMs(baseForPresets, 21, false) },
      { label: '내일 21:00', ms: getNextClockHourMs(baseForPresets, 21, true) },
    ];

  const isHourDisabled = (hour) => {
    if (safeMinMs === undefined) return false;
    // 해당 시의 마지막 분(59분)조차 최소 시각 이전이면 비활성화
    const endOfHourMs = buildDateTimeMs(currentDateStr, hour, 59);
    return endOfHourMs < safeMinMs;
  };

  const isMinuteDisabled = (minute) => {
    if (safeMinMs === undefined) return false;
    const exactMs = buildDateTimeMs(currentDateStr, currentHour, minute);
    return exactMs < safeMinMs;
  };

  const pickerBody = (
    <div className="dtp-body">
      <div className="dtp-top-row">
        <div className="dtp-day-chips">
          {[
            { label: '오늘', dateStr: todayStr },
            { label: '내일', dateStr: tomorrowStr },
            { label: '모레', dateStr: dayAfterStr },
          ].map((day) => {
            const isDisabled =
              safeMinMs !== undefined && buildDateTimeMs(day.dateStr, 23, 59) < safeMinMs;
            return (
              <button
                key={day.label}
                type="button"
                disabled={isDisabled}
                className={`chip ${currentDateStr === day.dateStr ? 'active' : ''}`}
                onClick={() => {
                  const nextMs = buildDateTimeMs(day.dateStr, currentHour, currentMinute);
                  commitTime(nextMs);
                }}
              >
                {day.label}
              </button>
            );
          })}
          <label className="dtp-date-btn" title="달력에서 날짜 고르기">
            <Calendar size={13} />
            <input
              type="date"
              className="dtp-date-input num"
              value={currentDateStr}
              min={safeMinMs !== undefined ? toLocalDateInput(safeMinMs) : undefined}
              onChange={(e) => {
                if (!e.target.value) return;
                const nextMs = buildDateTimeMs(e.target.value, currentHour, currentMinute);
                commitTime(nextMs);
              }}
            />
          </label>
        </div>

        <div className="dtp-hm-row">
          <select
            aria-label="시"
            className="select dtp-select num"
            value={currentHour}
            onChange={(e) => {
              const nextHour = Number(e.target.value);
              commitTime(buildDateTimeMs(currentDateStr, nextHour, currentMinute));
            }}
          >
            {HOURS.map((h) => (
              <option key={h} value={h} disabled={isHourDisabled(h)}>
                {String(h).padStart(2, '0')}시
              </option>
            ))}
          </select>
          <span className="dtp-colon">:</span>
          <select
            aria-label="분"
            className="select dtp-select num"
            value={currentMinute}
            onChange={(e) => {
              const nextMin = Number(e.target.value);
              commitTime(buildDateTimeMs(currentDateStr, currentHour, nextMin));
            }}
          >
            {MINUTES.map((m) => (
              <option key={m} value={m} disabled={isMinuteDisabled(m)}>
                {String(m).padStart(2, '0')}분
              </option>
            ))}
          </select>
        </div>
      </div>

      {showQuickPresets && presets.length > 0 && (
        <div className="chip-row">
          {presets.map((preset) => {
            const disabled = safeMinMs !== undefined && preset.ms < safeMinMs;
            return (
              <button
                key={preset.label}
                type="button"
                disabled={disabled}
                className="chip"
                onClick={() => commitTime(preset.ms)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}

      {clampedHint && (
        <div className="muted-note" style={{ color: '#fbbf24' }}>
          현재 시각 이전은 선택할 수 없어 가능한 가장 빠른 시각으로 맞춰졌습니다.
        </div>
      )}
    </div>
  );

  if (variant === 'popover') {
    const canSubHour = safeMinMs === undefined || effectiveValueMs > safeMinMs;
    return (
      <div className="dtp-popover-wrap" ref={containerRef}>
        <div className="dtp-compact-bar">
          <button
            id={id}
            type="button"
            className={`dtp-trigger num ${open ? 'open' : ''}`}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            <Clock size={13} color="#e5a93c" />
            <span>{formatDateTimeKST(effectiveValueMs)}</span>
            <ChevronDown size={13} />
          </button>
          {showNudge && (
            <>
              <button
                type="button"
                className="dtp-nudge"
                title="1시간 전"
                disabled={!canSubHour}
                onClick={() => commitTime(effectiveValueMs - 3600000)}
              >
                <Minus size={12} />
                1h
              </button>
              <button
                type="button"
                className="dtp-nudge"
                title="1시간 후"
                onClick={() => commitTime(effectiveValueMs + 3600000)}
              >
                <Plus size={12} />
                1h
              </button>
            </>
          )}
        </div>

        {open && <div className="dtp-popover-panel">{pickerBody}</div>}
      </div>
    );
  }

  return (
    <div id={id} className="dtp-inline-card">
      <div className="dtp-inline-preview num">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} color="#e5a93c" />
          <strong>{formatDateTimeKST(effectiveValueMs)}</strong>
        </span>
        {!allowPast && <span className="muted-note">현재 시각 이후만 선택 가능</span>}
      </div>
      {pickerBody}
    </div>
  );
}
