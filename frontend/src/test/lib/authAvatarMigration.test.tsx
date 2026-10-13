import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { AuthProvider, useAuth } from '../../lib/auth';
import { server } from '../msw/server';
import { ok, mockLogout } from '../helpers';
import type { AccountDTO } from '../../types';

const me: AccountDTO = {
  id: 1,
  username: 'testuser',
  name: '测试用户',
  avatarUrl: '/api/avatars/1?v=99',
  role: 'STUDENT',
  reputation: 50,
};

function Probe() {
  const { user } = useAuth();
  return <span data-testid="avatar">{user?.avatarUrl ?? 'none'}</span>;
}

const stored = () => JSON.parse(localStorage.getItem('currentUser') ?? '{}');

describe('老登录态的头像补齐', () => {
  beforeEach(() => {
    localStorage.setItem('authToken', 'mock-token');
    // 头像功能上线前写入的登录态：没有 avatarUrl 字段
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ id: 1, username: 'testuser', name: '测试用户', role: 'STUDENT' })
    );
  });
  afterEach(() => mockLogout());

  it('缺少 avatarUrl 字段时自动补拉账号信息', async () => {
    server.use(http.get('*/api/account/me', () => ok(me)));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId('avatar')).toHaveTextContent('none');
    await waitFor(() => expect(stored().avatarUrl).toBe('/api/avatars/1?v=99'));
    expect(screen.getByTestId('avatar')).toHaveTextContent('/api/avatars/1?v=99');
  });

  it('服务端确认是默认头像(null)后不再重复请求', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/account/me', () => {
        calls += 1;
        return ok({ ...me, avatarUrl: null });
      })
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(calls).toBe(1));
    expect(stored().avatarUrl).toBeNull();
  });
});
