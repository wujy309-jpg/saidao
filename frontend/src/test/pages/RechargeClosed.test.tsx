import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import RechargePage from '../../pages/RechargePage'
import { server } from '../msw/server'
import { ok, mockLogin, mockLogout, renderWithRouter } from '../helpers'
import type { TokenPackage } from '../../types'

const packages: TokenPackage[] = [
  { id: 1, name: '体验包', description: '', priceYuan: 6, tokens: 600, bonusTokens: 0, enabled: true, sortOrder: 0 },
]

/** 充值关闭：后端不下发收款码与转账说明 */
const closedSettings = () =>
  ok({ rechargeEnabled: false, paymentNote: '', wechatQrUrl: '', alipayQrUrl: '' })

const openSettings = () =>
  ok({
    rechargeEnabled: true,
    paymentNote: '转账时请备注订单号',
    wechatQrUrl: 'https://cdn.example.com/wx.png',
    alipayQrUrl: '',
  })

function mockCommon() {
  server.use(
    http.get('*/api/token/packages', () => ok(packages)),
    http.get('*/api/token/balance', () => ok({ id: 1, userId: 1, balance: 25, totalRecharged: 0, totalConsumed: 0, totalGranted: 25 })),
    http.get('*/api/token/scenes', () => ok([]))
  )
}

describe('充值关闭时的积分中心', () => {
  beforeEach(() => {
    mockLogin()
    mockCommon()
  })
  afterEach(() => mockLogout())

  it('点不了充值：按钮显示「暂未开放」并说明平台免费内测', async () => {
    server.use(http.get('*/api/token/settings', closedSettings))

    renderWithRouter(<RechargePage />)

    expect(await screen.findByText(/充值功能暂未开放/)).toBeInTheDocument()
    const btn = await screen.findByRole('button', { name: '暂未开放' })
    expect(btn).toBeDisabled()
  })

  it('关闭时不展示收款码', async () => {
    server.use(http.get('*/api/token/settings', closedSettings))

    renderWithRouter(<RechargePage />)

    await screen.findByText(/充值功能暂未开放/)
    expect(screen.queryByAltText('微信收款码')).not.toBeInTheDocument()
    expect(screen.queryByAltText('支付宝收款码')).not.toBeInTheDocument()
  })

  it('开放充值后恢复「立即充值」按钮', async () => {
    server.use(http.get('*/api/token/settings', openSettings))

    renderWithRouter(<RechargePage />)

    await waitFor(() =>
      expect(screen.queryByText(/充值功能暂未开放/)).not.toBeInTheDocument()
    )
    const btn = await screen.findByRole('button', { name: '立即充值' })
    expect(btn).toBeEnabled()
  })

  it('余额与消费记录照常可见（保留积分体系）', async () => {
    server.use(http.get('*/api/token/settings', closedSettings))

    renderWithRouter(<RechargePage />)

    expect(await screen.findByText('25')).toBeInTheDocument()
    expect(screen.getByText('当前余额')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '消费记录' })).toBeInTheDocument()
  })
})
