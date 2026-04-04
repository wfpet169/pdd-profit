import type { Order, CostConfig, TimeRange } from '../types';

const STORAGE_KEYS = {
  ORDERS: 'pdd_orders',
  COST_CONFIG: 'pdd_cost_config',
};

// 订单存储
export const orderStorage = {
  getAll(): Order[] {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return data ? JSON.parse(data) : [];
  },

  save(orders: Order[]): void {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  },

  add(order: Order): void {
    const orders = this.getAll();
    orders.push(order);
    this.save(orders);
  },

  addMany(newOrders: Order[]): void {
    const orders = this.getAll();
    const merged = [...orders, ...newOrders];
    this.save(merged);
  },

  delete(id: string): void {
    const orders = this.getAll().filter(o => o.id !== id);
    this.save(orders);
  },

  deleteMany(ids: string[]): void {
    const orders = this.getAll().filter(o => !ids.includes(o.id));
    this.save(orders);
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
  },
};

// 成本配置存储
export const costConfigStorage = {
  getAll(): CostConfig[] {
    const data = localStorage.getItem(STORAGE_KEYS.COST_CONFIG);
    return data ? JSON.parse(data) : [];
  },

  save(configs: CostConfig[]): void {
    localStorage.setItem(STORAGE_KEYS.COST_CONFIG, JSON.stringify(configs));
  },

  add(config: CostConfig): void {
    const configs = this.getAll();
    configs.push(config);
    this.save(configs);
  },

  update(config: CostConfig): void {
    const configs = this.getAll();
    const index = configs.findIndex(c => c.id === config.id);
    if (index !== -1) {
      configs[index] = config;
      this.save(configs);
    }
  },

  delete(id: string): void {
    const configs = this.getAll().filter(c => c.id !== id);
    this.save(configs);
  },

  deleteMany(ids: string[]): void {
    const configs = this.getAll().filter(c => !ids.includes(c.id));
    this.save(configs);
  },

  batchUpdate(updates: { id: string; updates: Partial<CostConfig> }[]): void {
    const configs = this.getAll();
    updates.forEach(({ id, updates }) => {
      const index = configs.findIndex(c => c.id === id);
      if (index >= 0) {
        configs[index] = { ...configs[index], ...updates };
      }
    });
    this.save(configs);
  },

  getByProductName(productName: string): CostConfig | undefined {
    return this.getAll().find(c => c.productName === productName);
  },
};

// 筛选订单
export function filterOrdersByTimeRange(orders: Order[], range: TimeRange): Order[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return orders.filter(order => {
    // 空日期的订单不过滤时间（用于统计未付款已取消等无日期订单）
    if (!order.orderDate) {
      return true;
    }

    const orderDate = new Date(order.orderDate);

    switch (range) {
      case 'today':
        return orderDate >= today;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return orderDate >= monthAgo;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return orderDate >= yearAgo;
      default:
        return true;
    }
  });
}
