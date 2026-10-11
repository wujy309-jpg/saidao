import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http } from 'msw'
import ForumPostPage from '../../pages/ForumPostPage'
import { server } from '../msw/server'
import {
  ok,
  mockUser,
  mockOtherUser,
  mockLogin,
  mockLogout,
  renderWithRouter,
} from '../helpers'
import type { ForumPost, ForumReply, Competition, UserIdentity } from '../../types'

const mockPost: ForumPost = {
  id: 1,
  board: 'GENERAL',
  title: '举报测试帖子',
  content: '正文内容',
  author: { ...mockOtherUser, reputation: 120 },
  viewCount: 10,
  replyCount: 0,
  likeCount: 0,
  liked: false,
  favorited: false,
  following: false,
  createdAt: '2026-03-01T10:00:00',
}

const mockReplies: ForumReply[] = []
const mockCompetitions: Competition[] = []
const mockIdentities: Record<number, UserIdentity> = {}

function setupHandlers() {
  server.use(
    http.get('/api/competitions', () => ok(mockCompetitions)),
    http.get('/api/forum/posts/1', () => ok(mockPost)),
    http.get('/api/forum/posts/1/replies', () => ok(mockReplies)),
    http.get('/api/profile/batch', () => ok(mockIdentities)),
    // 其他可能被触发的端点（passthrough 等价于 ok）
    http.post('/api/forum/posts/1/like', () => ok({ liked: true, likeCount: 1 })),
    http.post('/api/forum/posts/1/favorite', () => ok({ favorited: true, favoriteCount: 1 })),
    http.post('/api/forum/users/2/follow', () => ok(false)),
  )
}

describe('ReportButton (从 ForumPostPage 拆出)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockLogin(mockUser)
  })

  afterEach(() => {
    mockLogout()
    server.resetHandlers()
  })

  it('点击举报按钮打开弹窗', async () => {
    setupHandlers()

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByText('举报')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('举报'))

    await waitFor(() => {
      expect(screen.getByText('举报内容')).toBeInTheDocument()
      expect(screen.getByText('垃圾广告/刷屏')).toBeInTheDocument()
      expect(screen.getByText('辱骂/人身攻击')).toBeInTheDocument()
      expect(screen.getByText('欺诈/不实信息')).toBeInTheDocument()
      expect(screen.getByText('其他')).toBeInTheDocument()
    })
  })

  it('提交举报发送 POST 请求并关闭弹窗', async () => {
    let reportBody: { postId?: number; reason?: string; detail?: string } | null = null
    server.use(
      http.get('/api/competitions', () => ok(mockCompetitions)),
      http.get('/api/forum/posts/1', () => ok(mockPost)),
      http.get('/api/forum/posts/1/replies', () => ok(mockReplies)),
      http.get('/api/profile/batch', () => ok(mockIdentities)),
      http.post('/api/forum/reports', async ({ request }) => {
        reportBody = await request.json() as typeof reportBody
        return ok(null)
      }),
      http.post('/api/forum/posts/1/like', () => ok({ liked: true, likeCount: 1 })),
      http.post('/api/forum/posts/1/favorite', () => ok({ favorited: true, favoriteCount: 1 })),
      http.post('/api/forum/users/2/follow', () => ok(false)),
    )

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByText('举报')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('举报'))

    await waitFor(() => {
      expect(screen.getByText('举报内容')).toBeInTheDocument()
    })

    // 选择 "辱骂/人身攻击"
    fireEvent.click(screen.getByText('辱骂/人身攻击'))

    // 填写补充说明
    const textarea = screen.getByPlaceholderText('补充说明（可选）')
    fireEvent.change(textarea, { target: { value: '包含不当言论' } })

    // 提交
    fireEvent.click(screen.getByText('提交举报'))

    await waitFor(() => {
      expect(reportBody).not.toBeNull()
      expect(reportBody?.postId).toBe(1)
      expect(reportBody?.reason).toBe('ABUSE')
      expect(reportBody?.detail).toBe('包含不当言论')
    })

    // 弹窗关闭后不应再看到"举报内容"标题
    await waitFor(() => {
      expect(screen.queryByText('举报内容')).not.toBeInTheDocument()
    })
  })

  it('点击取消关闭弹窗', async () => {
    setupHandlers()

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByText('举报')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('举报'))

    await waitFor(() => {
      expect(screen.getByText('举报内容')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('取消'))

    await waitFor(() => {
      expect(screen.queryByText('举报内容')).not.toBeInTheDocument()
    })
  })

  it('点击遮罩层关闭弹窗', async () => {
    setupHandlers()

    renderWithRouter(<ForumPostPage />, '/forum/posts/1', '/forum/posts/:id')

    await waitFor(() => {
      expect(screen.getByText('举报')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('举报'))

    await waitFor(() => {
      expect(screen.getByText('举报内容')).toBeInTheDocument()
    })

    // 点击遮罩层 (fixed inset-0 的 div)
    const overlay = document.querySelector('.fixed.inset-0') as HTMLElement
    fireEvent.click(overlay)

    await waitFor(() => {
      expect(screen.queryByText('举报内容')).not.toBeInTheDocument()
    })
  })
})
