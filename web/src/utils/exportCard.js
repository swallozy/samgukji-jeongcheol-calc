import { formatDateTimeKST, formatDuration, SEASON_META } from '@jeongcheol/core';

export const CARD_THEMES = [
  { id: 'obsidian', label: '흑철 골드' },
  { id: 'navy', label: '청룡 네이비' },
  { id: 'crimson', label: '적벽 크림슨' },
  { id: 'clean', label: '모던 화이트' },
];

const THEMES = {
  obsidian: {
    bg: '#090d14',
    cardBg: '#111827',
    headerBg: '#172033',
    rowAltBg: 'rgba(255, 255, 255, 0.025)',
    border: 'rgba(229, 169, 60, 0.45)',
    innerDivider: 'rgba(148, 163, 184, 0.16)',
    badgeBg: 'rgba(229, 169, 60, 0.16)',
    badgeBorder: 'rgba(229, 169, 60, 0.5)',
    badgeText: '#f5c66b',
    indexBg: '#e5a93c',
    indexText: '#0f172a',
    title: '#f8fafc',
    text: '#f1f5f9',
    muted: '#94a3b8',
    cost: '#f5c66b',
    okBg: 'rgba(52, 211, 153, 0.14)',
    okText: '#34d399',
    warnBg: 'rgba(251, 191, 36, 0.15)',
    warnText: '#fbbf24',
    dangerBg: 'rgba(239, 68, 68, 0.16)',
    dangerText: '#f87171',
    enemyBg: 'rgba(56, 189, 248, 0.15)',
    enemyText: '#7dd3fc',
    mutedPillBg: 'rgba(148, 163, 184, 0.16)',
    mutedPillText: '#cbd5e1',
    accentLine: '#e5a93c',
  },
  navy: {
    bg: '#060e1c',
    cardBg: '#0c192c',
    headerBg: '#112440',
    rowAltBg: 'rgba(56, 189, 248, 0.04)',
    border: 'rgba(56, 189, 248, 0.45)',
    innerDivider: 'rgba(148, 163, 184, 0.18)',
    badgeBg: 'rgba(56, 189, 248, 0.16)',
    badgeBorder: 'rgba(56, 189, 248, 0.5)',
    badgeText: '#7dd3fc',
    indexBg: '#38bdf8',
    indexText: '#081221',
    title: '#f0f9ff',
    text: '#e0f2fe',
    muted: '#93c5fd',
    cost: '#38bdf8',
    okBg: 'rgba(45, 212, 191, 0.16)',
    okText: '#2dd4bf',
    warnBg: 'rgba(251, 191, 36, 0.16)',
    warnText: '#fcd34d',
    dangerBg: 'rgba(248, 113, 113, 0.18)',
    dangerText: '#fca5a5',
    enemyBg: 'rgba(168, 85, 247, 0.18)',
    enemyText: '#d8b4fe',
    mutedPillBg: 'rgba(147, 197, 253, 0.15)',
    mutedPillText: '#bfdbfe',
    accentLine: '#38bdf8',
  },
  crimson: {
    bg: '#14090c',
    cardBg: '#1f0e13',
    headerBg: '#2c131a',
    rowAltBg: 'rgba(248, 113, 113, 0.04)',
    border: 'rgba(239, 68, 68, 0.48)',
    innerDivider: 'rgba(252, 165, 165, 0.14)',
    badgeBg: 'rgba(220, 38, 38, 0.22)',
    badgeBorder: 'rgba(248, 113, 113, 0.5)',
    badgeText: '#fca5a5',
    indexBg: '#dc2626',
    indexText: '#fff1f2',
    title: '#fff1f2',
    text: '#ffe4e6',
    muted: '#d6a5ad',
    cost: '#fbbf24',
    okBg: 'rgba(52, 211, 153, 0.15)',
    okText: '#6ee7b7',
    warnBg: 'rgba(251, 191, 36, 0.18)',
    warnText: '#fde68a',
    dangerBg: 'rgba(239, 68, 68, 0.22)',
    dangerText: '#fca5a5',
    enemyBg: 'rgba(96, 165, 250, 0.18)',
    enemyText: '#93c5fd',
    mutedPillBg: 'rgba(252, 165, 165, 0.14)',
    mutedPillText: '#fecaca',
    accentLine: '#ef4444',
  },
  clean: {
    bg: '#e2e8f0',
    cardBg: '#ffffff',
    headerBg: '#0f172a',
    rowAltBg: '#f8fafc',
    border: '#cbd5e1',
    innerDivider: '#e2e8f0',
    badgeBg: 'rgba(56, 189, 248, 0.18)',
    badgeBorder: 'rgba(56, 189, 248, 0.45)',
    badgeText: '#7dd3fc',
    indexBg: '#0f172a',
    indexText: '#ffffff',
    title: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
    cost: '#0369a1',
    okBg: '#dcfce7',
    okText: '#15803d',
    warnBg: '#fef3c7',
    warnText: '#b45309',
    dangerBg: '#fee2e2',
    dangerText: '#b91c1c',
    enemyBg: '#e0e7ff',
    enemyText: '#3730a3',
    mutedPillBg: '#e2e8f0',
    mutedPillText: '#475569',
    accentLine: '#0284c7',
    headerMuted: '#94a3b8',
  },
};

function drawRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
  if (!text || maxWidth <= 0) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  const ellipsisWidth = ctx.measureText(ellipsis).width;
  if (ellipsisWidth >= maxWidth) return ellipsis;
  let end = text.length;
  while (end > 0 && ctx.measureText(text.slice(0, end)).width + ellipsisWidth > maxWidth) {
    end -= 1;
  }
  return `${text.slice(0, end)}${ellipsis}`;
}

function measurePillWidth(ctx, text) {
  ctx.font = '700 11px "Noto Sans KR", "Malgun Gothic", sans-serif';
  return Math.ceil(ctx.measureText(text).width) + 16;
}

function drawPill(ctx, x, y, text, bgColor, textColor, borderColor = null) {
  ctx.font = '700 11px "Noto Sans KR", "Malgun Gothic", sans-serif';
  const padX = 8;
  const w = Math.ceil(ctx.measureText(text).width) + padX * 2;
  const h = 20;
  drawRoundRect(ctx, x, y, w, h, 999);
  ctx.fillStyle = bgColor;
  ctx.fill();
  if (borderColor) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  }
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2 + 0.5);
  return w;
}

function getPenaltyTag(cost) {
  if (cost.penaltyExemptReason === 'no_city') {
    return { text: '무성지 기본', style: 'muted' };
  }
  if (cost.penaltyExemptReason === 'pre_phase') {
    return { text: '규칙 미적용', style: 'muted' };
  }
  if (cost.isConnected) return null;
  return { text: `미연결 ${cost.distanceCount}칸`, style: 'warn' };
}

/**
 * 1320px(2x Retina) 모던 전술형 공성 정철 결과 카드를 Canvas에 그려 DataURL과 Blob을 반환합니다.
 */
export async function renderSiegeCardPng({
  theme = 'obsidian',
  title = '공성 정철 계획',
  subtitle = SEASON_META.name,
  baseTimeLabel = '',
  currentStock = 0,
  cap = 10000,
  hourlyRate = 112,
  steps = [],
  totalCost = 0,
  finalStock = 0,
  totalOverflow = 0,
  totalWaitMs = 0,
  hasShortage = false,
  footerStatusOverride = null,
}) {
  const palette = THEMES[theme] ?? THEMES.obsidian;
  const scale = 2;
  const width = 660;
  const outerPad = 14;
  const cardX = outerPad;
  const cardW = width - outerPad * 2;

  const headerHeight = 112;
  const statsBarHeight = 46;
  const rowHeight = 70;
  const emptyRowsHeight = steps.length === 0 ? 72 : steps.length * rowHeight;
  const footerHeight = 84;
  const cardH = headerHeight + statsBarHeight + emptyRowsHeight + footerHeight;
  const height = cardH + outerPad * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  const font = '"Noto Sans KR", "Malgun Gothic", sans-serif';

  // Backdrop
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  // Main rounded card
  ctx.save();
  drawRoundRect(ctx, cardX, outerPad, cardW, cardH, 14);
  ctx.fillStyle = palette.cardBg;
  ctx.fill();
  ctx.clip();

  // Header band
  ctx.fillStyle = palette.headerBg;
  ctx.fillRect(cardX, outerPad, cardW, headerHeight);

  // Top accent stripe
  ctx.fillStyle = palette.accentLine;
  ctx.fillRect(cardX, outerPad, cardW, 4);

  // Header left badge
  drawPill(
    ctx,
    cardX + 24,
    outerPad + 20,
    subtitle,
    palette.badgeBg,
    palette.badgeText,
    palette.badgeBorder
  );

  // Header right timestamp
  if (baseTimeLabel) {
    ctx.font = `600 11.5px ${font}`;
    ctx.fillStyle = palette.headerMuted ?? palette.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(baseTimeLabel, cardX + cardW - 24, outerPad + 30);
  }

  // Header title
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = palette.title;
  ctx.font = `800 22px ${font}`;
  ctx.fillText(truncateText(ctx, title, cardW - 48), cardX + 24, outerPad + 84);

  // Stats strip right below header
  const statsY = outerPad + headerHeight;
  ctx.fillStyle = palette.rowAltBg;
  ctx.fillRect(cardX, statsY, cardW, statsBarHeight);

  ctx.strokeStyle = palette.innerDivider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX, statsY + statsBarHeight);
  ctx.lineTo(cardX + cardW, statsY + statsBarHeight);
  ctx.stroke();

  ctx.font = `600 12.5px ${font}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = palette.muted;
  ctx.fillText(
    `보유 ${currentStock.toLocaleString()} / 상한 ${cap.toLocaleString()}   ·   생산 +${hourlyRate.toLocaleString()}/시간`,
    cardX + 24,
    statsY + statsBarHeight / 2
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = palette.cost;
  ctx.font = `700 12.5px ${font}`;
  ctx.fillText(`총 ${steps.length}건 공성 일정`, cardX + cardW - 24, statsY + statsBarHeight / 2);

  // Steps list
  let y = statsY + statsBarHeight;
  if (steps.length === 0) {
    ctx.fillStyle = palette.muted;
    ctx.font = `500 14px ${font}`;
    ctx.textAlign = 'center';
    ctx.fillText('등록된 공성 일정이 없습니다.', width / 2, y + 36);
    y += 72;
  } else {
    steps.forEach((step, idx) => {
      if (idx % 2 === 1) {
        ctx.fillStyle = palette.rowAltBg;
        ctx.fillRect(cardX, y, cardW, rowHeight);
      }

      // Number badge
      const badgeSize = 24;
      const badgeX = cardX + 24;
      const badgeY = y + 14;
      drawRoundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 7);
      ctx.fillStyle = palette.indexBg;
      ctx.fill();

      ctx.fillStyle = palette.indexText;
      ctx.font = `800 12.5px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 0.5);

      // Right-column width reservation so left labels/pills never collide with cost text
      const costText = `${step.totalCost.toLocaleString()} 정철`;
      ctx.font = `800 16px ${font}`;
      const costWidth = ctx.measureText(costText).width;
      const rightEdgeX = cardX + cardW - 24;
      const maxLeftRightX = rightEdgeX - costWidth - 14;

      const pills = [];
      const penaltyBadge =
        step.penaltyBadge ?? (step.penaltyLabel ? { text: step.penaltyLabel, style: 'warn' } : null);
      if (penaltyBadge) pills.push(penaltyBadge);
      if (step.isEnemyZone) pills.push({ text: '적진 +50%', style: 'enemy' });

      const pillsWidth = pills.reduce(
        (acc, p) => acc + measurePillWidth(ctx, p.text) + 6,
        0
      );
      let levelWidth = 0;
      if (step.levelText) {
        ctx.font = `600 12.5px ${font}`;
        levelWidth = ctx.measureText(step.levelText).width + 8;
      }

      // Step title + tags (truncated within safe budget)
      const leftStartX = badgeX + badgeSize + 10;
      let cursorX = leftStartX;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = palette.text;
      ctx.font = `700 15px ${font}`;
      const availableLabelWidth = Math.max(96, maxLeftRightX - leftStartX - levelWidth - pillsWidth);
      const renderedLabel = truncateText(ctx, step.label, availableLabelWidth);
      ctx.fillText(renderedLabel, cursorX, badgeY + 12);
      cursorX += ctx.measureText(renderedLabel).width + 8;

      if (step.levelText && cursorX + levelWidth - 8 <= maxLeftRightX) {
        ctx.fillStyle = palette.muted;
        ctx.font = `600 12.5px ${font}`;
        ctx.fillText(step.levelText, cursorX, badgeY + 12);
        cursorX += ctx.measureText(step.levelText).width + 8;
      }

      for (const pill of pills) {
        const pw = measurePillWidth(ctx, pill.text);
        if (cursorX + pw > rightEdgeX - costWidth - 8) break;
        const pillBg =
          pill.style === 'enemy'
            ? palette.enemyBg
            : pill.style === 'muted'
            ? palette.mutedPillBg
            : palette.warnBg;
        const pillText =
          pill.style === 'enemy'
            ? palette.enemyText
            : pill.style === 'muted'
            ? palette.mutedPillText
            : palette.warnText;
        const drawnW = drawPill(ctx, cursorX, badgeY + 2, pill.text, pillBg, pillText);
        cursorX += drawnW + 6;
      }

      // Right side: cost + status
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = step.blocked || step.exceedsCap ? palette.dangerText : palette.cost;
      ctx.font = `800 16px ${font}`;
      ctx.fillText(costText, rightEdgeX, badgeY + 12);

      ctx.font = `600 12px ${font}`;
      const subText = truncateText(ctx, step.subStatusText, cardW * 0.56);
      const subWidth = ctx.measureText(subText).width;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle =
        step.blocked || step.exceedsCap
          ? palette.dangerText
          : step.affordable
          ? palette.okText
          : palette.warnText;
      ctx.fillText(subText, rightEdgeX, y + 53);

      // Left subline: timestamp (truncated before subStatusText)
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = palette.muted;
      ctx.font = `500 12px ${font}`;
      const maxTimeWidth = Math.max(100, rightEdgeX - subWidth - 12 - leftStartX);
      ctx.fillText(truncateText(ctx, step.timeLabel, maxTimeWidth), leftStartX, y + 53);

      if (idx < steps.length - 1) {
        ctx.strokeStyle = palette.innerDivider;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 20, y + rowHeight);
        ctx.lineTo(cardX + cardW - 20, y + rowHeight);
        ctx.stroke();
      }

      y += rowHeight;
    });
  }

  // Footer
  ctx.fillStyle = palette.rowAltBg;
  ctx.fillRect(cardX, y, cardW, footerHeight);
  ctx.strokeStyle = palette.innerDivider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX, y);
  ctx.lineTo(cardX + cardW, y);
  ctx.stroke();

  // Footer left: remaining & overflow note
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = palette.text;
  ctx.font = `700 14px ${font}`;
  ctx.fillText(`최종 예상 잔여: ${finalStock.toLocaleString()} 정철`, cardX + 24, y + 34);

  ctx.fillStyle = totalOverflow > 0 ? palette.warnText : palette.muted;
  ctx.font = `500 12px ${font}`;
  ctx.fillText(
    totalOverflow > 0
      ? `⚠️ 대기 중 상한 초과 손실 -${totalOverflow.toLocaleString()} 정철`
      : '상한 초과 손실 없음',
    cardX + 24,
    y + 58
  );

  // Footer right: total cost & duration
  ctx.textAlign = 'right';
  ctx.fillStyle = palette.cost;
  ctx.font = `800 19px ${font}`;
  ctx.fillText(`총 ${totalCost.toLocaleString()} 정철`, cardX + cardW - 24, y + 35);

  ctx.font = `700 12px ${font}`;
  ctx.fillStyle = hasShortage ? palette.dangerText : palette.okText;
  const footerStatus =
    footerStatusOverride ??
    (hasShortage
      ? '일부 일정 조정 필요 (부족 / 규칙 확인)'
      : totalWaitMs <= 0
      ? '지금 바로 모두 진행 가능'
      : `완료까지 약 ${formatDuration(totalWaitMs)} 소요`);
  ctx.fillText(truncateText(ctx, footerStatus, cardW * 0.56), cardX + cardW - 24, y + 58);

  ctx.restore();

  // Outer card border
  drawRoundRect(ctx, cardX, outerPad, cardW, cardH, 14);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = palette.border;
  ctx.stroke();

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return { dataUrl, blob };
}

/**
 * 단건 또는 타임라인 데이터를 PNG 카드 렌더러용 입력 구조로 변환
 */
export function buildCardPayload({
  activeTab,
  allianceName,
  routeName,
  baseTimeMs,
  currentStock,
  cap,
  singleResult,
  simulation,
}) {
  const title =
    activeTab === 'single'
      ? `${allianceName || '동맹'} · ${singleResult.cost.presetLabel}`
      : `${allianceName || '동맹'} · ${routeName?.trim() || '정철 공성 루트'}`;

  const baseTimeLabel = `기준 ${formatDateTimeKST(baseTimeMs)}`;

  if (activeTab === 'single') {
    const penaltyBadge = getPenaltyTag(singleResult.cost);
    const step = {
      label: singleResult.cost.presetLabel,
      levelText: singleResult.cost.level ? `Lv.${singleResult.cost.level}` : '',
      penaltyBadge,
      penaltyLabel: penaltyBadge?.text ?? null,
      isEnemyZone: singleResult.cost.isEnemyZone,
      timeLabel: `목표 ${formatDateTimeKST(singleResult.targetTimeMs)}`,
      totalCost: singleResult.cost.totalCost,
      blocked: singleResult.cost.blockedByNoCityRule,
      exceedsCap: singleResult.earliest.status === 'exceeds_cap',
      affordable: singleResult.canAffordAtTarget,
      subStatusText: singleResult.cost.blockedByNoCityRule
        ? '무성지 9렙 이하만 가능'
        : singleResult.earliest.status === 'exceeds_cap'
        ? '보유 상한 초과'
        : singleResult.canAffordAtTarget
        ? `가능 · 잔여 ${singleResult.remainingAfterSiege.toLocaleString()}`
        : `${singleResult.deficit.toLocaleString()} 부족 · ${formatDuration(
            singleResult.earliest.waitMs
          )} 후 가능`,
    };

    const singleFooterStatus = singleResult.cost.blockedByNoCityRule
      ? '무성지 9렙 이하만 점령 가능'
      : singleResult.earliest.status === 'exceeds_cap'
      ? '보유 상한 초과 (불가)'
      : !singleResult.canAffordAtTarget && singleResult.earliest?.timeMs
      ? `일정 조정 필요 · ${formatDateTimeKST(singleResult.earliest.timeMs)} 가능`
      : null;

    return {
      title,
      subtitle: SEASON_META.name,
      baseTimeLabel,
      currentStock,
      cap,
      hourlyRate: singleResult.effectiveStartRate,
      steps: [step],
      totalCost: singleResult.cost.totalCost,
      finalStock: Math.max(0, singleResult.remainingAfterSiege),
      totalOverflow: singleResult.overflowLoss,
      totalWaitMs: Math.max(0, singleResult.targetTimeMs - baseTimeMs),
      hasShortage: !singleResult.canAffordAtTarget || singleResult.cost.blockedByNoCityRule,
      footerStatusOverride: singleFooterStatus,
    };
  }

  return {
    title,
    subtitle: SEASON_META.name,
    baseTimeLabel,
    currentStock: simulation.currentStock,
    cap: simulation.cap,
    hourlyRate: simulation.effectiveStartRate,
    steps: simulation.steps.map((step) => {
      const penaltyBadge = getPenaltyTag(step.cost);
      return {
        label: step.cost.presetLabel,
        levelText: step.cost.level ? `Lv.${step.cost.level}` : '',
        penaltyBadge,
        penaltyLabel: penaltyBadge?.text ?? null,
        isEnemyZone: step.cost.isEnemyZone,
        timeLabel: formatDateTimeKST(step.scheduledMs),
        totalCost: step.cost.totalCost,
        blocked: step.cost.blockedByNoCityRule,
        exceedsCap: step.exceedsCap,
        affordable: step.affordable,
        subStatusText: step.cost.blockedByNoCityRule
          ? '무성지 9렙 이하만 가능'
          : step.exceedsCap
          ? '상한 초과'
          : step.affordable
          ? `${formatDuration(step.waitFromBaseMs)} · 잔여 ${step.afterSpend.toLocaleString()}`
          : `${step.deficit.toLocaleString()} 부족 (최소 ${formatDateTimeKST(step.earliest?.timeMs)})`,
      };
    }),
    totalCost: simulation.summary.totalCost,
    finalStock: simulation.summary.finalStock,
    totalOverflow: simulation.summary.totalOverflow,
    totalWaitMs: simulation.summary.totalWaitMs,
    hasShortage:
      simulation.summary.hasShortage ||
      simulation.summary.hasCapExceed ||
      simulation.summary.hasNoCityRuleBlock,
  };
}
