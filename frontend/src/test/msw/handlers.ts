import { http, HttpResponse } from 'msw'

/** MSW handler 占位数组，后续按需添加 mock 接口 */
export const handlers = [
  // 兜底：follow 请求对不存在用户返回 404
  http.post('*/api/forum/users/:id/follow', () =>
    HttpResponse.json({ success: false, message: '用户不存在' }, { status: 404 })
  ),
  // 兜底：登录态里没有 avatarUrl 字段时，AuthProvider 会补拉一次账号信息
  // （老登录态迁移，见 lib/auth.tsx）。返回 null 表示「无需同步」，不干扰各测试的前置数据。
  http.get('*/api/account/me', () =>
    HttpResponse.json({ success: true, message: 'ok', data: null })
  ),
]
