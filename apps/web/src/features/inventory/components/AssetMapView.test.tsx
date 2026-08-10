import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '@inplace/domain';
import { fetchCategories } from '../../../legacy/categories';
import { updateItem } from '../../../legacy/items';
import AssetMapView from './AssetMapView';

vi.mock('../../../app/providers/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../../legacy/items', () => ({
  updateItem: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../legacy/categories', () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
}));

vi.mock('../api/mapApi', () => ({
  fetchMapRuntimeConfig: vi.fn().mockResolvedValue({
    enabled: true,
    provider: 'amap',
    key: 'public-test-key',
    serviceHost: '/api/v1/maps/_AMapService',
  }),
}));

vi.mock('./AmapAssetCanvas', () => ({
  default: ({
    points,
    categories,
    assignmentTargetName,
    onSelectPoints,
    onCoordinateChosen,
  }: {
    points: Array<{ id: string; sourceNode: { item: { name: string; category: string } } }>;
    categories: Array<{ name: string; icon: string }>;
    assignmentTargetName: string | null;
    onSelectPoints: (pointIds: string[]) => void;
    onCoordinateChosen: (coordinate: {
      longitude: number;
      latitude: number;
      address: string;
    }) => Promise<void>;
  }) => (
    <div aria-label="真实地理资产地图" data-assignment={assignmentTargetName ?? ''}>
      {points.map((point) => (
        <button
          key={point.id}
          type="button"
          data-location-icon={categories.find((category) => category.name === point.sourceNode.item.category)?.icon ?? ''}
          onClick={() => onSelectPoints([point.id])}
        >
          地图标记 {point.sourceNode.item.name}
        </button>
      ))}
      {points.length > 1 ? (
        <button type="button" onClick={() => onSelectPoints(points.map((point) => point.id))}>
          聚合位置
        </button>
      ) : null}
      {assignmentTargetName ? (
        <button
          type="button"
          onClick={() => void onCoordinateChosen({
            longitude: 120.1551,
            latitude: 30.2741,
            address: '浙江省杭州市',
          })}
        >
          选择地图坐标
        </button>
      ) : null}
    </div>
  ),
}));

function createItem(input: Partial<Item> & Pick<Item, 'id' | 'name'>): Item {
  return {
    id: input.id,
    user_id: 'user-1',
    household_id: 'household-1',
    parent_id: input.parent_id ?? null,
    type: input.type ?? 'item',
    name: input.name,
    description: input.description ?? '',
    category: input.category ?? '',
    price: input.price ?? null,
    quantity: input.quantity ?? 1,
    tracking_mode: 'unique',
    minimum_quantity: null,
    expiry_date: null,
    purchase_date: null,
    warranty_date: null,
    status: input.status ?? 'in_stock',
    images: [],
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    created_at: '2026-07-29T00:00:00.000Z',
    updated_at: '2026-07-29T00:00:00.000Z',
  };
}

const GEO_LOCATION = {
  geo_location: {
    longitude: 116.3974,
    latitude: 39.9092,
    address: '北京市东城区',
  },
  location_tag: true,
};
const EXPECTED_CURRENCY_OCCURRENCES = 2;

const INVENTORY_FIXTURE = [
  createItem({ id: 'beijing-home', name: '北京家', type: 'container', category: '公寓', metadata: GEO_LOCATION }),
  createItem({ id: 'camera', name: '相机', parent_id: 'beijing-home', category: '数码', status: 'borrowed', price: 5000 }),
  createItem({ id: 'coat', name: '羽绒服', parent_id: 'beijing-home', category: '衣物', price: 800 }),
  createItem({ id: 'hangzhou-home', name: '杭州仓库', type: 'container', metadata: { location_tag: true } }),
];

const SECOND_GEO_LOCATION = {
  geo_location: {
    longitude: 121.4737,
    latitude: 31.2304,
    address: '上海市黄浦区',
  },
  location_tag: true,
};

function renderView(
  props: Partial<React.ComponentProps<typeof AssetMapView>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AssetMapView
          householdId="household-1"
          canEdit
          items={INVENTORY_FIXTURE}
          onRequestCreateLocation={vi.fn()}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AssetMapView', () => {
  beforeEach(() => {
    vi.mocked(updateItem).mockClear();
    vi.mocked(fetchCategories).mockResolvedValue([]);
  });

  it('passes the outermost location container category icon to the map', async () => {
    vi.mocked(fetchCategories).mockResolvedValue([{
      id: 'location-category',
      user_id: 'user-1',
      household_id: 'household-1',
      item_type: 'container',
      scope: 'location',
      preset_key: 'location.apartment',
      name: '公寓',
      icon: 'Building2',
      color: 'sky',
      created_at: '2026-07-29T00:00:00.000Z',
    }]);
    renderView();

    expect(await screen.findByRole('button', { name: '地图标记 北京家' })).toHaveAttribute(
      'data-location-icon',
      'Building2',
    );
  });

  it('shows geocoded asset points and filters their assets', async () => {
    const user = userEvent.setup();
    renderView();

    expect(await screen.findByRole('button', { name: '地图标记 北京家' })).toBeInTheDocument();
    expect(screen.getByText('地图内资产')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('资产状态'), 'borrowed');
    expect(screen.getByRole('button', { name: '地图标记 北京家' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('资产分类'), '衣物');
    expect(screen.queryByRole('button', { name: '地图标记 北京家' })).not.toBeInTheDocument();
  });

  it('shows assets for a selected map point', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByRole('button', { name: '地图标记 北京家' }));
    expect(screen.getByRole('complementary', { name: '北京家地图详情' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /相机/ })).toBeInTheDocument();
    expect(screen.getAllByText('¥5,800')).toHaveLength(EXPECTED_CURRENCY_OCCURRENCES);
  });

  it('assigns an unmapped location by clicking a coordinate', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByRole('button', { name: '地图标注' }));
    expect(screen.getByLabelText('真实地理资产地图')).toHaveAttribute('data-assignment', '杭州仓库');
    await user.click(screen.getByRole('button', { name: '选择地图坐标' }));

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith('hangzhou-home', {
        metadata: {
          location_tag: true,
          geo_location: {
            longitude: 120.1551,
            latitude: 30.2741,
            address: '浙江省杭州市',
          },
        },
      });
    });
  });

  it('assigns a location by entering exact coordinates', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByRole('button', { name: '地图标注' }));
    await user.type(screen.getByLabelText('经度'), '120.1551');
    await user.type(screen.getByLabelText('纬度'), '30.2741');
    await user.type(screen.getByLabelText('地址备注（可选）'), '杭州仓库');
    await user.click(screen.getByRole('button', { name: '保存坐标' }));

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith('hangzhou-home', expect.objectContaining({
        metadata: expect.objectContaining({
          geo_location: {
            longitude: 120.1551,
            latitude: 30.2741,
            address: '杭州仓库',
          },
        }),
      }));
    });
  });

  it('opens a grouped side panel for clustered map points', async () => {
    const user = userEvent.setup();
    renderView({
      items: [
        ...INVENTORY_FIXTURE,
        createItem({ id: 'shanghai-home', name: '上海家', type: 'container', metadata: SECOND_GEO_LOCATION }),
        createItem({ id: 'laptop', name: '笔记本', parent_id: 'shanghai-home', category: '数码', price: 9000 }),
      ],
    });

    await user.click(await screen.findByRole('button', { name: '聚合位置' }));
    expect(screen.getByRole('complementary', { name: '2个地图位置详情' })).toBeInTheDocument();
    expect(screen.getByText('2 个地图位置')).toBeInTheDocument();
    expect(screen.getByText('笔记本')).toBeInTheDocument();
  });

  it('keeps the selected point sidebar aligned with active filters', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByRole('button', { name: '地图标记 北京家' }));
    await user.selectOptions(screen.getByLabelText('资产状态'), 'borrowed');

    expect(screen.getByRole('button', { name: /相机/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /羽绒服/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('¥5,000')).toHaveLength(EXPECTED_CURRENCY_OCCURRENCES);
  });

  it('keeps map coordinate editing hidden for viewers', async () => {
    renderView({ canEdit: false });

    await screen.findByRole('button', { name: '地图标记 北京家' });
    expect(screen.queryByRole('button', { name: '地图标注' })).not.toBeInTheDocument();
    expect(screen.getByText('当前为只读权限，可查看已经标注的资产位置。')).toBeInTheDocument();
  });

  it('clears a selected point when the household changes', async () => {
    const user = userEvent.setup();
    const view = renderView();

    await user.click(await screen.findByRole('button', { name: '地图标记 北京家' }));
    expect(screen.getByRole('complementary', { name: '北京家地图详情' })).toBeInTheDocument();

    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AssetMapView
            householdId="household-2"
            canEdit
            items={INVENTORY_FIXTURE}
            onRequestCreateLocation={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByRole('complementary', { name: '北京家地图详情' })).not.toBeInTheDocument();
    });
  });
});
