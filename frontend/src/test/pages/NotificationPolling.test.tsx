import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import Layout from '../../components/Layout'
import { server } from '../msw/server'
import { ok, mockUser, mockLogin, mockLogout, renderWithAuth } from '../helpers'
import type { TokenAccount, MyCompetitionItem } from '../../types'

/** 用 vi.fn() 包裹 handler，统计请求数 */
function makeUnreadHandler(initialCount: number) {
  let count = initialCount
  const fn = vi.fn(() => {
    return HttpResponse.json({ success: true, message: 'ok', data: count })
  })
  return { fn, setCount: (n: number) => { count = n } }
}

describe('NotificationPolling (Layout 轮询)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockLogin(mockUser)
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    mockLogout()
    server.resetHandlers()
  })

  it('初始加载时拉取未读数并显示角标', async () => {
    server.use(
      http.get('/api/forum/notifications/unread-count', () => ok(3)),
      http.get('/api/token/balance', () => ok<TokenAccount>({ balance: 100 })),
      http.get('/api/competitions/mine', () => ok<MyCompetitionItem[]>([]))
    )

    const { container } = renderWithAuth(<Layout />)

    // 初始加载后应显示未读数 3
    await waitFor(() => {
      const badge = container.querySelector('.bg-red-500')
      expect(badge).toBeInTheDocument()
      expect(badge?.textContent).toBe('3')
    })
  })

  it('30 秒后轮询再次请求未读数', async () => {
    const { fn: unreadFn } = makeUnreadHandler(0)

    server.use(
      http.get('/api/forum/notifications/unread-count', unreadFn),
      http.get('/api/token/balance', () => ok<TokenAccount>({ balance: 100 })),
      http.get('/api/competitions/mine', () => ok<MyCompetitionItem[]>([]))
    )

    renderWithAuth(<Layout />)

    // 等待首次请求完成
    await waitFor(() => {
      expect(unreadFn).toHaveBeenCalledTimes(1)
    })

    // 快进 30 秒
    vi.advanceTimersByTime(30_000)

    await waitFor(() => {
      expect(unreadFn).toHaveBeenCalledTimes(2)
    })
  })

  it('未读数为 0 时不显示角标', async () => {
    server.use(
      http.get('/api/forum/notifications/unread-count', () => ok(0)),
      http.get('/api/token/balance', () => ok<TokenAccount>({ balance: 100 })),
      http.get('/api/competitions/mine', () => ok<MyCompetitionItem[]>([]))
    )

    const { container } = renderWithAuth(<Layout />)

    await waitFor(() => {
      const badge = container.querySelector('.bg-red-500')
      expect(badge).not.toBeInTheDocument()
    })
  })

  it('未登录时不轮询', async () => {
    mockLogout()
    const { fn: unreadFn } = makeUnreadHandler(0)

    server.use(
      http.get('/api/forum/notifications/unread-count', unreadFn),
      http.get('/api/token/balance', () => ok<TokenAccount>({ balance: 0 })),
      http.get('/api/competitions/mine', () => ok<MyCompetitionItem[]>([]))
    )

    renderWithAuth(<Layout />)

    // 等一会，确保没有发起请求
    vi.advanceTimersByTime(35_000)

    expect(unreadFn).not.toHaveBeenCalled()
  })

  it('notifications-changed 事件触发即时刷新', async () => {
    const { fn: unreadFn, setCount } = makeUnreadHandler(0)

    server.use(
      http.get('/api/forum/notifications/unread-count', unreadFn),
      http.get('/api/token/balance', () => ok<TokenAccount>({ balance: 100 })),
      http.get('/api/competitions/mine', () => ok<MyCompetitionItem[]>([]))
    )

    renderWithAuth(<Layout />)

    await waitFor(() => {
      expect(unreadFn).toHaveBeenCalledTimes(1)
    })

    // 模拟通知变化事件
    setCount(5)
    window.dispatchEvent(new Event('notifications-changed'))

    await waitFor(() => {
      expect(unreadFn).toHaveBeenCalledTimes(2)
    })
  })
})
