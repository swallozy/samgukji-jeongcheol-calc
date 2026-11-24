/**
 * 《삼국지: 천하결전》 한국 서버 W2 '남군의 봉화' 정철 기준 데이터
 * - 인게임 [성지 연결 규칙] 및 확인 수치 기반
 * - 추후 밸런스 패치나 미확인 항목 확인 시 이 파일만 업데이트하면
 *   웹 앱과 디스코드 봇에 동시에 반영됩니다.
 */

export const SEASON_META = {
  id: 'kr-w2-nanggun',
  name: '한국서버 W2 · 남군의 봉화',
  defaultCap: 10000,
  earlyPhaseCapNote: 'W2 일반 보유 상한 10,000 기준 (초반 패업 단계 등 상한이 다를 경우 상단에서 직접 조정 가능)',
  defaultHourlyRate: 112,
  connectionRulePhaseName: '이릉의 결전',
  noCityMaxLevel: 9,
};

export const ENEMY_ZONE_MULTIPLIER = 1.5;

/**
 * 성지 / 관문 등급별 공성 주둔지 기본 정철 소모량 (한섭 W2 확인분)
 */
export const SIEGE_TARGET_PRESETS = [
  { id: 'city-4', label: '4렙 공성지', category: '성지', level: 4, baseCost: 500, verified: true },
  { id: 'city-6', label: '6렙 공성지', category: '성지', level: 6, baseCost: 750, verified: true },
  { id: 'city-8', label: '8렙 공성지', category: '성지', level: 8, baseCost: 1000, verified: true },
  { id: 'city-9', label: '9렙 공성지', category: '성지', level: 9, baseCost: 1000, verified: true },
  { id: 'city-10', label: '10렙 공성지', category: '성지', level: 10, baseCost: 1500, verified: true },
  { id: 'city-11', label: '11렙 공성지', category: '성지', level: 11, baseCost: 1500, verified: true },
  { id: 'gate-11', label: '11렙 관문', category: '관문', level: 11, baseCost: 1500, verified: true },
  { id: 'city-13', label: '13렙 공성지', category: '성지', level: 13, baseCost: 2000, verified: true },
  { id: 'city-14', label: '14렙 공성지', category: '성지', level: 14, baseCost: 2500, verified: true },
  { id: 'city-15', label: '15렙 공성지', category: '성지', level: 15, baseCost: 2500, verified: true },
  { id: 'city-16', label: '16렙 공성지', category: '성지', level: 16, baseCost: 3000, verified: true },
  { id: 'city-18', label: '18렙 공성지', category: '성지', level: 18, baseCost: 4500, verified: true },
  { id: 'city-20', label: '20렙 공성지', category: '성지', level: 20, baseCost: 6000, verified: true },
  {
    id: 'custom',
    label: '직접 입력 (난공불락 / 기타 등급)',
    category: '기타',
    level: null,
    baseCost: 0,
    verified: false,
  },
];

/**
 * 인게임 [성지 연결 규칙] — 목표 성지·관문 레벨별 거리 간격 1칸당 정철 증가량
 * - 패업 [이릉의 결전] 단계부터 적용
 * - 동맹에 성지가 없을 경우 9레벨 이하만 점령 가능하며 기본 수량만 소모
 */
export const LEVEL_BRACKET_PENALTIES = [
  { id: 'bracket-4-8', label: '4~8레벨', minLevel: 4, maxLevel: 8, penalty: 500, verified: true },
  { id: 'bracket-9-12', label: '9~12레벨', minLevel: 9, maxLevel: 12, penalty: 1500, verified: true },
  { id: 'bracket-13-20', label: '13~20레벨', minLevel: 13, maxLevel: 20, penalty: 3000, verified: true },
];

/**
 * 9렙 이상 성지 제철소 레벨별 시간당 정철 생산량
 */
export const IRONWORKS_LEVELS = [
  {
    level: 1,
    label: '제철소 1렙 (+4/시간)',
    hourlyGain: 4,
    verified: true,
    note: '9렙 성지 이상 건설 가능 · 확인됨',
  },
  {
    level: 2,
    label: '제철소 2렙 (+7/시간)',
    hourlyGain: 7,
    verified: true,
    note: '9렙 성지 이상 건설 가능 · 확인됨',
  },
  {
    level: 3,
    label: '제철소 3렙 (+10/시간)',
    hourlyGain: 10,
    verified: true,
    note: '9렙 성지 이상 건설 가능 · 확인됨',
  },
];
