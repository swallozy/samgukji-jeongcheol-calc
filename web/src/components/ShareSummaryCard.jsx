import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, MessageSquareShare } from 'lucide-react';
import {
  calculateSingleSiege,
  formatDateTimeKST,
  formatDuration,
  formatTimelineSummary,
  SEASON_META,
} from '@jeongcheol/core';
import { buildCardPayload, CARD_THEMES, renderSiegeCardPng } from '../utils/exportCard.js';

export function ShareSummaryCard({
  activeTab,
  allianceName,
  routeName,
  baseTimeMs,
  currentStock,
  baseHourlyRate,
  cap,
  boosts,
  rules,
  singleTarget,
  singleTargetTimeMs,
  simulation,
}) {
  const [viewMode, setViewMode] = useState('image');
  const [cardTheme, setCardTheme] = useState('obsidian');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [cardPreviewUrl, setCardPreviewUrl] = useState('');
  const [cardBlob, setCardBlob] = useState(null);

  const singleResult = useMemo(
    () =>
      calculateSingleSiege({
        currentStock,
        baseHourlyRate,
        cap,
        baseTime: baseTimeMs,
        targetTime: singleTargetTimeMs,
        target: singleTarget,
        boosts,
        rules,
      }),
    [currentStock, baseHourlyRate, cap, baseTimeMs, singleTargetTimeMs, singleTarget, boosts, rules]
  );

  const singleConnectionTag =
    singleResult.cost.penaltyExemptReason === 'no_city'
      ? '성지 미보유 기본 소모'
      : singleResult.cost.penaltyExemptReason === 'pre_phase'
      ? '이릉 결전 이전(연결 미적용)'
      : singleResult.cost.isConnected
      ? '관로 연결'
      : `관로 미연결 ${singleResult.cost.distanceCount}칸 +${singleResult.cost.penaltyCost.toLocaleString()}`;

  const singleText = [
    `[${SEASON_META.name}] ${allianceName || '동맹'} 정철 단건 계산`,
    `• 기준(${formatDateTimeKST(baseTimeMs)}): 보유 ${currentStock.toLocaleString()} / 상한 ${cap.toLocaleString()} · 생산 +${singleResult.effectiveStartRate}/시간`,
    `• 목표: ${singleResult.cost.presetLabel} (${singleConnectionTag}${
      singleResult.cost.isEnemyZone ? ', 타 진영 +50%' : ''
    })`,
    `• 필요 정철: ${singleResult.cost.totalCost.toLocaleString()} (예정 시각 ${formatDateTimeKST(
      singleResult.targetTimeMs
    )} 예상 보유 ${singleResult.projectedStock.toLocaleString()})`,
    singleResult.cost.blockedByNoCityRule
      ? `• 판정: 🚫 성지 미보유 시 9레벨 이하만 점령 가능`
      : singleResult.earliest.status === 'exceeds_cap'
      ? `• 판정: ❌ 보유 상한 초과 (불가)`
      : singleResult.canAffordAtTarget
      ? `• 판정: ✅ 가능 (소모 후 잔여 ${singleResult.remainingAfterSiege.toLocaleString()})`
      : `• 판정: ⚠️ ${singleResult.deficit.toLocaleString()} 부족 (최소 ${formatDateTimeKST(
          singleResult.earliest.timeMs
        )}, ${formatDuration(singleResult.earliest.waitMs)} 후 가능)`,
  ].join('\n');

  const summaryText =
    activeTab === 'single'
      ? singleText
      : formatTimelineSummary(simulation, {
          allianceName: `${allianceName || '동맹'}${routeName ? ` (${routeName})` : ''}`,
        });

  useEffect(() => {
    let cancelled = false;
    const payload = buildCardPayload({
      activeTab,
      allianceName,
      routeName,
      baseTimeMs,
      currentStock,
      cap,
      singleResult,
      simulation,
    });
    renderSiegeCardPng({ ...payload, theme: cardTheme }).then(({ dataUrl, blob }) => {
      if (!cancelled) {
        setCardPreviewUrl(dataUrl);
        setCardBlob(blob);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    allianceName,
    routeName,
    baseTimeMs,
    currentStock,
    cap,
    cardTheme,
    singleResult,
    simulation,
  ]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = summaryText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1800);
  };

  const handleDownloadPng = () => {
    if (!cardPreviewUrl) return;
    const link = document.createElement('a');
    const safeName = (routeName || allianceName || '정철_공성계획').replace(/[\\/:*?"<>|]/g, '_');
    link.download = `${safeName}.png`;
    link.href = cardPreviewUrl;
    link.click();
  };

  const handleCopyImage = async () => {
    if (!cardBlob || typeof ClipboardItem === 'undefined') {
      handleDownloadPng();
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': cardBlob })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 1800);
    } catch {
      handleDownloadPng();
    }
  };

  return (
    <aside className="card" style={{ position: 'sticky', top: '16px' }}>
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <MessageSquareShare size={18} color="#e5a93c" />
            공지 · 결과 카드 내보내기
          </h2>
          <p className="card-subtitle">
            디스코드·카톡방에 이미지 카드 또는 텍스트 공지로 바로 공유할 수 있습니다.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
        <div className="tabs">
          <button
            type="button"
            className={`tab-btn ${viewMode === 'image' ? 'active' : ''}`}
            style={{ padding: '6px 11px', fontSize: '12.5px' }}
            onClick={() => setViewMode('image')}
          >
            <ImageIcon size={14} /> 이미지 카드
          </button>
          <button
            type="button"
            className={`tab-btn ${viewMode === 'text' ? 'active' : ''}`}
            style={{ padding: '6px 11px', fontSize: '12.5px' }}
            onClick={() => setViewMode('text')}
          >
            텍스트 공지
          </button>
        </div>

        {viewMode === 'image' && (
          <div className="chip-row" style={{ alignItems: 'center' }}>
            {CARD_THEMES.map((themeOption) => (
              <button
                key={themeOption.id}
                type="button"
                className={`chip ${cardTheme === themeOption.id ? 'active' : ''}`}
                onClick={() => setCardTheme(themeOption.id)}
              >
                {themeOption.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewMode === 'image' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cardPreviewUrl ? (
            <img
              src={cardPreviewUrl}
              alt="정철 공성 결과 카드 미리보기"
              style={{
                width: '100%',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'block',
              }}
            />
          ) : (
            <div className="muted-note">결과 카드를 생성 중입니다...</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button type="button" className="btn btn-gold" onClick={handleDownloadPng}>
              <Download size={15} />
              PNG 저장
            </button>
            <button type="button" className="btn" onClick={handleCopyImage}>
              {copiedImage ? <Check size={15} /> : <Copy size={15} />}
              {copiedImage ? '이미지 복사됨!' : '이미지 복사'}
            </button>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleCopyText}>
            {copiedText ? <Check size={14} /> : <Copy size={14} />}
            {copiedText ? '텍스트 복사 완료!' : '텍스트 공지도 함께 복사'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <pre className="share-pre num">{summaryText}</pre>
          <button type="button" className="btn btn-gold" onClick={handleCopyText}>
            {copiedText ? <Check size={15} /> : <Copy size={15} />}
            {copiedText ? '복사 완료!' : '텍스트 공지 복사'}
          </button>
        </div>
      )}
    </aside>
  );
}
