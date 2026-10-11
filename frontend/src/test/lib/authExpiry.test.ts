import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'
import {
  ApiError,
  request,
  onAuthExpired,
  resetAuthExpired,
  getToken,
} from '../../lib/api'
import { mockLogin, mockLogout } from '../helpers'

/** Spring Security 拦截（token 过期/伪造/未带 token）的默认错误体：没有 success 信封 */
const springForbidden = () =>
  HttpResponse.json(
    { timestamp: '2026-10-11T12:40:33.287+00:00', status: 403, error: 'Forbidden', path: '/api/profile' },
    { status: 403 }
  )

describe('登录态失效的识别与广播', () => {
  const unsubscribeList: Array<() => void> = []

  beforeEach(() => {
    mockLogout()
    resetAuthExpired()
  })

  afterEach(() => {
    unsubscribeList.splice(0).forEach((off) => off())
  })

  const watch = () => {
    const spy = vi.fn()
    unsubscribeList.push(onAuthExpired(spy))
    return spy
  }

  it('token 过期（403 且无业务信封）判定为登录态失效，并清掉本地登录态', async () => {
    mockLogin()
    const spy = watch()
    server.use(http.get('*/api/profile', springForbidden))

    await expect(request('/api/profile')).rejects.toMatchObject({
      status: 403,
      sessionExpired: true,
    })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(getToken()).toBeNull()
    expect(localStorage.getItem('currentUser')).toBeNull()
  })

  it('未登录时不广播（游客浏览不应被踢到登录页）', async () => {
    const spy = watch()
    server.use(http.get('*/api/profile', springForbidden))

    await expect(request('/api/profile')).rejects.toBeInstanceOf(ApiError)
    expect(spy).not.toHaveBeenCalled()
  })

  it('业务级 403（带信封）不算登录失效，也不清登录态', async () => {
    mockLogin()
    const spy = watch()
    server.use(
      http.delete('*/api/forum/posts/:id', () =>
        HttpResponse.json(
          { success: false, message: '只能删除自己的帖子', data: null },
          { status: 403 }
        )
      )
    )

    await expect(request('/api/forum/posts/1', { method: 'DELETE' })).rejects.toMatchObject({
      status: 403,
      sessionExpired: false,
      message: '只能删除自己的帖子',
    })
    expect(spy).not.toHaveBeenCalled()
    expect(getToken()).toBe('mock-token')
  })

  it('并发请求同时失效时只广播一次，避免重复跳转', async () => {
    mockLogin()
    const spy = watch()
    server.use(
      http.get('*/api/one', springForbidden),
      http.get('*/api/two', springForbidden),
      http.get('*/api/three', springForbidden)
    )

    await Promise.allSettled([request('/api/one'), request('/api/two'), request('/api/three')])
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('失效提示为「登录已过期」，而不是 undefined', async () => {
    mockLogin()
    server.use(http.get('*/api/profile', springForbidden))

    await expect(request('/api/profile')).rejects.toThrow('登录已过期，请重新登录')
  })

  it('登录成功后可再次触发失效广播（标记已重置）', async () => {
    mockLogin()
    const spy = watch()
    server.use(http.get('*/api/profile', springForbidden))

    await expect(request('/api/profile')).rejects.toBeInstanceOf(ApiError)
    expect(spy).toHaveBeenCalledTimes(1)

    // 重新登录：写入新 token 并重置标记
    resetAuthExpired()
    mockLogin()
    await expect(request('/api/profile')).rejects.toBeInstanceOf(ApiError)
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
