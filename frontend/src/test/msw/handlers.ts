import { http, HttpResponse } from 'msw'

/** MSW handler 占位数组，后续按需添加 mock 接口 */
export const handlers = [
  // 示例：GET /api/forum/posts → 200 空列表
  // http.get('/api/forum/posts', () => HttpResponse.json([])),
]
