import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from '../../components/Avatar';
import { fallbackGradient, initialOf, presetOf } from '../../lib/avatars';

describe('<Avatar> 头像渲染', () => {
  it('没有头像时用昵称首字 + 固定渐变色块', () => {
    const { container } = render(<Avatar name="张三" size={32} />);

    expect(screen.getByText('张')).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain(fallbackGradient('张三'));
    expect(container.firstElementChild).toHaveStyle({ width: '32px', height: '32px' });
  });

  it('昵称首字不会把 emoji 或被截断的代理对渲染成乱码', () => {
    expect(initialOf('🚀小队长')).toBe('🚀');
    expect(initialOf('alice')).toBe('A');
    expect(initialOf('   ')).toBe('?');
  });

  it('预设头像渲染图标,不再显示首字', () => {
    render(<Avatar name="李四" avatarUrl="preset:trophy" size={40} />);

    expect(presetOf('preset:trophy')?.label).toBe('荣誉');
    expect(screen.queryByText('李')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: '李四的头像' })).toBeInTheDocument();
  });

  it('不认识的预设 ID 退化成首字色块(前后端不同步也不会破图)', () => {
    render(<Avatar name="王五" avatarUrl="preset:不存在的头像" />);

    expect(screen.getByText('王')).toBeInTheDocument();
  });

  it('上传的图片用 <img>,加载失败自动回退首字', () => {
    render(<Avatar name="赵六" avatarUrl="/api/avatars/6?v=123" />);

    const img = screen.getByAltText('赵六的头像');
    expect(img).toHaveAttribute('src', '/api/avatars/6?v=123');

    fireEvent.error(img);
    expect(screen.queryByAltText('赵六的头像')).not.toBeInTheDocument();
    expect(screen.getByText('赵')).toBeInTheDocument();
  });
});
