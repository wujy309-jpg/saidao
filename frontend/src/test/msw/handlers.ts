import { http, HttpResponse } from 'msw'

/** MSW handler 占位数组，后续按需添加 mock 接口 */
export const handlers = [
  // 兜底：follow 请求对不存在用户返回 404
  http.post('*/api/forum/users/:id/follow', () =>
    HttpResponse.json({ success: false, message: '用户不存在' }, { status: 404 })
  ),
]
