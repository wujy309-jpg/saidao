import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import SettingsPage from '../../pages/SettingsPage';
import { server } from '../msw/server';
import { ok, err, mockLogin, mockLogout, renderWithAuth } from '../helpers';
import type { AccountDTO } from '../../types';

const account: AccountDTO = {
  id: 1,
  username: 'testuser',
  name: '测试用户',
  avatarUrl: null,
  role: 'STUDENT',
  email: 'test@example.com',
  school: '示例大学',
  verified: true,
  reputation: 50,
  createdAt: '2026-01-02T03:04:05',
};

const storedName = () => JSON.parse(localStorage.getItem('currentUser') ?? '{}').name;

describe('账号设置页', () => {
  beforeEach(() => {
    mockLogin();
    server.use(http.get('*/api/account/me', () => ok(account)));
  });
  afterEach(() => mockLogout());

  it('展示账号信息,并说明登录用户名不可改', async () => {
    renderWithAuth(<SettingsPage />);

    expect(await screen.findByText('账号设置')).toBeInTheDocument();
    expect(await screen.findByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('用于登录,不可修改')).toBeInTheDocument();
    expect(screen.getByText('50（达人）')).toBeInTheDocument();
  });

  it('改昵称后同步本地登录态,顶栏不会继续显示旧名字', async () => {
    let body: unknown = null;
    server.use(
      http.put('*/api/account/name', async ({ request }) => {
        body = await request.json();
        return ok({ ...account, name: '竞赛小王子' });
      })
    );

    renderWithAuth(<SettingsPage />);

    const input = await screen.findByPlaceholderText('例如:爱打比赛的阿伟');
    fireEvent.change(input, { target: { value: '  竞赛小王子 ' } });
    fireEvent.click(screen.getByRole('button', { name: '保存昵称' }));

    await waitFor(() => expect(body).toEqual({ name: '竞赛小王子' }));
    await waitFor(() => expect(storedName()).toBe('竞赛小王子'));
  });

  it('昵称不合法时按钮不可点,并给出原因', async () => {
    renderWithAuth(<SettingsPage />);

    const input = await screen.findByPlaceholderText('例如:爱打比赛的阿伟');
    fireEvent.change(input, { target: { value: '王' } });

    expect(await screen.findByText(/2-16/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存昵称' })).toBeDisabled();
  });

  it('选预设头像会提交 presetId 并回写头像', async () => {
    let body: unknown = null;
    server.use(
      http.put('*/api/account/avatar/preset', async ({ request }) => {
        body = await request.json();
        return ok({ ...account, avatarUrl: 'preset:rocket' });
      })
    );

    renderWithAuth(<SettingsPage />);

    fireEvent.click(await screen.findByTitle('探索'));

    await waitFor(() => expect(body).toEqual({ presetId: 'rocket' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('currentUser') ?? '{}').avatarUrl).toBe('preset:rocket'));
  });

  it('上传图片走 multipart,服务端拒绝时给出错误提示', async () => {
    server.use(
      http.post('*/api/account/avatar', () => err('图片不能超过 2MB,请压缩后再上传'))
    );

    const { container } = renderWithAuth(<SettingsPage />);
    await screen.findByText('账号设置');

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('图片不能超过 2MB,请压缩后再上传')).toBeInTheDocument();
  });

  it('没有自定义头像时「恢复默认」不可点;有头像时可一键恢复', async () => {
    server.use(http.get('*/api/account/me', () => ok({ ...account, avatarUrl: 'preset:star' })));
    let called = false;
    server.use(
      http.delete('*/api/account/avatar', () => {
        called = true;
        return ok({ ...account, avatarUrl: null });
      })
    );

    renderWithAuth(<SettingsPage />);

    const reset = await screen.findByRole('button', { name: '恢复默认' });
    expect(reset).toBeEnabled();
    fireEvent.click(reset);

    await waitFor(() => expect(called).toBe(true));
    await waitFor(() => expect(storedName()).toBe('测试用户'));
  });
});
