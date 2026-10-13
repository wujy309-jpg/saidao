import { describe, it, expect } from 'vitest';
import { normalizeNickname, validateNickname } from '../../lib/nickname';

describe('昵称校验（与后端 AccountService.validateName 对齐）', () => {
  it('规范化连续空白并去掉首尾空格', () => {
    expect(normalizeNickname('  爱  打比赛 ')).toBe('爱 打比赛');
  });

  it('接受正常昵称', () => {
    expect(validateNickname('竞赛小王子')).toBeUndefined();
    expect(validateNickname('Alice_2026')).toBeUndefined();
  });

  it('拒绝空昵称、过短与过长', () => {
    expect(validateNickname('   ')).toBe('昵称不能为空');
    expect(validateNickname('王')).toContain('2-16');
    expect(validateNickname('一'.repeat(17))).toContain('2-16');
  });

  it('拒绝特殊符号与纯符号昵称', () => {
    expect(validateNickname('<script>')).toContain('符号');
    expect(validateNickname('a@b')).toContain('符号');
    expect(validateNickname('---')).toContain('汉字');
    expect(validateNickname('🚀🚀')).toContain('汉字');
  });

  it('拒绝冒充官方身份的保留词', () => {
    expect(validateNickname('管理员')).toContain('官方保留词');
    expect(validateNickname('官方客服小助手')).toContain('官方保留词');
    expect(validateNickname('Admin01')).toContain('官方保留词');
  });
});
