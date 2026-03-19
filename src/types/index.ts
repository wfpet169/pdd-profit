// 订单状态类型（直接使用原始值）
export type OrderStatus = string;

// 订单数据类型
export interface Order {
  id: string;
  orderNo: string;          // 订单号
  productName: string;      // 商品名称
  quantity: number;         // 数量
  unitPrice: number;        // 单价
  totalAmount: number;      // 总金额
  shippingFee: number;      // 运费
  platformFee: number;     // 平台服务费
  costPrice: number;       // 成本价
  otherFees: number;       // 其他费用
  orderDate: string;       // 订单日期
  status: OrderStatus;     // 售后状态
  orderStatus: string;     // 订单状态（Excel中的原始值）
  profit?: number;         // 利润（计算得出）
}

// 成本配置
export interface CostConfig {
  id: string;
  productName: string;
  costPrice: number;
  platformFeeRate: number; // 平台费率(%)
  shippingCost: number;     // 快递成本
  otherCosts: number;      // 其他成本
}

// 利润统计数据
export interface ProfitStats {
  totalRevenue: number;    // 总收入
  totalCost: number;       // 总成本
  totalProfit: number;     // 总利润
  profitRate: number;      // 利润率
  orderCount: number;      // 订单数
  avgProfit: number;       // 平均利润
}

// 时间段筛选
export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

// 图表数据类型
export interface ChartData {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}
