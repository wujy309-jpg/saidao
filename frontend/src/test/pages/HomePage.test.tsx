import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import HomePage from '../../pages/HomePage'
import { server } from '../msw/server'
import { ok, mockLogin, mockLogout, renderWithRouter } from '../helpers'
import type { UserProfile } from '../../types'

/** 与线上一致的画像结构（admin 没有画像时后端返回 data:null，这里用学生画像） */
const mockProfile: UserProfile = {
  id: 1,
  userId: 2,
  discipline: '工科',
  major: '计算机科学与技术',
  grade: 3,
  interests: ['编程'],
  skills: ['Python'],
  goals: ['保研加分'],
  weeklyHours: 8,
  hasExperience: true,
  preferredLevel: 'NATIONAL',
  description: '测试画像',
  verified: false,
  updatedAt: '2026-09-05T09:11:15',
}

describe('HomePage 加载失败兜底', () => {
  beforeEach(() => mockLogin())
  afterEach(() => mockLogout())

  it('画像接口失败时给出错误提示与重试按钮，而不是永远转圈的骨架屏', async () => {
    server.use(
      http.get('*/api/profile', () =>
        HttpResponse.json(
          { timestamp: '2026-10-11T12:40:33Z', status: 500, error: 'Internal Server Error' },
          { status: 500 }
        )
      ),
      http.get('*/api/recommendations', () => ok([])),
      http.get('*/api/competitions/mine', () => ok([]))
    )

    renderWithRouter(<HomePage />)

    expect(await screen.findByText('首页加载失败')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重新加载/ })).toBeInTheDocument()
  })

  it('点击重试后恢复正常渲染', async () => {
    let failed = false
    server.use(
      http.get('*/api/profile', () => {
        if (!failed) {
          failed = true
          return HttpResponse.json({ status: 500, error: 'Internal Server Error' }, { status: 500 })
        }
        return ok(mockProfile)
      }),
      http.get('*/api/recommendations', () => ok([])),
      http.get('*/api/competitions/mine', () => ok([]))
    )

    renderWithRouter(<HomePage />)

    const retry = await screen.findByRole('button', { name: /重新加载/ })
    fireEvent.click(retry)

    await waitFor(() =>
      expect(screen.queryByText('首页加载失败')).not.toBeInTheDocument()
    )
    expect(await screen.findByText(/你的专属推荐/)).toBeInTheDocument()
  })
})
