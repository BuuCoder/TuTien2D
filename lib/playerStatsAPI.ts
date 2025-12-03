/**
 * Player Stats API Helper
 * 
 * Các hàm helper để tương tác với API quản lý HP/Mana một cách an toàn.
 * Tất cả các thao tác đều được validate ở server-side.
 */

interface PlayerAuth {
  userId: number;
  sessionId: string;
  token: string;
}

interface StatsResponse {
  success: boolean;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  error?: string;
}

interface HealResponse extends StatsResponse {
  healed?: number;
}

interface UseSkillResponse extends StatsResponse {
  damage?: number;
  mpCost?: number;
}

interface TakeDamageResponse extends StatsResponse {
  damage?: number;
  isDead?: boolean;
}

interface GetStatsResponse {
  success: boolean;
  stats?: {
    hp: number;
    max_hp: number;
    mp: number;
    max_mp: number;
    level: number;
    experience: number;
  };
  error?: string;
}

/**
 * Lấy stats hiện tại từ database
 */
export async function getPlayerStats(auth: PlayerAuth): Promise<GetStatsResponse> {
  try {
    const response = await fetch('/api/player/get-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auth)
    });

    return await response.json();
  } catch (error) {
    console.error('[PlayerStatsAPI] Get stats error:', error);
    return { success: false, error: 'Lỗi kết nối server' };
  }
}

/**
 * Sử dụng skill hồi phục HP
 * 
 * @param auth - Thông tin xác thực
 * @param skillId - ID của skill hồi phục ('heal', 'greater-heal', 'full-heal')
 * @returns HP/MP mới sau khi hồi phục
 */
export async function healPlayer(
  auth: PlayerAuth,
  skillId: string
): Promise<HealResponse> {
  try {
    const response = await fetch('/api/player/heal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...auth,
        skillId
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      console.warn('[PlayerStatsAPI] Heal failed:', data.error);
    }

    return data;
  } catch (error) {
    console.error('[PlayerStatsAPI] Heal error:', error);
    return { success: false, error: 'Lỗi kết nối server' };
  }
}

/**
 * Sử dụng skill tấn công
 * 
 * @param auth - Thông tin xác thực
 * @param skillId - ID của skill tấn công
 * @param targetType - Loại target ('player' hoặc 'monster')
 * @returns MP mới và damage của skill
 */
export async function useSkill(
  auth: PlayerAuth,
  skillId: string,
  targetType: 'player' | 'monster' = 'monster'
): Promise<UseSkillResponse> {
  try {
    const response = await fetch('/api/player/use-skill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...auth,
        skillId,
        targetType
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      console.warn('[PlayerStatsAPI] Use skill failed:', data.error);
    }

    return data;
  } catch (error) {
    console.error('[PlayerStatsAPI] Use skill error:', error);
    return { success: false, error: 'Lỗi kết nối server' };
  }
}

/**
 * Nhận sát thương từ kẻ tấn công
 * 
 * @param auth - Thông tin xác thực của nạn nhân
 * @param attackerId - ID của kẻ tấn công
 * @param skillId - ID của skill gây damage
 * @param attackerToken - Token của kẻ tấn công (optional, để validate)
 * @returns HP mới và trạng thái chết/sống
 */
export async function takeDamage(
  auth: PlayerAuth,
  attackerId: number,
  skillId: string,
  attackerToken?: string
): Promise<TakeDamageResponse> {
  try {
    const response = await fetch('/api/player/take-damage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...auth,
        attackerId,
        skillId,
        attackerToken
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      console.warn('[PlayerStatsAPI] Take damage failed:', data.error);
    }

    return data;
  } catch (error) {
    console.error('[PlayerStatsAPI] Take damage error:', error);
    return { success: false, error: 'Lỗi kết nối server' };
  }
}

/**
 * Cập nhật inventory (gold, items)
 * KHÔNG cho phép cập nhật HP/MP
 */
export async function updateInventory(
  auth: PlayerAuth,
  gold?: number,
  items?: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/player/update-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...auth,
        gold,
        items
      })
    });

    return await response.json();
  } catch (error) {
    console.error('[PlayerStatsAPI] Update inventory error:', error);
    return { success: false, error: 'Lỗi kết nối server' };
  }
}

/**
 * Cập nhật Max HP và Max MP
 * CHỈ sử dụng khi:
 * - Level up
 * - Trang bị item tăng max stats
 * - Buff/skill đặc biệt
 * 
 * @param auth - Thông tin xác thực
 * @param maxHp - Max HP mới (optional)
 * @param maxMp - Max MP mới (optional)
 * @param reason - Lý do cập nhật ('level_up', 'equipment', 'buff', 'skill', 'admin')
 * @returns Stats mới sau khi cập nhật
 */
export async function updateMaxStats(
  auth: PlayerAuth,
  maxHp?: number,
  maxMp?: number,
  reason?: 'level_up' | 'equipment' | 'buff' | 'skill' | 'admin'
): Promise<GetStatsResponse> {
  try {
    const response = await fetch('/api/player/update-max-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...auth,
        maxHp,
        maxMp,
        reason: reason || 'admin'
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      console.warn('[PlayerStatsAPI] Update max stats failed:', data.error);
    }

    return data;
  } catch (error) {
    console.error('[PlayerStatsAPI] Update max stats error:', error);
    return { success: false, error: 'Lỗi kết nối server' };
  }
}

/**
 * Skill definitions cho reference
 */
export const HEALING_SKILLS = {
  'heal': { hpRestore: 50, mpCost: 20, name: 'Hồi Phục' },
  'greater-heal': { hpRestore: 100, mpCost: 40, name: 'Hồi Phục Lớn' },
  'full-heal': { hpRestore: 999999, mpCost: 80, name: 'Hồi Phục Toàn Bộ' }
} as const;

export const ATTACK_SKILLS = {
  'basic-attack': { damage: 10, mpCost: 0, name: 'Đánh Thường' },
  'slash': { damage: 25, mpCost: 10, name: 'Chém' },
  'charge': { damage: 35, mpCost: 15, name: 'Xung Kích' },
  'fireball': { damage: 40, mpCost: 20, name: 'Cầu Lửa' },
  'ice-spike': { damage: 45, mpCost: 25, name: 'Gai Băng' },
  'holy-strike': { damage: 50, mpCost: 30, name: 'Đòn Thánh' },
  'block': { damage: 0, mpCost: 5, name: 'Phòng Thủ' }
} as const;

/**
 * Helper để kiểm tra có đủ MP không (client-side check trước khi gọi API)
 */
export function hasEnoughMP(currentMP: number, skillId: string, skillType: 'heal' | 'attack'): boolean {
  const skills = skillType === 'heal' ? HEALING_SKILLS : ATTACK_SKILLS;
  const skill = skills[skillId as keyof typeof skills];
  
  if (!skill) {
    console.warn(`[PlayerStatsAPI] Unknown skill: ${skillId}`);
    return false;
  }

  return currentMP >= skill.mpCost;
}

/**
 * Helper để lấy thông tin skill
 */
export function getSkillInfo(skillId: string, skillType: 'heal' | 'attack') {
  const skills = skillType === 'heal' ? HEALING_SKILLS : ATTACK_SKILLS;
  return skills[skillId as keyof typeof skills];
}

/**
 * Đăng xuất
 * 
 * @param auth - Thông tin xác thực
 * @returns Kết quả đăng xuất
 */
export async function logout(auth: PlayerAuth): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auth)
    });

    const data = await response.json();
    
    if (!data.success) {
      console.warn('[PlayerStatsAPI] Logout failed:', data.error);
    }

    return data;
  } catch (error) {
    console.error('[PlayerStatsAPI] Logout error:', error);
    return { success: false, error: 'Lỗi kết nối server' };
  }
}
