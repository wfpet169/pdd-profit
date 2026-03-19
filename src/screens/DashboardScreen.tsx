import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Percent, ArrowUp, ArrowDown, RotateCcw, PackageX, Truck } from 'lucide-react';
import { orderStorage } from '../storage/Database';
import { calculateProfitStats, generateChartData, getTopProducts } from '../services/ProfitCalculator';
import { calculateReturnRateStats, calculateReturnLoss, type ReturnRateStats } from '../services/ReturnRateCalculator';
import type { TimeRange } from '../types';

const DashboardScreen: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [stats, setStats] = useState({ totalRevenue: 0, totalCost: 0, totalProfit: 0, profitRate: 0, orderCount: 0, avgProfit: 0 });
  const [returnStats, setReturnStats] = useState<ReturnRateStats>({
    totalOrders: 0, normalOrders: 0, cancelledBeforeShip: 0, cancelledInTransit: 0,
    returned: 0, totalCancelled: 0, returnRate: 0, cancelBeforeShipRate: 0,
    cancelInTransitRate: 0, returnOrderRate: 0, normalOrderRate: 0, returnedRate: 0
  });
  const [returnLoss, setReturnLoss] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([]);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = () => {
    const allOrders = orderStorage.getAll();

    const profitStats = calculateProfitStats(allOrders, timeRange);
    setStats(profitStats);

    const returnRate = calculateReturnRateStats(allOrders, timeRange);
    setReturnStats(returnRate);

    const loss = calculateReturnLoss(allOrders, timeRange);
    setReturnLoss(loss);

    const chart = generateChartData(allOrders, timeRange);
    setChartData(chart);

    const top = getTopProducts(allOrders);
    setTopProducts(top);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
  };

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: 'today', label: '今日' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'year', label: '本年' },
    { value: 'all', label: '全部' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>利润概览</h1>
        <div style={styles.timeRangeSelector}>
          {timeRanges.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              style={{
                ...styles.timeRangeBtn,
                ...(timeRange === range.value ? styles.timeRangeBtnActive : {}),
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <DollarSign size={24} color="#10b981" />
          </div>
          <div style={styles.statContent}>
            <span style={styles.statLabel}>总收入（不含已取消订单）</span>
            <span style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <ShoppingCart size={24} color="#3b82f6" />
          </div>
          <div style={styles.statContent}>
            <span style={styles.statLabel}>订单数量（不含已取消订单）</span>
            <span style={styles.statValue}>{stats.orderCount}</span>
          </div>
        </div>

        <div style={{ ...styles.statCard, ...(stats.totalProfit >= 0 ? styles.profitCard : styles.lossCard) }}>
          <div style={styles.statIcon}>
            {stats.totalProfit >= 0 ? <TrendingUp size={24} color="#10b981" /> : <TrendingDown size={24} color="#ef4444" />}
          </div>
          <div style={styles.statContent}>
            <span style={styles.statLabel}>总利润</span>
            <span style={{ ...styles.statValue, color: stats.totalProfit >= 0 ? '#10b981' : '#ef4444' }}>
              {formatCurrency(stats.totalProfit)}
            </span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Percent size={24} color="#8b5cf6" />
          </div>
          <div style={styles.statContent}>
            <span style={styles.statLabel}>利润率</span>
            <span style={styles.statValue}>{stats.profitRate.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* 退货率统计 */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>退货率分析</h2>
      </div>
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, ...styles.returnCard }}>
          <div style={styles.statIcon}>
            <RotateCcw size={24} color="#f59e0b" />
          </div>
          <div style={styles.statContent}>
            <span style={{...styles.statLabel, fontSize: 12}}>总退货率（不含未付款取消）</span>
            <span style={{ ...styles.statValue, color: '#f59e0b' }}>{returnStats.returnRate.toFixed(2)}%</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <PackageX size={24} color="#6b7280" />
          </div>
          <div style={styles.statContent}>
            <span style={{...styles.statLabel, fontSize: 12}}>未发货退款</span>
            <span style={styles.statValue}>{returnStats.normalOrders} ({returnStats.normalOrderRate.toFixed(2)}%)</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <PackageX size={24} color="#ef4444" />
          </div>
          <div style={styles.statContent}>
            <span style={{...styles.statLabel, fontSize: 12}}>已发货退款</span>
            <span style={styles.statValue}>{returnStats.returned} ({returnStats.returnedRate.toFixed(2)}%)</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Truck size={24} color="#f97316" />
          </div>
          <div style={styles.statContent}>
            <span style={{...styles.statLabel, fontSize: 12}}>已收货退款</span>
            <span style={styles.statValue}>{returnStats.cancelledBeforeShip} ({returnStats.cancelBeforeShipRate.toFixed(2)}%)</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <RotateCcw size={24} color="#dc2626" />
          </div>
          <div style={styles.statContent}>
            <span style={{...styles.statLabel, fontSize: 12}}>未付款已取消</span>
            <span style={styles.statValue}>{returnStats.cancelledInTransit}</span>
          </div>
        </div>
      </div>

      {/* 退货损失 */}
      <div style={styles.returnLossCard}>
        <span style={styles.lossLabel}>退款总金额（不含已取消订单）</span>
        <span style={styles.lossValue}>{formatCurrency(returnLoss)}</span>
      </div>

      {/* 图表区域 */}
      <div style={styles.chartSection}>
        <h2 style={styles.sectionTitle}>利润趋势</h2>
        <div style={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value) || 0)}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="利润" />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="收入" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 热销商品 */}
      <div style={styles.chartSection}>
        <h2 style={styles.sectionTitle}>热销商品TOP10</h2>
        <div style={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
              <Bar dataKey="revenue" fill="#3b82f6" name="销售额" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 平均订单利润 */}
      <div style={styles.avgProfitCard}>
        <span style={styles.avgProfitLabel}>平均每单利润</span>
        <span style={styles.avgProfitValue}>{formatCurrency(stats.avgProfit)}</span>
        {stats.avgProfit >= 0 ? (
          <ArrowUp size={20} color="#10b981" />
        ) : (
          <ArrowDown size={20} color="#ef4444" />
        )}
      </div>

      {/* 版权信息 */}
      <div style={styles.copyright}>
        © 2024-2026 wfpet169. All rights reserved.
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: 1400,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1f2937',
    margin: 0,
  },
  timeRangeSelector: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  timeRangeBtn: {
    padding: '8px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    color: '#6b7280',
    transition: 'all 0.2s',
  },
  timeRangeBtnActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  profitCard: {
    borderLeft: '4px solid #10b981',
  },
  lossCard: {
    borderLeft: '4px solid #ef4444',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1f2937',
  },
  chartSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: 16,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  chartContainer: {
    width: '100%',
  },
  returnCard: {
    borderLeft: '4px solid #f59e0b',
  },
  returnLossCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderLeft: '4px solid #ef4444',
  },
  lossLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  lossValue: {
    fontSize: 20,
    fontWeight: 700,
    color: '#ef4444',
  },
  avgProfitCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  avgProfitLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  avgProfitValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1f2937',
  },
  copyright: {
    textAlign: 'center',
    marginTop: 32,
    padding: 16,
    color: '#9ca3af',
    fontSize: 12,
  },
};

export default DashboardScreen;
