import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import ForumPostPage from '../../pages/ForumPostPage'
import { server } from '../msw/server'
import { ok, mockUser, mockOtherUser, mockLogin, mockLogout, renderWithRouter } from '../helpers'
import type { ForumPost, ForumReply, Competition, UserIdentity } from '../../types'

const mockPost: ForumPost = {
  id: 1,
  board: 'GENERAL',
  title: '测试帖子标题',
  content: '这是帖子正文内容',
  author: { ...mockOtherUser, reputation: 120 },
  viewCount: 42,
  replyCount: 2,
  likeCount: 5,
  liked: false,
  favorited: false,
  following: false,
  essence: false,
  pinned: false,
  createdAt: '2026-03-01T10:00:00',
}

const mockReplies: ForumReply[] = [
  {
    id: 201,
    content: '第一条回复',
    author: { ...mockUser, reputation: 50 },
    likeCount: 1,
    liked: false,
    accepted: false,
    createdAt: '2026-03-01T11:00:00',
  },
  {
    id: 202,
    content: '第二条回复',
    author: { ...mockOtherUser, reputation: 120 },
    likeCount: 0,
    liked: false,
    accepted: true,
    createdAt: '2026-03-01T12:00:00',
  },
]

const mockCompetitions: Competition[] = []
const mockIdentities: Record<number, UserIdentity> = {
  1: { school: '测试大学', verified: false },
  2: { school: '清华大学', verified: true },
}

/** 公共 MSW handlers */
function postHandlers(opts?: {
  post?: ForumPost
  replies?: ForumReply[]
}) {
  return [
    http.get('/api/competitions', () => ok(mockCompetitions)),
    http.get('/api/forum/posts/1', () => ok(opts?.post ?? mockPost)),
    http.get('/api/forum/posts/1/replies', () => ok(opts?.replies ?? mockReplies)),
    http.get('/api/profile/batch', () => ok(mockIdentities)),
  ]
}

describe('ForumPostPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockLogin(mockUser)
  })

  afterEach(() => {
    mockLogout()
    server.resetHandlers()
  })

  it('渲染帖子详情（标题、正文、作者、浏览数）', async () => {
    server.use(...postHandlers())

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByText('测试帖子标题')).toBeInTheDocument()
    })
    expect(screen.getByText('这是帖子正文内容')).toBeInTheDocument()
    // 作者名可能出现在帖子和回复中（同名），用 getAllByText
    expect(screen.getAllByText('其他用户').length).toBeGreaterThan(0)
    expect(screen.getByText(/42/)).toBeInTheDocument()
  })

  it('渲染回复列表', async () => {
    server.use(...postHandlers())

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByText('第一条回复')).toBeInTheDocument()
      expect(screen.getByText('第二条回复')).toBeInTheDocument()
    })
    // 已采纳标记
    expect(screen.getByText('已采纳')).toBeInTheDocument()
  })

  it('无回复时显示空状态', async () => {
    server.use(...postHandlers({ replies: [] }))

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByText('还没有回复，来抢沙发')).toBeInTheDocument()
    })
  })

  it('点赞按钮切换状态', async () => {
    server.use(
      ...postHandlers(),
      http.post('/api/forum/posts/1/like', () => ok({ liked: true, likeCount: 6 }))
    )

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    // 点击点赞按钮 (Heart 图标旁的 5)
    const likeButton = screen.getByText('5').closest('button')!
    fireEvent.click(likeButton)

    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument()
    })
  })

  it('收藏按钮切换状态', async () => {
    server.use(
      ...postHandlers(),
      http.post('/api/forum/posts/1/favorite', () =>
        ok({ favorited: true, favoriteCount: 1 })
      )
    )

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByText('收藏')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('收藏'))

    await waitFor(() => {
      expect(screen.getByText('已收藏')).toBeInTheDocument()
    })
  })

  it('显示回复输入框', async () => {
    server.use(...postHandlers())

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByPlaceholderText('写下你的回复…')).toBeInTheDocument()
    })
  })

  it('非作者可见举报按钮', async () => {
    server.use(...postHandlers())

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByText('举报')).toBeInTheDocument()
    })
  })

  it('作者不可见举报按钮', async () => {
    // 登录为帖子作者 (id=2)
    mockLogin(mockOtherUser)
    server.use(...postHandlers())

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByText('测试帖子标题')).toBeInTheDocument()
    })
    // 作者看不到自己的举报按钮
    expect(screen.queryByText('举报')).not.toBeInTheDocument()
  })
})
