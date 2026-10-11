import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import UserProfilePage from '../../pages/UserProfilePage'
import { server } from '../msw/server'
import { ok, mockUser, mockLogin, mockLogout, renderWithRouter } from '../helpers'
import type { UserProfileDTO, ForumPostDTO } from '../../types'

const mockProfile: UserProfileDTO = {
  id: 2,
  name: '其他用户',
  school: '清华大学',
  reputation: 120,
  verified: true,
  role: 'STUDENT',
  postCount: 5,
  replyCount: 10,
  acceptedCount: 3,
  competitionHistory: ['蓝桥杯', '数学建模'],
  followingCount: 8,
  followerCount: 15,
}

const mockPosts: ForumPostDTO[] = [
  {
    id: 101,
    title: '测试帖子1',
    content: '这是内容',
    board: 'GENERAL',
    likeCount: 3,
    replyCount: 2,
    createdAt: '2026-01-15T10:30:00',
  },
  {
    id: 102,
    title: '测试帖子2',
    content: '另一篇内容',
    board: 'Q_AND_A',
    likeCount: 0,
    replyCount: 1,
    createdAt: '2026-02-20T14:00:00',
  },
]

/** 公共 MSW handlers，可用 server.use(...) 在测试中覆盖 */
function profileHandlers(opts?: { posts?: ForumPostDTO[]; following?: boolean }) {
  return [
    http.get('/api/users/2/profile', () => ok(mockProfile)),
    http.get('/api/forum/posts', () =>
      ok({ content: opts?.posts ?? [], totalElements: opts?.posts?.length ?? 0 })
    ),
    http.post('/api/forum/users/2/follow', () => ok(opts?.following ?? false)),
  ]
}

describe('UserProfilePage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockLogin(mockUser)
  })

  afterEach(() => {
    mockLogout()
    server.resetHandlers()
  })

  it('渲染用户资料（姓名、学校、声望、统计、参赛历史）', async () => {
    server.use(...profileHandlers({ posts: [] }))

    renderWithRouter(<UserProfilePage />, '/u/2', '/u/:userId')

    await waitFor(() => {
      expect(screen.getByText('其他用户')).toBeInTheDocument()
    })
    expect(screen.getByText('清华大学')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('蓝桥杯')).toBeInTheDocument()
    expect(screen.getByText('数学建模')).toBeInTheDocument()
  })

  it('显示用户帖子列表', async () => {
    server.use(...profileHandlers({ posts: mockPosts }))

    renderWithRouter(<UserProfilePage />, '/u/2', '/u/:userId')

    await waitFor(() => {
      expect(screen.getByText('测试帖子1')).toBeInTheDocument()
      expect(screen.getByText('测试帖子2')).toBeInTheDocument()
    })
  })

  it('无帖子时显示空状态', async () => {
    server.use(...profileHandlers({ posts: [] }))

    renderWithRouter(<UserProfilePage />, '/u/2', '/u/:userId')

    await waitFor(() => {
      expect(screen.getByText('暂无帖子')).toBeInTheDocument()
    })
  })

  it('用户不存在时显示提示', async () => {
    server.use(
      http.get('/api/users/999/profile', () =>
        HttpResponse.json(
          { success: false, message: '用户不存在', data: null },
          { status: 404 }
        )
      ),
      http.get('/api/forum/posts', () => ok({ content: [], totalElements: 0 }))
    )

    renderWithRouter(<UserProfilePage />, '/u/999', '/u/:userId')

    await waitFor(() => {
      expect(screen.getByText('用户不存在')).toBeInTheDocument()
    })
  })

  it('关注按钮切换状态', async () => {
    let followCalled = false
    server.use(
      http.get('/api/users/2/profile', () => ok(mockProfile)),
      http.get('/api/forum/posts', () => ok({ content: [], totalElements: 0 })),
      http.post('/api/forum/users/2/follow', () => {
        followCalled = true
        return ok(true)
      })
    )

    renderWithRouter(<UserProfilePage />, '/u/2', '/u/:userId')

    await waitFor(() => {
      expect(screen.getByText('关注')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('关注'))

    await waitFor(() => {
      expect(screen.getByText('已关注')).toBeInTheDocument()
    })
    expect(followCalled).toBe(true)
  })
})
