import type { Order, ProfitStats, ChartData, TimeRange } from '../types';
import { costConfigStorage, filterOrdersByTimeRange } from '../storage/Database';

// 计算单笔订单利润
export function calculateOrderProfit(order: Order): number {
  const revenue = order.totalAmount;
  const cost = order.costPrice * order.quantity;
  const platformFee = order.platformFee;
  const shippingFee = order.shippingFee;
  const otherFees = order.otherFees;

  return revenue - cost - platformFee - shippingFee - otherFees;
}

// 计算订单利润（带成本配置）
export function calculateOrderProfitWithConfig(order: Order): Order {
  let costPrice = order.costPrice;
  let platformFee = order.platformFee;
  let shippingFee = order.shippingFee;
  let otherFees = order.otherFees;

  // 如果订单没有成本信息，尝试从成本配置中获取
  if (!costPrice || costPrice === 0) {
    const config = costConfigStorage.getByProductName(order.productName);
    if (config) {
      costPrice = config.costPrice;
      platformFee = order.totalAmount * (config.platformFeeRate / 100);
      shippingFee = config.shippingCost;
      otherFees = config.otherCosts;
    }
  }

  const profit = order.totalAmount
    - (costPrice * order.quantity)
    - platformFee
    - shippingFee
    - otherFees;

  return {
    ...order,
    costPrice,
    platformFee,
    shippingFee,
    otherFees,
    profit,
  };
}

// 计算利润统计数据
export function calculateProfitStats(orders: Order[], range: TimeRange = 'all'): ProfitStats {
  const filteredOrders = filterOrdersByTimeRange(orders, range);

  // 排除已取消订单（未付款已取消）
  const validOrders = filteredOrders.filter(o => o.orderStatus !== '已取消');

  // 先应用成本配置计算利润
  const ordersWithProfit = validOrders.map(calculateOrderProfitWithConfig);

  const totalRevenue = ordersWithProfit.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCost = ordersWithProfit.reduce((sum, o) =>
    sum + (o.costPrice * o.quantity) + o.platformFee + o.shippingFee + o.otherFees, 0);
  const totalProfit = ordersWithProfit.reduce((sum, o) => sum + (o.profit || 0), 0);
  const orderCount = ordersWithProfit.length;

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    profitRate: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    orderCount,
    avgProfit: orderCount > 0 ? totalProfit / orderCount : 0,
  };
}

// 生成图表数据
export function generateChartData(orders: Order[], range: TimeRange = 'month'): ChartData[] {
  const filteredOrders = filterOrdersByTimeRange(orders, range);
  // 排除已取消订单
  const validOrders = filteredOrders.filter(o => o.orderStatus !== '已取消');
  const ordersWithProfit = validOrders.map(calculateOrderProfitWithConfig);

  // 按日期分组
  const grouped: Record<string, { revenue: number; profit: number; orders: number }> = {};

  ordersWithProfit.forEach(order => {
    const date = order.orderDate;
    if (!grouped[date]) {
      grouped[date] = { revenue: 0, profit: 0, orders: 0 };
    }
    grouped[date].revenue += order.totalAmount;
    grouped[date].profit += order.profit || 0;
    grouped[date].orders += 1;
  });

  // 转换为数组并排序
  const chartData: ChartData[] = Object.entries(grouped)
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      profit: data.profit,
      orders: data.orders,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 如果数据太多，按时间范围聚合
  if (range === 'year' && chartData.length > 12) {
    return aggregateByMonth(chartData);
  } else if (range === 'month' && chartData.length > 31) {
    return aggregateByDay(chartData);
  }

  return chartData;
}

// 按月聚合
function aggregateByMonth(data: ChartData[]): ChartData[] {
  const grouped: Record<string, ChartData> = {};

  data.forEach(item => {
    const month = item.date.substring(0, 7); // YYYY-MM
    if (!grouped[month]) {
      grouped[month] = { date: month, revenue: 0, profit: 0, orders: 0 };
    }
    grouped[month].revenue += item.revenue;
    grouped[month].profit += item.profit;
    grouped[month].orders += item.orders;
  });

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

// 按天聚合（周视图）
function aggregateByDay(data: ChartData[]): ChartData[] {
  // 最近7天
  const last7Days: ChartData[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const existing = data.find(d => d.date === dateStr);
    last7Days.push(existing || { date: dateStr, revenue: 0, profit: 0, orders: 0 });
  }

  return last7Days;
}

// 获取热销商品排行
export function getTopProducts(orders: Order[], limit: number = 10): { name: string; quantity: number; revenue: number }[] {
  const grouped: Record<string, { quantity: number; revenue: number }> = {};

  // 排除已取消订单
  const validOrders = orders.filter(o => o.orderStatus !== '已取消');

  validOrders.forEach(order => {
    if (!grouped[order.productName]) {
      grouped[order.productName] = { quantity: 0, revenue: 0 };
    }
    grouped[order.productName].quantity += order.quantity;
    grouped[order.productName].revenue += order.totalAmount;
  });

  return Object.entries(grouped)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
