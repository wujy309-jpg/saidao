import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 页面级错误边界。
 *
 * <p>React 在渲染期抛错且没有边界时，会把<b>整棵树</b>卸载掉——导航栏、外壳一起消失，
 * 用户只看到一个纯白页面（2026-10-11 竞赛详情页就是这样白屏的：论坛列表改成分页返回后，
 * 页面仍按数组调用 .slice()）。有了边界，最坏情况也只是内容区显示一张错误卡片，
 * 导航和返回入口都还在，用户知道发生了什么。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 打点留在控制台，方便线上排查（当前没有接入错误追踪服务）
    console.error('[页面渲染失败]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-3 py-16">
        <h2 className="text-base font-semibold text-zinc-800">这个页面出错了</h2>
        <p className="text-sm text-zinc-500">
          已记录错误信息，其他功能不受影响。可以刷新重试，或先回到首页。
        </p>
        <p className="w-full overflow-x-auto rounded-[10px] bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
          {error.message || String(error)}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-[10px] bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            刷新重试
          </button>
          <Link
            to="/"
            onClick={() => this.setState({ error: null })}
            className="rounded-[10px] border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            回到首页
          </Link>
        </div>
      </div>
    );
  }
}
