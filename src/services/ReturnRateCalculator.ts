import type { Order, TimeRange } from '../types';
import { filterOrdersByTimeRange } from '../storage/Database';
import { calculateOrderProfitWithConfig } from './ProfitCalculator';

// 退货率统计数据
export interface ReturnRateStats {
  totalOrders: number;
  normalOrders: number;
  cancelledBeforeShip: number;
  cancelledInTransit: number;
  returned: number;
  totalCancelled: number;
  returnRate: number;
  cancelBeforeShipRate: number;
  cancelInTransitRate: number;
  returnOrderRate: number;
  normalOrderRate: number;
  returnedRate: number;
  normalOrdersAmount: number;
  returnedAmount: number;
  cancelledBeforeShipAmount: number;
  cancelledInTransitAmount: number;
}

// 计算退货率统计
export function calculateReturnRateStats(orders: Order[], range: TimeRange = 'all'): ReturnRateStats {
  const filteredOrders = filterOrdersByTimeRange(orders, range);

  // 总订单数（排除已取消订单）
  const totalOrders = filteredOrders.filter(o => o.orderStatus !== '已取消').length;

  // 使用 order.orderStatus 字段（Excel原始值）
  // 未发货退款
  const normalOrdersData = filteredOrders.filter(o => o.orderStatus === '未发货，退款成功');
  const normalOrders = normalOrdersData.length;
  const normalOrdersAmount = normalOrdersData.reduce((sum, o) => sum + o.totalAmount, 0);
  // 已发货退款
  const returnedData = filteredOrders.filter(o => o.orderStatus === '已发货，退款成功');
  const returned = returnedData.length;
  const returnedAmount = returnedData.reduce((sum, o) => sum + o.totalAmount, 0);
  // 已收货退款
  const cancelledBeforeShipData = filteredOrders.filter(o => o.orderStatus === '已收货，退款成功');
  const cancelledBeforeShip = cancelledBeforeShipData.length;
  const cancelledBeforeShipAmount = cancelledBeforeShipData.reduce((sum, o) => sum + o.totalAmount, 0);
  // 未付款已取消
  const cancelledInTransitData = filteredOrders.filter(o => o.orderStatus === '已取消');
  const cancelledInTransit = cancelledInTransitData.length;
  const cancelledInTransitAmount = cancelledInTransitData.reduce((sum, o) => sum + o.totalAmount, 0);

  // 总退货率 = 退款类型订单数（不含已取消）/ 总订单数
  const totalCancelled = normalOrders + returned + cancelledBeforeShip;

  return {
    totalOrders,
    normalOrders,
    cancelledBeforeShip,
    cancelledInTransit,
    returned,
    totalCancelled,
    returnRate: totalOrders > 0 ? (totalCancelled / totalOrders) * 100 : 0,
    cancelBeforeShipRate: totalOrders > 0 ? (cancelledBeforeShip / totalOrders) * 100 : 0,
    cancelInTransitRate: totalOrders > 0 ? (cancelledInTransit / totalOrders) * 100 : 0,
    returnOrderRate: totalOrders > 0 ? (totalCancelled / totalOrders) * 100 : 0,
    normalOrderRate: totalOrders > 0 ? (normalOrders / totalOrders) * 100 : 0,
    returnedRate: totalOrders > 0 ? (returned / totalOrders) * 100 : 0,
    normalOrdersAmount,
    returnedAmount,
    cancelledBeforeShipAmount,
    cancelledInTransitAmount,
  };
}

// 获取按状态分组的订单
export function getOrdersByStatus(orders: Order[], range: TimeRange = 'all'): Record<string, Order[]> {
  const filteredOrders = filterOrdersByTimeRange(orders, range);

  return {
    '未发货': filteredOrders.filter(o => o.orderStatus === '未发货'),
    '已取消': filteredOrders.filter(o => o.orderStatus === '已取消'),
    '已收货': filteredOrders.filter(o => o.orderStatus === '已收货'),
    '退款成功': filteredOrders.filter(o =>
      o.orderStatus === '退款成功' ||
      o.orderStatus === '已发货，退款成功' ||
      o.orderStatus === '已收货，退款成功'
    ),
  };
}

// 退货率趋势数据
export interface ReturnRateTrendData {
  date: string;
  totalOrders: number;
  cancelled: number;
  returnRate: number;
}

// 生成退货率趋势数据
export function generateReturnRateTrend(orders: Order[], range: TimeRange = 'month'): ReturnRateTrendData[] {
  const filteredOrders = filterOrdersByTimeRange(orders, range);

  // 按日期分组
  const grouped: Record<string, { total: number; cancelled: number }> = {};

  filteredOrders.forEach(order => {
    const date = order.orderDate;
    if (!grouped[date]) {
      grouped[date] = { total: 0, cancelled: 0 };
    }
    grouped[date].total += 1;
    // 退款成功算作退货
    if (order.orderStatus === '退款成功' ||
        order.orderStatus === '已发货，退款成功' ||
        order.orderStatus === '已收货，退款成功') {
      grouped[date].cancelled += 1;
    }
  });

  // 转换为数组并排序
  const trendData: ReturnRateTrendData[] = Object.entries(grouped)
    .map(([date, data]) => ({
      date,
      totalOrders: data.total,
      cancelled: data.cancelled,
      returnRate: data.total > 0 ? (data.cancelled / data.total) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return trendData;
}

// 计算货损成本（已发货退款、已收货退款的成本）
export function calculateGoodsLossCost(orders: Order[], range: TimeRange = 'all'): number {
  const filteredOrders = filterOrdersByTimeRange(orders, range);

  return filteredOrders
    .filter(o =>
      o.orderStatus === '已发货，退款成功' ||
      o.orderStatus === '已收货，退款成功'
    )
    .reduce((sum, order) => {
      const orderWithCost = calculateOrderProfitWithConfig(order);
      const cost = (orderWithCost.costPrice || 0) * (order.quantity || 0) + (orderWithCost.platformFee || 0) + (orderWithCost.shippingFee || 0) + (orderWithCost.otherFees || 0);
      return sum + cost;
    }, 0);
}

// 计算因退货导致的损失金额
export function calculateReturnLoss(orders: Order[], range: TimeRange = 'all'): number {
  const filteredOrders = filterOrdersByTimeRange(orders, range);

  return filteredOrders
    .filter(o =>
      o.orderStatus === '未发货，退款成功' ||
      o.orderStatus === '已发货，退款成功' ||
      o.orderStatus === '已收货，退款成功'
    )
    .reduce((sum, order) => sum + order.totalAmount, 0);
}
