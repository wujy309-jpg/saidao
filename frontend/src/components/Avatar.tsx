import { useEffect, useState } from 'react';
import { fallbackGradient, initialOf, isPresetRef, presetOf } from '../lib/avatars';

/**
 * 全站统一头像。
 *
 * <p>三种来源按优先级回退，任何一步失败都不会出现「破图」：
 * <ol>
 *   <li>用户上传的图片（{@code /api/avatars/{id}?v=...}）——加载失败自动降级；</li>
 *   <li>系统预设头像（{@code preset:xxx}）——纯 CSS 渐变 + 图标，零请求；</li>
 *   <li>默认：昵称首字 + 按昵称哈希出的固定渐变，同一个人各处颜色一致。</li>
 * </ol>
 *
 * <p>尺寸走内联样式而不是 Tailwind 的固定档位，方便调用方按场景传 20~96 任意值。
 */
export function Avatar({
  name,
  avatarUrl,
  size = 32,
  className = '',
  ring = false,
  title,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  /** 叠放头像时用白色描边把彼此分开 */
  ring?: boolean;
  title?: string;
}) {
  const preset = presetOf(avatarUrl);
  // preset: 开头的永远不是图片地址——ID 不认识时也要走色块分支,而不是当成 URL 去请求
  const src = !isPresetRef(avatarUrl) && avatarUrl ? avatarUrl : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const shape = ring ? 'ring-2 ring-white' : 'ring-1 ring-black/5';
  const wrapper = `relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${shape} ${className}`;
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  const label = name?.trim() || '用户';

  if (src && !failed) {
    return (
      <span className={wrapper} style={style} title={title}>
        <img
          src={src}
          alt={`${label}的头像`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  const gradient = preset ? preset.gradient : fallbackGradient(name);
  const Inner = preset ? preset.icon : null;

  return (
    <span
      role="img"
      aria-label={`${label}的头像`}
      className={`${wrapper} bg-gradient-to-br font-bold text-white ${gradient}`}
      style={style}
    >
      {Inner ? (
        <Inner size={Math.round(size * 0.55)} weight="fill" />
      ) : (
        <span className="leading-none">{initialOf(name)}</span>
      )}
    </span>
  );
}
