/**
 * 昵称规则（前端即时校验用）。
 *
 * <p>与后端 {@code AccountService.validateName} 一一对应：前端这份只是为了「边打字边提示」，
 * 真正的判定仍以服务端为准，所以两边的规则与文案要保持一致。
 */
export const NAME_MIN = 2;
export const NAME_MAX = 16;

/** 与后端 FORBIDDEN_CHARS 一致：这些符号容易和系统文案/HTML 混淆 */
const FORBIDDEN_CHARS = /[<>"'`\\/@#{}|[\]]/;

/** 与后端 RESERVED_WORDS 一致：避免冒充官方身份 */
const RESERVED_WORDS = ['管理员', '官方', '客服', '系统', '赛道团队', 'admin', 'administrator', 'root'];

/** 规范化：去掉首尾空白并把连续空白压成一个空格（与后端一致） */
export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** 校验昵称；通过返回 undefined，否则返回给用户看的原因 */
export function validateNickname(raw: string): string | undefined {
  const name = normalizeNickname(raw ?? '');
  if (!name) return '昵称不能为空';
  if (FORBIDDEN_CHARS.test(name)) return '昵称不能包含 < > " \' ` \\ / @ # 等符号';
  if (!/[\p{L}\p{N}]/u.test(name)) return '昵称至少要有 1 个汉字、字母或数字';
  const length = Array.from(name).length;
  if (length < NAME_MIN || length > NAME_MAX) {
    return `昵称长度需为 ${NAME_MIN}-${NAME_MAX} 个字符,当前 ${length} 个`;
  }
  const lower = name.toLowerCase();
  const reserved = RESERVED_WORDS.find((word) => lower.includes(word.toLowerCase()));
  if (reserved) return `昵称不能包含「${reserved}」这类官方保留词`;
  return undefined;
}
