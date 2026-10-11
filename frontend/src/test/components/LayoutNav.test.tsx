import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import Layout from '../../components/Layout'
import { server } from '../msw/server'
import { ok, mockLogin, mockLogout, mockTokenAccount, renderWithAuth } from '../helpers'
import type { User } from '../../types'

const adminUser: User = {
  id: 1,
  username: 'admin',
  name: '系统管理员',
  role: 'ADMIN',
  reputation: 0,
}

describe('主站导航（管理员登录）', () => {
  beforeEach(() => {
    mockLogin(adminUser)
    server.use(
      http.get('*/api/forum/notifications/unread-count', () => ok(0)),
      http.get('*/api/token/balance', () => ok(mockTokenAccount(10))),
      http.get('*/api/competitions/mine', () => ok([]))
    )
  })

  afterEach(() => mockLogout())

  it('桌面用户菜单里没有「管理后台」入口，其它菜单项照常', async () => {
    renderWithAuth(<Layout />)

    fireEvent.click(await screen.findByTitle('系统管理员'))

    // 学生端菜单项仍在
    expect(screen.getByText('我的画像')).toBeInTheDocument()
    expect(screen.getByText('退出登录')).toBeInTheDocument()
    // 管理后台入口已下掉：主站是学生端，运营后台只从 /api/admin/ 直接进入
    expect(screen.queryByText('管理后台')).not.toBeInTheDocument()
  })

  it('手机抽屉里同样没有「管理后台」入口', async () => {
    renderWithAuth(<Layout />)

    fireEvent.click(await screen.findByTitle('菜单'))

    expect(screen.queryByText('管理后台')).not.toBeInTheDocument()
  })

  it('整个主站 DOM 里不出现任何指向 admin 的链接', async () => {
    const { container } = renderWithAuth(<Layout />)

    fireEvent.click(await screen.findByTitle('系统管理员'))
    fireEvent.click(await screen.findByTitle('菜单'))

    const adminLinks = Array.from(container.querySelectorAll('a')).filter((a) =>
      a.getAttribute('href')?.includes('/admin')
    )
    expect(adminLinks).toHaveLength(0)
  })
})
