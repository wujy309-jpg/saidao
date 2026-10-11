import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from '../../lib/auth'
import { resetAuthExpired } from '../../lib/api'
import App from '../../App'
import { server } from '../msw/server'
import { mockLogin, mockLogout } from '../helpers'

/** 复现线上现象：浏览器里存着 24 小时前签发的 token，后端一律回 Spring 默认 403 */
const expiredToken = () =>
  HttpResponse.json(
    {
      timestamp: '2026-10-11T12:40:33.287+00:00',
      status: 403,
      error: 'Forbidden',
      path: '/api/profile',
    },
    { status: 403 }
  )

describe('登录过期后的整链路行为', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    mockLogin()
    resetAuthExpired()
  })

  afterEach(() => mockLogout())

  it('不再停在三块骨架屏上，而是跳登录页并说明原因', async () => {
    server.use(
      http.get('*/api/profile', expiredToken),
      // 清登录态的瞬间会短暂渲染游客落地页，它会拉公开竞赛列表
      http.get('*/api/competitions', () => HttpResponse.json({ success: true, data: [] }))
    )

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    )

    expect(await screen.findByText('登录已过期，请重新登录')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /登录/ })).toBeInTheDocument()
    expect(localStorage.getItem('authToken')).toBeNull()
  })
})
