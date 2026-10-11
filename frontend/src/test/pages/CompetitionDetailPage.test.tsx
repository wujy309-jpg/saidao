import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import CompetitionDetailPage from '../../pages/CompetitionDetailPage'
import { server } from '../msw/server'
import { ok, mockLogin, mockLogout, renderWithRouter } from '../helpers'
import type { Competition, ForumPostDTO } from '../../types'

const competition: Competition = {
  id: 1,
  name: '全国大学生电子设计竞赛',
  category: 'ENGINEERING',
  level: 'NATIONAL',
  format: 'TEAM',
  difficulty: 4,
  prestige: 5,
  disciplines: ['电子', '电气'],
  tags: ['嵌入式'],
  registrationStart: '2027-06-01',
  registrationEnd: '2027-07-10',
  status: 'ACTIVE',
}

const posts: ForumPostDTO[] = [
  {
    id: 101,
    title: '电赛备赛经验分享',
    board: 'EXPERIENCE',
    authorName: '张同学',
    likeCount: 3,
    replyCount: 2,
    createdAt: '2026-10-01T10:30:00',
  },
]

interface PageBody {
  success: boolean
  message: string
  data: { content: ForumPostDTO[]; totalElements: number; number: number; size: number }
}

function mockDetail(forumResponse: PageBody) {
  server.use(
    http.get('*/api/competitions/1', () => ok({ competition, favorited: false, status: null, feedback: null })),
    http.get('*/api/competitions/1/similar', () => ok([])),
    http.get('*/api/competitions/1/works', () => ok([])),
    http.get('*/api/forum/posts', () => HttpResponse.json(forumResponse))
  )
}

describe('竞赛详情页', () => {
  beforeEach(() => mockLogin())
  afterEach(() => mockLogout())

  it('论坛列表已分页时正常渲染相关帖子（回归：曾因把分页对象当数组而整页白屏）', async () => {
    // 后端 /forum/posts 现在返回 Spring Data 分页对象
    mockDetail({ success: true, message: 'ok', data: { content: posts, totalElements: 1, number: 0, size: 20 } })

    renderWithRouter(<CompetitionDetailPage />, '/competitions/1', '/competitions/:id')

    expect(await screen.findByText('全国大学生电子设计竞赛')).toBeInTheDocument()
    expect(await screen.findByText('电赛备赛经验分享')).toBeInTheDocument()
    // DTO 只有扁平 authorName，旧代码读 p.author.name 会渲染成空白
    expect(screen.getByText(/张同学/)).toBeInTheDocument()
  })

  it('游客浏览：同样不崩，且能看到帖子', async () => {
    mockLogout()
    mockDetail({ success: true, message: 'ok', data: { content: posts, totalElements: 1, number: 0, size: 20 } })

    renderWithRouter(<CompetitionDetailPage />, '/competitions/1', '/competitions/:id')

    expect(await screen.findByText('全国大学生电子设计竞赛')).toBeInTheDocument()
    expect(await screen.findByText('电赛备赛经验分享')).toBeInTheDocument()
  })

  it('论坛接口返回空页时不报错', async () => {
    mockDetail({ success: true, message: 'ok', data: { content: [], totalElements: 0, number: 0, size: 20 } })

    renderWithRouter(<CompetitionDetailPage />, '/competitions/1', '/competitions/:id')

    expect(await screen.findByText('全国大学生电子设计竞赛')).toBeInTheDocument()
    expect(await screen.findByText('暂无相关帖子')).toBeInTheDocument()
  })
})
