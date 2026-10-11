import { useCallback, useEffect, useState } from 'react'
import { LinkBreak, UploadSimple, ArrowClockwise, CheckCircle } from '@phosphor-icons/react'
import { request, toast } from '../lib/api'
import { Badge, Button, Card, Empty, Field, StatCard, Table, Textarea, Select } from '../components/ui'

interface BrokenLink {
  type: 'COMPETITION' | 'WORK'
  name: string
  url: string
  status: number
  checkedAt: string | null
}

interface LinkHealth {
  competitionTotal: number
  competitionOk: number
  competitionBroken: number
  competitionUnchecked: number
  workTotal: number
  workOk: number
  workBroken: number
  workUnchecked: number
  lastCheckedAt: string | null
  broken: BrokenLink[]
}

interface ImportChange {
  name: string
  action: string
  fields: string[]
}

interface ImportProblem {
  index: number
  name: string
  reason: string
}

interface ImportReport {
  dryRun: boolean
  total: number
  created: number
  updated: number
  unchanged: number
  invalidCount: number
  changes: ImportChange[]
  changesTruncated: boolean
  invalid: ImportProblem[]
}

const SAMPLE = `[
  {
    "name": "全国大学生电子设计竞赛",
    "officialUrl": "http://nuedc.xjtu.edu.cn/",
    "rules": "赛制与评审标准……"
  }
]`

function fmtTime(v: string | null) {
  if (!v) return '尚未体检'
  return v.replace('T', ' ').slice(0, 16)
}

export default function DataPage() {
  const [health, setHealth] = useState<LinkHealth | null>(null)
  const [checking, setChecking] = useState(false)

  const [kind, setKind] = useState<'competitions' | 'works'>('competitions')
  const [text, setText] = useState('')
  const [report, setReport] = useState<ImportReport | null>(null)
  const [busy, setBusy] = useState(false)

  const loadHealth = useCallback(() => {
    request<LinkHealth>('/api/admin-api/data/link-health')
      .then(setHealth)
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败', 'error'))
  }, [])

  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  const runCheck = async () => {
    setChecking(true)
    try {
      const r = await request<LinkHealth>('/api/admin-api/data/link-health/check', { method: 'POST' })
      setHealth(r)
      toast(`体检完成：官网失效 ${r.competitionBroken} 个，作品失效 ${r.workBroken} 条`, 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : '体检失败', 'error')
    } finally {
      setChecking(false)
    }
  }

  const parse = (): unknown[] => {
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch (e) {
      throw new Error('JSON 解析失败：' + (e instanceof Error ? e.message : ''))
    }
    if (!Array.isArray(data)) throw new Error('请粘贴 JSON 数组（以 [ 开头）')
    if (data.length === 0) throw new Error('数组为空')
    return data
  }

  const doImport = async (dryRun: boolean) => {
    setBusy(true)
    try {
      const items = parse()
      const r = await request<ImportReport>(`/api/admin-api/data/${kind}/import`, {
        method: 'POST',
        body: { dryRun, items },
      })
      setReport(r)
      toast(
        dryRun
          ? `预览完成：新增 ${r.created}，更新 ${r.updated}，异常 ${r.invalidCount}`
          : `导入完成：新增 ${r.created}，更新 ${r.updated}`,
        dryRun && r.invalidCount > 0 ? 'error' : 'success'
      )
      if (!dryRun) loadHealth()
    } catch (e) {
      toast(e instanceof Error ? e.message : '导入失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  const brokenComps = health?.broken.filter((b) => b.type === 'COMPETITION') ?? []
  const brokenWorks = health?.broken.filter((b) => b.type === 'WORK') ?? []

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">数据维护</h1>
        <p className="mt-1 text-sm text-zinc-400">
          链接体检与批量导入。链接体检在服务器上执行——同样的链接在境外网络会大量误判，必须以国内网络为准
        </p>
      </div>

      {/* ============ 链接体检 ============ */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
              <LinkBreak size={16} /> 链接体检
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              最近体检：{fmtTime(health?.lastCheckedAt ?? null)} · 每天 04:30 自动跑一次
            </p>
          </div>
          <Button onClick={runCheck} disabled={checking}>
            <ArrowClockwise size={15} />
            {checking ? '体检中…（约 1-2 分钟）' : '立即体检'}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="竞赛官网失效"
            value={String(health?.competitionBroken ?? '-')}
            accent={(health?.competitionBroken ?? 0) > 0 ? 'red' : 'brand'}
            sub={`共 ${health?.competitionTotal ?? 0} 条，未体检 ${health?.competitionUnchecked ?? 0}`}
          />
          <StatCard
            label="作品链接失效"
            value={String(health?.workBroken ?? '-')}
            accent={(health?.workBroken ?? 0) > 0 ? 'red' : 'brand'}
            sub={`共 ${health?.workTotal ?? 0} 条，未体检 ${health?.workUnchecked ?? 0}`}
          />
          <StatCard label="官网可用" value={String(health?.competitionOk ?? '-')} sub="状态码 2xx/3xx" />
          <StatCard label="作品可用" value={String(health?.workOk ?? '-')} sub="状态码 2xx/3xx" />
        </div>

        {health && health.broken.length === 0 ? (
          <p className="mt-4 flex items-center gap-1.5 text-sm text-brand-700">
            <CheckCircle size={15} /> 当前没有检测到失效链接
          </p>
        ) : (
          <div className="mt-4">
            <p className="mb-2 text-xs text-zinc-500">
              失效清单（{brokenComps.length} 个官网 + {brokenWorks.length} 条作品）
            </p>
            <Table head={['类型', '名称', '状态', '链接']}>
              {(health?.broken ?? []).slice(0, 50).map((b, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 text-xs">
                    <Badge cls={b.type === 'COMPETITION' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-zinc-100 text-zinc-600 ring-zinc-200'}>
                      {b.type === 'COMPETITION' ? '竞赛官网' : '优秀作品'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-zinc-700">{b.name}</td>
                  <td className="num px-4 py-2.5 text-xs">
                    <span className={b.status === 0 || b.status >= 400 ? 'text-red-600' : 'text-zinc-500'}>
                      {b.status === 0 ? '连接失败' : b.status}
                    </span>
                  </td>
                  <td className="max-w-[420px] truncate px-4 py-2.5 text-xs text-zinc-400">
                    <a href={b.url} target="_blank" rel="noreferrer" className="hover:text-brand-600">
                      {b.url}
                    </a>
                  </td>
                </tr>
              ))}
            </Table>
            {(health?.broken.length ?? 0) > 50 && (
              <p className="mt-2 text-xs text-zinc-400">仅显示前 50 条，其余请用接口或数据库查询</p>
            )}
          </div>
        )}
      </Card>

      {/* ============ 批量导入 ============ */}
      <Card className="p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
          <UploadSimple size={16} /> 批量导入
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          粘贴 JSON 数组即可。按 <b>名称</b> 匹配：不存在则新增，存在则<b>只更新你写出的字段</b>（没写的保持原值）。
          优秀作品必须写 <code>competitionName</code> 且能与已有竞赛对上名，否则会被拒绝而不是静默丢弃。
          当前链接会自动标记为「未体检」，等下次体检重测。
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
          <Field label="导入类型">
            <Select value={kind} onChange={(e) => { setKind(e.target.value as 'competitions' | 'works'); setReport(null) }}>
              <option value="competitions">竞赛</option>
              <option value="works">优秀作品</option>
            </Select>
          </Field>
          <Field label={`JSON 内容（${kind === 'competitions' ? '竞赛' : '优秀作品'}）`} hint="单次最多 500 条">
            <Textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={kind === 'competitions' ? SAMPLE : '[{"competitionName":"全国大学生电子设计竞赛","title":"…","link":"https://…","type":"PROJECT","year":2025}]'}
              className="font-mono text-xs"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="subtle" onClick={() => doImport(true)} disabled={busy || !text.trim()}>
            预览变更（不落库）
          </Button>
          <Button
            onClick={() => doImport(false)}
            disabled={busy || !text.trim() || !report || report.invalidCount > 0}
          >
            {busy ? '处理中…' : '确认导入'}
          </Button>
          {report && report.invalidCount > 0 && (
            <span className="self-center text-xs text-red-600">
              存在 {report.invalidCount} 条异常，请修正后重新预览才能导入
            </span>
          )}
        </div>

        {report && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="新增" value={String(report.created)} accent={report.created > 0 ? 'brand' : 'zinc'} sub={report.dryRun ? '预览' : '已写入'} />
              <StatCard label="更新" value={String(report.updated)} sub={report.dryRun ? '预览' : '已写入'} />
              <StatCard label="无变化" value={String(report.unchanged)} sub="内容与现有数据一致" />
              <StatCard label="异常" value={String(report.invalidCount)} accent={report.invalidCount > 0 ? 'red' : 'zinc'} sub="不会写入" />
            </div>

            {report.invalid.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-red-600">异常明细（这些条目不会被导入）</p>
                <Table head={['#', '名称', '原因']}>
                  {report.invalid.slice(0, 30).map((p) => (
                    <tr key={p.index}>
                      <td className="num px-4 py-2 text-xs text-zinc-400">{p.index}</td>
                      <td className="px-4 py-2 text-sm text-zinc-700">{p.name}</td>
                      <td className="px-4 py-2 text-xs text-red-600">{p.reason}</td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}

            {report.changes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-600">变更明细</p>
                <Table head={['名称', '动作', '涉及字段']}>
                  {report.changes.slice(0, 30).map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-sm text-zinc-700">{c.name}</td>
                      <td className="px-4 py-2 text-xs">
                        <Badge cls={c.action === '新增' ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}>
                          {c.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-zinc-500">{c.fields.join('、') || '—'}</td>
                    </tr>
                  ))}
                </Table>
                {report.changesTruncated && (
                  <p className="mt-2 text-xs text-zinc-400">明细仅显示前 100 条</p>
                )}
              </div>
            )}

            {report.total > 0 && report.created === 0 && report.updated === 0 && report.invalidCount === 0 && (
              <Empty text="所有条目与现有数据一致，无需导入" />
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
