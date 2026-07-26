import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  PageContent,
  PageHeader,
  PageShell,
  type PageWidth,
} from './PageLayout';

const PAGE_WIDTHS: PageWidth[] = ['wide', 'standard', 'narrow'];

describe('PageLayout', () => {
  it.each(PAGE_WIDTHS)(
    'stretches the %s header and content while preserving the shared gutter',
    (width) => {
      render(
        <PageShell>
          <PageHeader title="页面标题" width={width} />
          <PageContent width={width}>页面内容</PageContent>
        </PageShell>,
      );

      const headerContainer = screen.getByRole('banner').firstElementChild;
      const contentContainer = screen.getByText('页面内容');

      expect(headerContainer).toHaveClass('app-page-gutter', 'w-full');
      expect(contentContainer).toHaveClass('app-page-gutter', 'w-full');
      expect(headerContainer).not.toHaveClass(/max-w-/);
      expect(contentContainer).not.toHaveClass(/max-w-/);
      expect(headerContainer).toHaveAttribute('data-page-width', width);
      expect(contentContainer).toHaveAttribute('data-page-width', width);
    },
  );

  it('renders the supported header information zones', () => {
    render(
      <PageHeader
        title="物品详情"
        titleSize="detail"
        eyebrow="库存对象"
        description="查看物品的位置、状态和相关记录。"
        backLink={<a href="/">返回首页</a>}
        actions={<button type="button">编辑</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: '物品详情' })).toHaveClass(
      'text-2xl',
      'md:text-3xl',
    );
    expect(screen.getByText('库存对象')).toBeInTheDocument();
    expect(screen.getByText('查看物品的位置、状态和相关记录。')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回首页' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument();
  });
});
