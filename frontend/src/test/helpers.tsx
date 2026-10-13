import { http, HttpResponse } from 'msw'
import { type ReactNode } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { render, type RenderResult } from '@testing-library/react'
import { AuthProvider } from '../lib/auth'
import type { User, TokenAccount } from '../types'

/** 包装 API 响应为统一格式 { success, message, data } */
export function ok<T>(data: T) {
  return HttpResponse.json({ success: true, message: 'ok', data })
}

/** 包装错误响应 */
export function err(message: string, status = 400) {
  return HttpResponse.json({ success: false, message, data: null }, { status })
}

/** 构造完整 TokenAccount mock 对象 */
export function mockTokenAccount(balance: number): TokenAccount {
  return {
    id: 1,
    userId: 1,
    balance,
    totalRecharged: 0,
    totalConsumed: 0,
    totalGranted: 100,
  }
}

/** 测试用 mock 用户 */
export const mockUser: User = {
  id: 1,
  username: 'testuser',
  name: '测试用户',
  role: 'STUDENT',
  email: 'test@example.com',
  department: '工科',
  avatarUrl: null,
  reputation: 50,
}

export const mockOtherUser: User = {
  id: 2,
  username: 'otheruser',
  name: '其他用户',
  role: 'STUDENT',
  avatarUrl: null,
  reputation: 120,
}

/** 设置 localStorage 模拟登录态 */
export function mockLogin(user: User = mockUser) {
  localStorage.setItem('authToken', 'mock-token')
  localStorage.setItem('currentUser', JSON.stringify(user))
}

/** 清除登录态 */
export function mockLogout() {
  localStorage.removeItem('authToken')
  localStorage.removeItem('currentUser')
}

/**
 * 渲染组件并自动包裹 MemoryRouter + AuthProvider。
 * routePath 用于匹配 useParams() 的路由参数。
 */
export function renderWithRouter(
  ui: ReactNode,
  initialEntry = '/',
  routePath = '*'
): RenderResult {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path={routePath} element={ui} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

/** 渲染组件并自动包裹 MemoryRouter + AuthProvider（无路由参数，用于 Layout 等组件） */
export function renderWithAuth(ui: ReactNode, initialEntry = '/'): RenderResult {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  )
}
