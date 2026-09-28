import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUp,
  ChatCircleDots,
  Coin,
  FileText,
  FolderOpen,
  Pause,
  Play,
  Plus,
  Robot,
  Sparkle,
  TrashSimple,
  UploadSimple,
  User,
  X,
} from '@phosphor-icons/react';
import { request, streamRequest, uploadRequest, toast } from '../lib/api';
import SaveToRepoModal, { type SaveFile } from '../components/SaveToRepoModal';
import CompetitionSearch from '../components/CompetitionSearch';
import { GRADE_LABELS } from '../lib/labels';
import type {
  AssistantContextData,
  AssistantMessage,
  AssistantSession,
  Competition,
  TokenAccount,
  TokenSceneConfig,
  UserDocument,
} from '../lib/types';
import { Card, Skeleton } from '../components/ui';

interface DisplayMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  streaming?: boolean;
  /** 已暂停(可继续) */
  paused?: boolean;
  /** 后端消息 id(start 事件下发) */
  messageId?: number;
}

const QUICK_PROMPTS: { label: string; prompt: string }[] = [
  { label: '🛠 生成小程序/网站', prompt: '帮我生成一个完整的竞赛作品(小程序或网站):先给出文件清单和运行说明,再按每个文件用"FILE: 相对路径"开头加代码块的方式逐文件输出完整代码。' },
  { label: '解读赛制规则', prompt: '帮我详细解读这个比赛的赛制规则、评审标准和时间安排,并指出最容易踩的坑。' },
  { label: '备赛方案', prompt: '结合我的画像和可投入时间,给我一个分阶段的完整备赛方案。' },
  { label: '选题建议', prompt: '参考历年优秀作品的选题方向,结合我的专业背景,给我 5 个有竞争力的选题建议并说明理由。' },
  { label: '商业计划书框架', prompt: '帮我写一份参赛商业计划书的完整框架,并按评审标准标注每个部分的得分要点。' },
  { label: '论文写作指导', prompt: '我要写参赛论文,请给我论文的完整结构大纲和每部分的写作要点,并提醒查重与格式规范。' },
  { label: '答辩 PPT 大纲', prompt: '帮我设计答辩 PPT 的完整大纲(每页标题+要点+讲稿提示),控制在 8 分钟内。' },
  { label: '申报书模板', prompt: '帮我起草参赛申报书,包含项目简介、创新点、实施方案、预期成果等部分,留出待填信息。' },
  { label: '团队分工建议', prompt: '根据我的团队成员情况,给我一个参赛期间的分工与协作建议。' },
];

export default function AssistantPage() {
  const [params] = useSearchParams();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [sessions, setSessions] = useState<AssistantSession[]>([]);
  const [competitionId, setCompetitionId] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [context, setContext] = useState<AssistantContextData | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [saveFiles, setSaveFiles] = useState<{ files: SaveFile[]; msgId: string } | null>(null);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [balance, setBalance] = useState<number | null>(null);
  const [chatPrice, setChatPrice] = useState(20);
  const docInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Token 余额与场景单价
  const refreshBalance = useCallback(() => {
    request<TokenAccount>('/api/token/balance')
      .then((d) => setBalance(d?.balance ?? 0))
      .catch(() => setBalance(null));
  }, []);

  useEffect(() => {
    refreshBalance();
    request<TokenSceneConfig[]>('/api/token/scenes')
      .then((d) => {
        const chat = (d ?? []).find((s) => s.scene === 'ASSISTANT_CHAT');
        if (chat && chat.enabled) setChatPrice(chat.price);
      })
      .catch(() => {});
  }, [refreshBalance]);

  // 初始加载:竞赛库 + 会话
  useEffect(() => {
    Promise.all([
      request<Competition[]>('/api/competitions').catch(() => [] as Competition[]),
      request<AssistantSession[]>('/api/assistant/sessions').catch(() => [] as AssistantSession[]),
    ]).then(([comps, sess]) => {
      setCompetitions(comps ?? []);
      setSessions(sess ?? []);
      const fromUrl = params.get('competition');
      if (fromUrl) {
        setCompetitionId(Number(fromUrl));
      } else {
        setCompetitionId(comps?.[0]?.id ?? null);
      }
      setLoading(false);
    });
  }, [params]);

  // 竞赛切换:加载上下文并开新会话
  useEffect(() => {
    if (competitionId === null) return;
    request<AssistantContextData>(`/api/assistant/context/${competitionId}`)
      .then((d) => setContext(d))
      .catch(() => setContext(null));
    setMessages([]);
    setActiveSessionId(null);
  }, [competitionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // 我的资料(用户上传)
  const loadDocs = () => {
    if (competitionId === null) {
      setDocs([]);
      return;
    }
    request<UserDocument[]>('/api/assistant/documents', {
      params: { competitionId: String(competitionId) },
    })
      .then((d) => setDocs(d ?? []))
      .catch(() => setDocs([]));
  };

  useEffect(() => {
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  const onDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || competitionId === null) return;
    const fd = new FormData();
    fd.append('file', f);
    try {
      await uploadRequest('/api/assistant/documents', fd, {
        competitionId: String(competitionId),
      });
      toast('资料已上传,AI 会自动读取', 'success');
      loadDocs();
    } catch (err) {
      toast(err instanceof Error ? err.message : '上传失败', 'error');
    }
  };

  const removeDoc = async (id: number) => {
    try {
      await request(`/api/assistant/documents/${id}`, { method: 'DELETE' });
      loadDocs();
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleSaveFiles = (files: SaveFile[], msgId: string) => setSaveFiles({ files, msgId });

  const refreshSessions = useCallback(() => {
    request<AssistantSession[]>('/api/assistant/sessions')
      .then((d) => setSessions(d ?? []))
      .catch(() => undefined);
  }, []);

  const openSession = async (s: AssistantSession) => {
    setCompetitionId(s.competitionId);
    setActiveSessionId(s.id);
    setMessages([]);
    const history = await request<AssistantMessage[]>(`/api/assistant/sessions/${s.id}/messages`).catch(
      () => [] as AssistantMessage[]
    );
    setMessages(
      (history ?? []).map((m) => ({ id: `m${m.id}`, role: m.role, content: m.content }))
    );
  };

  const deleteSession = async (id: number) => {
    try {
      await request(`/api/assistant/sessions/${id}`, { method: 'DELETE' });
      toast('会话已删除', 'info');
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming || competitionId === null) return;
    setInput('');
    setStreaming(true);

    const userMsg: DisplayMessage = {
      id: `u${Date.now()}`,
      role: 'USER',
      content,
    };
    const assistantMsg: DisplayMessage = {
      id: `a${Date.now()}`,
      role: 'ASSISTANT',
      content: '',
      streaming: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamRequest(
      '/api/assistant/chat',
      { competitionId, sessionId: activeSessionId, message: content },
      {
        onDelta: (t) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: m.content + t } : m))
          );
        },
        onEvent: (event, data) => {
          if (event === 'start') {
            const d = data as { messageId: number; sessionId?: number };
            if (d.sessionId != null) setActiveSessionId(d.sessionId);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsg.id ? { ...m, messageId: d.messageId } : m))
            );
          } else if (event === 'done') {
            const d = data as { sessionId: number };
            setActiveSessionId(d.sessionId);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsg.id ? { ...m, streaming: false, paused: false } : m))
            );
            refreshSessions();
            refreshBalance();
          } else if (event === 'error') {
            const d = data as { message?: string };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: m.content || `出错了:${d?.message ?? '未知错误'}`, streaming: false, paused: false }
                  : m
              )
            );
            refreshBalance();
          }
        },
        onError: (msg) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content || `出错了:${msg}`, streaming: false, paused: false }
                : m
            )
          );
        },
      },
      controller.signal
    );
    abortRef.current = null;
    setStreaming(false);
    inputRef.current?.focus();
  };

  /** 暂停生成:中断流 + 回写已生成内容 */
  const pause = async () => {
    const msg = messages.find((m) => m.streaming && m.role === 'ASSISTANT');
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    if (!msg) return;
    if (msg.messageId != null) {
      try {
        await request(`/api/assistant/messages/${msg.messageId}`, {
          method: 'PUT',
          body: { content: msg.content },
        });
      } catch {
        // 回写失败不阻塞
      }
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, streaming: false, paused: true } : m))
    );
    toast('已暂停,可稍后继续生成', 'info');
  };

  /** 从断点继续生成 */
  const resume = async (msg: DisplayMessage) => {
    if (!msg.messageId || streaming || activeSessionId == null) return;
    setStreaming(true);
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, paused: false, streaming: true } : m))
    );

    const controller = new AbortController();
    abortRef.current = controller;

    await streamRequest(
      '/api/assistant/chat/continue',
      { sessionId: activeSessionId, messageId: msg.messageId },
      {
        onDelta: (t) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, content: m.content + t } : m))
          );
        },
        onEvent: (event, data) => {
          if (event === 'done') {
            setMessages((prev) =>
              prev.map((m) => (m.id === msg.id ? { ...m, streaming: false, paused: false } : m))
            );
            refreshSessions();
            refreshBalance();
          } else if (event === 'error') {
            const d = data as { message?: string };
            toast(d?.message ?? '续写失败', 'error');
            setMessages((prev) =>
              prev.map((m) => (m.id === msg.id ? { ...m, streaming: false, paused: true } : m))
            );
            refreshBalance();
          }
        },
        onError: (m) => {
          toast(m, 'error');
          setMessages((prev) =>
            prev.map((x) => (x.id === msg.id ? { ...x, streaming: false, paused: true } : x))
          );
        },
      },
      controller.signal
    );
    abortRef.current = null;
    setStreaming(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  const competition = competitions.find((c) => c.id === competitionId);

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部:标题 + 竞赛选择 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600">
            <Robot size={22} weight="fill" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">AI 竞赛助手</h1>
            <p className="text-xs text-zinc-400">结合官网规则与历年优秀作品,帮你把比赛做出来</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/recharge"
            title="充值中心"
            className="flex items-center gap-1.5 rounded-[12px] border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100"
          >
            <Coin size={15} weight="fill" className="text-brand-600" />
            余额
            <span className="font-num">{balance === null ? '…' : balance.toLocaleString('zh-CN')}</span>
            <span className="hidden text-brand-600 sm:inline">· 每次对话 {chatPrice} Token · 去充值</span>
          </Link>
          <CompetitionSearch
            competitions={competitions}
            value={competitionId}
            onChange={setCompetitionId}
          />
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50 lg:hidden"
          >
            {panelOpen ? '收起资料' : '比赛资料'}
          </button>
        </div>
      </div>

      {balance !== null && balance < chatPrice && (
        <div className="flex items-center justify-between rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-sm text-amber-800">
            余额不足 {chatPrice} Token，无法发起新的 AI 对话
          </p>
          <Link to="/recharge" className="text-sm font-semibold text-amber-800 underline">
            去充值 →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_300px]">
        {/* 会话列表 */}
        <Card className="hidden h-[calc(100dvh-190px)] flex-col p-3 lg:flex">
          <button
            onClick={() => {
              setActiveSessionId(null);
              setMessages([]);
            }}
            className="flex items-center justify-center gap-1.5 rounded-[10px] bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Plus size={15} />
            新对话
          </button>
          <div className="mt-3 flex flex-1 flex-col gap-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-zinc-400">还没有历史会话</p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`group flex items-center gap-1 rounded-[8px] pr-1 transition-colors ${
                    activeSessionId === s.id ? 'bg-brand-50' : 'hover:bg-zinc-50'
                  }`}
                >
                  <button
                    onClick={() => openSession(s)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left"
                  >
                    <ChatCircleDots
                      size={15}
                      className={activeSessionId === s.id ? 'shrink-0 text-brand-600' : 'shrink-0 text-zinc-400'}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-zinc-700">{s.title}</span>
                      <span className="block truncate text-[10px] text-zinc-400">{s.competitionName}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => deleteSession(s.id)}
                    title="删除会话"
                    className="hidden shrink-0 rounded p-1 text-zinc-300 hover:bg-zinc-100 hover:text-red-500 group-hover:block"
                  >
                    <TrashSimple size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* 对话区 */}
        <Card className="flex h-[calc(100dvh-190px)] flex-col p-0">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Sparkle size={26} weight="fill" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-zinc-900">
                  {competition ? `一起搞定「${competition.name}」` : '一起搞定你的比赛'}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                  我已经加载了官网规则、历年优秀作品和你的画像/团队/备赛计划,可以直接帮你解读规则、
                  出方案、写计划书和答辩材料。试试下面的快捷指令 ↓
                </p>
                <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => send(q.prompt)}
                      className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 transition-colors hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onResume={() => resume(m)}
                  savedMap={savedMap}
                  onSaveFiles={(files) => handleSaveFiles(files, m.id)}
                />
              ))
            )}
          </div>

          {/* 输入区 */}
          <div className="border-t border-zinc-100 p-3.5">
            {messages.length > 0 && streaming === false && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.slice(0, 4).map((q) => (
                  <button
                    key={q.label}
                    onClick={() => send(q.prompt)}
                    disabled={streaming}
                    className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-500 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-[12px] border border-zinc-200 bg-white p-2 focus-within:border-brand-300">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder={
                  streaming
                    ? '生成中…'
                    : competition
                      ? `问点什么,或让助手帮你写「${competition.name}」的材料`
                      : '先在上方选择一个竞赛'
                }
                disabled={streaming || competitionId === null}
                className="max-h-32 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-zinc-400"
              />
              {streaming ? (
                <button
                  onClick={pause}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-amber-500 text-white transition-colors hover:bg-amber-600"
                  title="暂停生成"
                >
                  <Pause size={15} weight="fill" />
                </button>
              ) : (
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || competitionId === null}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:bg-zinc-200 disabled:text-zinc-400"
                  title="发送"
                >
                  <ArrowUp size={16} weight="bold" />
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* 上下文面板(桌面常驻,移动端抽屉) */}
        <aside
          className={`${panelOpen ? 'fixed inset-0 z-50 flex bg-zinc-900/30 p-4 lg:static lg:bg-transparent lg:p-0' : 'hidden lg:block'}`}
        >
          <Card className="flex h-[calc(100dvh-190px)] w-full flex-col overflow-hidden lg:w-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-800">已加载的比赛资料</p>
              <button
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 lg:hidden"
                onClick={() => setPanelOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
              <div>
                <p className="mb-1.5 font-medium text-zinc-500">赛制规则</p>
                {competition?.rules ? (
                  <p className="whitespace-pre-wrap leading-relaxed text-zinc-600">
                    {competition.rules}
                  </p>
                ) : (
                  <p className="text-zinc-400">
                    暂未收录详细规则,助手会引导你参考官网
                    {competition?.officialUrl && (
                      <a
                        href={competition.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 text-brand-600 hover:text-brand-700"
                      >
                        打开官网
                      </a>
                    )}
                  </p>
                )}
              </div>

              {/* 我的资料(用户上传) */}
              <div>
                <p className="mb-1.5 flex items-center justify-between font-medium text-zinc-500">
                  我的资料
                  <button
                    onClick={() => docInputRef.current?.click()}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700"
                  >
                    ＋ 上传
                  </button>
                </p>
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".txt,.md,.pdf"
                  className="hidden"
                  onChange={onDocUpload}
                />
                {docs.length === 0 ? (
                  <button
                    onClick={() => docInputRef.current?.click()}
                    className="w-full rounded-[10px] border-2 border-dashed border-brand-300 bg-white px-3 py-4 text-center transition-colors hover:border-brand-500 hover:bg-brand-50"
                  >
                    <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-[9px] border border-brand-200 bg-brand-50 text-brand-600">
                      <UploadSimple size={13} />
                    </span>
                    <p className="mt-1.5 text-xs font-semibold text-zinc-600">上传规则 / 要求 / 笔记</p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">txt / md / pdf · 单个 ≤5MB</p>
                  </button>
                ) : (
                  <div className="overflow-hidden rounded-[10px] border border-zinc-200">
                    {docs.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-2 border-b border-zinc-100 px-2.5 py-2 last:border-0"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[9px] font-extrabold ${
                            d.fileExt === 'pdf'
                              ? 'bg-red-50 text-red-500'
                              : d.fileExt === 'md'
                                ? 'bg-sky-50 text-sky-700'
                                : 'bg-zinc-100 text-zinc-500'
                          }`}
                        >
                          {(d.fileExt ?? 'txt').toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-zinc-700">{d.fileName}</p>
                          <p className="font-num text-[9.5px] text-zinc-400">
                            {d.fileSize ? `${Math.max(1, Math.round(d.fileSize / 1024))} KB` : ''}
                          </p>
                        </div>
                        {d.hasText ? (
                          <span className="flex shrink-0 items-center gap-1 text-[9.5px] font-bold text-brand-600">
                            <i className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                            已读取
                          </span>
                        ) : (
                          <span className="shrink-0 text-[9.5px] text-zinc-400">未解析</span>
                        )}
                        <button
                          onClick={() => removeDoc(d.id)}
                          title="删除资料"
                          className="h-5 w-5 shrink-0 rounded-[6px] text-zinc-300 hover:bg-red-50 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {docs.length < 10 && (
                      <button
                        onClick={() => docInputRef.current?.click()}
                        className="w-full py-1.5 text-[10px] font-medium text-brand-600 hover:bg-brand-50"
                      >
                        ＋ 继续上传({10 - docs.length} 个名额)
                      </button>
                    )}
                  </div>
                )}
                <p className="mt-1.5 text-[9.5px] leading-relaxed text-zinc-400">
                  上传后自动纳入助手上下文,比如老师发的题目要求、评分细则
                </p>
              </div>

              <div>
                <p className="mb-1.5 font-medium text-zinc-500">
                  历年优秀作品{context?.works && context.works.length > 0 ? `(${context.works.length})` : ''}
                </p>
                {context?.works && context.works.length > 0 ? (
                  <ul className="space-y-1.5">
                    {context.works.slice(0, 5).map((w) => (
                      <li key={w.id} className="leading-relaxed text-zinc-600">
                        · {w.title}
                        {w.year && <span className="text-zinc-400">({w.year})</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-zinc-400">暂无收录</p>
                )}
              </div>

              <div>
                <p className="mb-1.5 font-medium text-zinc-500">我的画像</p>
                {context?.profile ? (
                  <p className="leading-relaxed text-zinc-600">
                    {context.profile.discipline}
                    {context.profile.major ? `·${context.profile.major}` : ''}
                    {context.profile.grade ? `·${GRADE_LABELS[context.profile.grade] ?? ''}` : ''}
                    {context.profile.skills && context.profile.skills.length > 0 && (
                      <>
                        <br />
                        技能:{context.profile.skills.join('、')}
                      </>
                    )}
                    {context.profile.goals && context.profile.goals.length > 0 && (
                      <>
                        <br />
                        目标:{context.profile.goals.join('、')}
                      </>
                    )}
                  </p>
                ) : (
                  <Link to="/onboarding" className="text-brand-600 hover:text-brand-700">
                    去完善画像 →
                  </Link>
                )}
              </div>

              <div>
                <p className="mb-1.5 font-medium text-zinc-500">团队 / 项目 / 备赛</p>
                <p className="leading-relaxed text-zinc-600">
                  {context?.teams && context.teams.length > 0
                    ? `团队:${context.teams.map((t) => t.name).join('、')}`
                    : '团队:未加入'}
                  <br />
                  {context?.repos && context.repos.length > 0
                    ? `项目空间:${context.repos.length} 个仓库`
                    : '项目空间:暂无'}
                  <br />
                  {context?.plan
                    ? `备赛计划:「${context.plan.title}」 ${context.plan.doneCount}/${context.plan.taskCount}`
                    : '备赛计划:未生成'}
                </p>
              </div>

              {competition?.officialUrl && (
                <a
                  href={competition.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-[10px] bg-zinc-50 px-3 py-2.5 text-center font-medium text-brand-600 hover:bg-zinc-100"
                >
                  访问竞赛官网 ↗
                </a>
              )}
            </div>
          </Card>
        </aside>
      </div>

      {/* 存入项目空间弹窗 */}
      {saveFiles && (
        <SaveToRepoModal
          files={saveFiles.files}
          onClose={() => setSaveFiles(null)}
          onSaved={(paths) => {
            setSavedMap((prev) => {
              const next = { ...prev };
              paths.forEach((p) => (next[`${saveFiles.msgId}:${p}`] = true));
              return next;
            });
            setSaveFiles(null);
          }}
        />
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onResume,
  savedMap,
  onSaveFiles,
}: {
  message: DisplayMessage;
  onResume: () => void;
  savedMap: Record<string, boolean>;
  onSaveFiles: (files: SaveFile[]) => void;
}) {
  const isUser = message.role === 'USER';
  const segments = useMemo(() => parseSegments(message.content), [message.content]);
  const fileSegs = segments.filter((s): s is { kind: 'file'; path: string; code: string } => s.kind === 'file');
  const fileSegsDone = fileSegs.filter((f) => savedMap[`${message.id}:${f.path}`]);
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-zinc-200 text-zinc-500' : 'bg-brand-600 text-white'
        }`}
      >
        {isUser ? <User size={15} /> : <Robot size={16} />}
      </span>
      <div
        className={`max-w-[86%] rounded-[12px] px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-tr-sm bg-brand-600 text-white'
            : 'rounded-tl-sm bg-zinc-100 text-zinc-700'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            {message.streaming && !message.content.trim() && (
              <span className="flex items-center gap-1.5 text-zinc-400">
                正在思考
                <span className="flex gap-0.5">
                  <i className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                  <i className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:120ms]" />
                  <i className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:240ms]" />
                </span>
              </span>
            )}
            {!message.streaming && message.content.trim() === '' && !message.paused && (
              <span className="text-zinc-400">(已停止)</span>
            )}
            {segments.map((seg, i) =>
              seg.kind === 'text' ? (
                <MarkdownLite key={i} content={seg.text} />
              ) : (
                <FileBlock
                  key={i}
                  path={seg.path}
                  code={seg.code}
                  saved={Boolean(savedMap[`${message.id}:${seg.path}`])}
                  onSave={() => onSaveFiles([{ path: seg.path, content: seg.code }])}
                />
              )
            )}
            {!message.streaming && fileSegs.length >= 2 && fileSegsDone.length < fileSegs.length && (
              <button
                onClick={() => onSaveFiles(fileSegs.map((f) => ({ path: f.path, content: f.code })))}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-brand-300 bg-brand-50/60 px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100"
              >
                <FolderOpen size={14} />
                全部存入项目空间({fileSegs.length} 个文件)
              </button>
            )}
            {!message.streaming && fileSegs.length > 0 && fileSegsDone.length === fileSegs.length && (
              <p className="mt-2 flex items-center gap-1.5 rounded-[10px] bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
                ✓ 已存入 {fileSegs.length} 个文件
                <Link to="/repos" className="ml-auto font-bold hover:text-brand-800">
                  去项目空间查看 →
                </Link>
              </p>
            )}
            {message.streaming && message.content.trim() && (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-zinc-400 align-middle" />
            )}
            {message.paused && (
              <div className="mt-2 flex items-center gap-2 border-t border-zinc-200/80 pt-2">
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-200">
                  <Pause size={11} weight="fill" />
                  {message.content.trim() ? '已暂停' : '已停止'}
                </span>
                {message.content.trim() && message.messageId != null && (
                  <button
                    onClick={onResume}
                    className="flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    <Play size={11} weight="fill" />
                    继续生成
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** 解析消息内容:文本段 + 文件段(FILE: 路径 + 代码块) */
function parseSegments(content: string): ({ kind: 'text'; text: string } | { kind: 'file'; path: string; code: string })[] {
  const segs: ({ kind: 'text'; text: string } | { kind: 'file'; path: string; code: string })[] = [];
  const re = /FILE:\s*([^\n]+)\s*\n```[^\n]*\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (m.index > last) segs.push({ kind: 'text', text: content.slice(last, m.index) });
    segs.push({ kind: 'file', path: m[1].trim(), code: m[2].replace(/\n$/, '') });
    last = m.index + m[0].length;
  }
  if (last < content.length) segs.push({ kind: 'text', text: content.slice(last) });
  return segs;
}

/** 文件块:路径头 + 代码 + 存入按钮 */
function FileBlock({
  path,
  code,
  saved,
  onSave,
}: {
  path: string;
  code: string;
  saved: boolean;
  onSave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('复制失败', 'error');
    }
  };
  return (
    <div className="mt-2.5 overflow-hidden rounded-[10px] border border-zinc-200">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-white/70 px-3 py-1.5">
        <FileText size={13} className="shrink-0 text-brand-600" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-semibold text-zinc-600">
          {path}
        </span>
        <button
          onClick={copy}
          className="rounded-[7px] border border-zinc-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-zinc-500 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          {copied ? '已复制' : '复制'}
        </button>
        <button
          onClick={onSave}
          disabled={saved}
          className={`rounded-[7px] px-2.5 py-0.5 text-[10.5px] font-bold transition-colors ${
            saved
              ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          {saved ? '✓ 已存' : '存入项目空间'}
        </button>
      </div>
      <pre className="max-h-56 overflow-auto bg-[#101713] p-3 font-mono text-[11px] leading-relaxed text-emerald-100/90">
        {code}
      </pre>
    </div>
  );
}

/** 极简 Markdown 渲染:标题/列表/加粗/换行 */
function MarkdownLite({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        if (/^#{1,3}\s/.test(trimmed)) {
          return (
            <p key={i} className="pt-1 font-semibold text-zinc-800">
              {trimmed.replace(/^#{1,3}\s/, '')}
            </p>
          );
        }
        if (/^[-*]\s/.test(trimmed)) {
          return (
            <p key={i} className="pl-2 text-zinc-600">
              • {trimmed.replace(/^[-*]\s/, '')}
            </p>
          );
        }
        if (/^\d+[.、)]\s*/.test(trimmed)) {
          return <p key={i} className="text-zinc-600">{trimmed}</p>;
        }
        return (
          <p key={i} className="text-zinc-600">
            <InlineBold text={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

function InlineBold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold text-zinc-800">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}
