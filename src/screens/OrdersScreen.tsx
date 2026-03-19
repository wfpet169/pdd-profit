import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Trash2, Download, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Filter } from 'lucide-react';
import { orderStorage } from '../storage/Database';
import { calculateOrderProfitWithConfig } from '../services/ProfitCalculator';
import { exportToExcel } from '../services/DataImporter';
import type { Order, TimeRange } from '../types';

// 排序字段类型
type SortField = 'quantity' | 'totalAmount' | 'cost' | 'profit' | 'profitMargin' | 'orderDate';
type SortOrder = 'asc' | 'desc';

const OrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(20);

  // 排序状态
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 订单状态筛选
  const [selectedOrderStatuses, setSelectedOrderStatuses] = useState<string[]>([]);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const statusFilterRef = useRef<HTMLDivElement>(null);

  // 通用列筛选状态
  type FilterColumn = 'orderNo' | 'productName' | 'quantity' | 'amount' | 'cost' | 'profit' | 'profitMargin' | 'date' | 'orderStatus';
  const [showFilterForColumn, setShowFilterForColumn] = useState<FilterColumn | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // 文本筛选 - 改为多选数组
  const [selectedOrderNos, setSelectedOrderNos] = useState<string[]>([]);
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<number[]>([]);
  const [selectedAmounts, setSelectedAmounts] = useState<number[]>([]);
  const [selectedCosts, setSelectedCosts] = useState<number[]>([]);
  const [selectedProfits, setSelectedProfits] = useState<number[]>([]);
  const [selectedProfitMargins, setSelectedProfitMargins] = useState<number[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // 批量删除状态
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // 计算联动后的基础筛选数据（排除当前打开的下拉自身条件）
  const getBaseFilteredData = useMemo(() => {
    return orders.filter(order => {
      // 订单状态筛选
      if (selectedOrderStatuses.length > 0 && (!order.orderStatus || !selectedOrderStatuses.includes(order.orderStatus))) {
        return false;
      }
      // 订单号筛选（排除自身）
      if (selectedOrderNos.length > 0 && !selectedOrderNos.includes(order.orderNo)) {
        return false;
      }
      // 商品规格筛选（排除自身）
      if (selectedProductNames.length > 0 && !selectedProductNames.includes(order.productName)) {
        return false;
      }
      // 数量筛选（排除自身）
      if (selectedQuantities.length > 0 && !selectedQuantities.includes(order.quantity)) {
        return false;
      }
      // 金额筛选（排除自身）
      if (selectedAmounts.length > 0 && !selectedAmounts.includes(order.totalAmount)) {
        return false;
      }
      // 日期筛选（排除自身）
      if (selectedDates.length > 0 && !selectedDates.includes(order.orderDate)) {
        return false;
      }
      return true;
    });
  }, [orders, selectedOrderStatuses, selectedOrderNos, selectedProductNames, selectedQuantities, selectedAmounts, selectedDates]);

  // 成本筛选（排除自身）
  const baseFilteredCosts = useMemo(() => {
    return getBaseFilteredData.filter(order => {
      if (selectedCosts.length > 0) {
        const cost = Math.round(((order.costPrice || 0) * (order.quantity || 0) + (order.platformFee || 0) + (order.shippingFee || 0) + (order.otherFees || 0)) * 100) / 100;
        if (!selectedCosts.includes(cost)) return false;
      }
      return true;
    }).map(calculateOrderProfitWithConfig);
  }, [getBaseFilteredData, selectedCosts]);

  // 利润筛选（排除自身）
  const baseFilteredProfits = useMemo(() => {
    return getBaseFilteredData.filter(order => {
      if (selectedProfits.length > 0) {
        const orderWithProfit = calculateOrderProfitWithConfig(order);
        const profit = Math.round((orderWithProfit.profit || 0) * 100) / 100;
        if (!selectedProfits.includes(profit)) return false;
      }
      return true;
    }).map(calculateOrderProfitWithConfig);
  }, [getBaseFilteredData, selectedProfits]);

  // 毛利率筛选（排除自身）
  const baseFilteredMargins = useMemo(() => {
    return getBaseFilteredData.filter(order => {
      if (selectedProfitMargins.length > 0) {
        const orderWithProfit = calculateOrderProfitWithConfig(order);
        const margin = orderWithProfit.totalAmount > 0
          ? Math.round(((orderWithProfit.profit || 0) / orderWithProfit.totalAmount * 100) * 100) / 100
          : 0;
        if (!selectedProfitMargins.includes(margin)) return false;
      }
      return true;
    }).map(calculateOrderProfitWithConfig);
  }, [getBaseFilteredData, selectedProfitMargins]);

  // 获取所有唯一的订单状态及数量（联动）
  const statusCounts = useMemo(() => {
    return getBaseFilteredData.reduce((acc, order) => {
      if (order.orderStatus) {
        acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [getBaseFilteredData]);
  const uniqueOrderStatuses = Object.keys(statusCounts).sort();

  // 获取订单号唯一值（联动）
  const orderNoCounts = useMemo(() => {
    return getBaseFilteredData.reduce((acc, order) => {
      acc[order.orderNo] = (acc[order.orderNo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [getBaseFilteredData]);
  const uniqueOrderNos = Object.keys(orderNoCounts).sort();

  // 获取商品规格唯一值（联动）
  const productNameCounts = useMemo(() => {
    return getBaseFilteredData.reduce((acc, order) => {
      acc[order.productName] = (acc[order.productName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [getBaseFilteredData]);
  const uniqueProductNames = Object.keys(productNameCounts).sort();

  // 获取数量唯一值（联动）
  const quantityCounts = useMemo(() => {
    return getBaseFilteredData.reduce((acc, order) => {
      acc[order.quantity] = (acc[order.quantity] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }, [getBaseFilteredData]);
  const uniqueQuantities = Object.keys(quantityCounts).map(Number).sort((a, b) => a - b);

  // 获取金额唯一值（联动）
  const amountCounts = useMemo(() => {
    return getBaseFilteredData.reduce((acc, order) => {
      acc[order.totalAmount] = (acc[order.totalAmount] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }, [getBaseFilteredData]);
  const uniqueAmounts = Object.keys(amountCounts).map(Number).sort((a, b) => a - b);

  // 获取成本唯一值（联动）
  const costCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    baseFilteredCosts.forEach(order => {
      const cost = Math.round(((order.costPrice || 0) * (order.quantity || 0) + (order.platformFee || 0) + (order.shippingFee || 0) + (order.otherFees || 0)) * 100) / 100;
      if (!isNaN(cost)) {
        counts[cost] = (counts[cost] || 0) + 1;
      }
    });
    return counts;
  }, [baseFilteredCosts]);
  const uniqueCosts = Object.keys(costCounts).map(Number).sort((a, b) => a - b);

  // 获取利润唯一值（联动）
  const profitCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    baseFilteredProfits.forEach(order => {
      const profit = Math.round((order.profit || 0) * 100) / 100;
      counts[profit] = (counts[profit] || 0) + 1;
    });
    return counts;
  }, [baseFilteredProfits]);
  const uniqueProfits = Object.keys(profitCounts).map(Number).sort((a, b) => a - b);

  // 获取毛利率唯一值（联动）
  const profitMarginCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    baseFilteredMargins.forEach(order => {
      const margin = order.totalAmount > 0
        ? Math.round(((order.profit || 0) / order.totalAmount * 100) * 100) / 100
        : 0;
      counts[margin] = (counts[margin] || 0) + 1;
    });
    return counts;
  }, [baseFilteredMargins]);
  const uniqueProfitMargins = Object.keys(profitMarginCounts).map(Number).sort((a, b) => a - b);

  // 获取日期唯一值（联动）
  const dateCounts = useMemo(() => {
    return getBaseFilteredData.reduce((acc, order) => {
      acc[order.orderDate] = (acc[order.orderDate] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [getBaseFilteredData]);
  const uniqueDates = Object.keys(dateCounts).sort();

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, timeRange, sortField, sortOrder, selectedOrderStatuses, selectedOrderNos, selectedProductNames, selectedQuantities, selectedAmounts, selectedCosts, selectedProfits, selectedProfitMargins, selectedDates, showFilterForColumn]);

  // 点击外部关闭筛选下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterForColumn(null);
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setShowStatusFilter(false);
      }
    };
    if (showFilterForColumn || showStatusFilter) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showFilterForColumn, showStatusFilter]);

  const loadOrders = () => {
    const allOrders = orderStorage.getAll();
    setOrders(allOrders);
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // 先计算利润，确保 profit 字段有值
    filtered = filtered.map(calculateOrderProfitWithConfig);

    // 订单状态筛选
    if (selectedOrderStatuses.length > 0) {
      filtered = filtered.filter(order =>
        order.orderStatus && selectedOrderStatuses.includes(order.orderStatus)
      );
    }

    // 订单号筛选（多选）
    if (selectedOrderNos.length > 0) {
      filtered = filtered.filter(order => selectedOrderNos.includes(order.orderNo));
    }

    // 商品规格筛选（多选）
    if (selectedProductNames.length > 0) {
      filtered = filtered.filter(order => selectedProductNames.includes(order.productName));
    }

    // 数量筛选（多选）
    if (selectedQuantities.length > 0) {
      filtered = filtered.filter(order => selectedQuantities.includes(order.quantity));
    }

    // 金额筛选（多选）
    if (selectedAmounts.length > 0) {
      filtered = filtered.filter(order => selectedAmounts.includes(order.totalAmount));
    }

    // 成本筛选（多选）
    if (selectedCosts.length > 0) {
      filtered = filtered.filter(order => {
        const cost = Math.round(((order.costPrice || 0) * (order.quantity || 0) + (order.platformFee || 0) + (order.shippingFee || 0) + (order.otherFees || 0)) * 100) / 100;
        return !isNaN(cost) && selectedCosts.includes(cost);
      });
    }

    // 利润筛选（多选）
    if (selectedProfits.length > 0) {
      filtered = filtered.filter(order => {
        const profit = Math.round((order.profit || 0) * 100) / 100;
        return selectedProfits.includes(profit);
      });
    }

    // 毛利率筛选（多选）
    if (selectedProfitMargins.length > 0) {
      filtered = filtered.filter(order => {
        const margin = order.totalAmount > 0
          ? Math.round(((order.profit || 0) / order.totalAmount * 100) * 100) / 100
          : 0;
        return selectedProfitMargins.includes(margin);
      });
    }

    // 日期筛选（多选）
    if (selectedDates.length > 0) {
      filtered = filtered.filter(order => selectedDates.includes(order.orderDate));
    }

    // 时间筛选
    if (timeRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        switch (timeRange) {
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

    // 搜索筛选
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNo.toLowerCase().includes(term) ||
        order.productName.toLowerCase().includes(term)
      );
    }

    // 排序
    if (sortField) {
      filtered.sort((a, b) => {
        let aVal: number, bVal: number;
        switch (sortField) {
          case 'quantity':
            aVal = a.quantity;
            bVal = b.quantity;
            break;
          case 'totalAmount':
            aVal = a.totalAmount;
            bVal = b.totalAmount;
            break;
          case 'cost':
            aVal = a.costPrice * a.quantity + a.platformFee + a.shippingFee + a.otherFees;
            bVal = b.costPrice * b.quantity + b.platformFee + b.shippingFee + b.otherFees;
            break;
          case 'profit':
            aVal = a.profit || 0;
            bVal = b.profit || 0;
            break;
          case 'profitMargin':
            aVal = a.totalAmount > 0 ? ((a.profit || 0) / a.totalAmount * 100) : 0;
            bVal = b.totalAmount > 0 ? ((b.profit || 0) / b.totalAmount * 100) : 0;
            break;
          case 'orderDate':
            return sortOrder === 'asc'
              ? new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()
              : new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
          default:
            return 0;
        }
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    } else {
      // 默认按日期降序
      filtered.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  // 处理排序点击
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleDelete = (id: string) => {
    orderStorage.delete(id);
    loadOrders();
    setShowDeleteConfirm(null);
  };

  // 批量删除
  const handleBatchDelete = () => {
    orderStorage.deleteMany(selectedOrderIds);
    loadOrders();
    setSelectedOrderIds([]);
    setShowBatchDeleteConfirm(false);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  // 单选/取消单选
  const handleSelectOne = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter(i => i !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const handleExport = () => {
    exportToExcel(filteredOrders);
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有订单数据吗？此操作不可恢复。')) {
      orderStorage.clear();
      loadOrders();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
  };

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const timeRanges = [
    { value: 'all', label: '全部' },
    { value: 'today', label: '今日' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'year', label: '本年' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>订单列表</h1>
        <div style={styles.headerActions}>
          {selectedOrderIds.length > 0 && (
            <button onClick={() => setShowBatchDeleteConfirm(true)} style={{...styles.exportBtn, backgroundColor: '#ef4444'}}>
              <Trash2 size={18} />
              批量删除 ({selectedOrderIds.length})
            </button>
          )}
          <button onClick={handleExport} style={styles.exportBtn}>
            <Download size={18} />
            导出Excel
          </button>
          <button onClick={handleClearAll} style={styles.clearBtn}>
            <Trash2 size={18} />
            清空数据
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={20} color="#9ca3af" />
          <input
            type="text"
            placeholder="搜索订单号或产品规格..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.timeFilter}>
          {timeRanges.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value as TimeRange)}
              style={{
                ...styles.filterBtn,
                ...(timeRange === range.value ? styles.filterBtnActive : {}),
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* 统计信息 */}
      <div style={styles.statsInfo}>
        <span>共 {filteredOrders.length} 条订单</span>
      </div>

      {/* 订单表格 */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: 40}}>
                <input
                  type="checkbox"
                  checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th style={styles.th}>
                订单号
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'orderNo' ? null : 'orderNo'); }}
                  style={{...styles.filterIconBtn, color: selectedOrderNos.length > 0 ? '#3b82f6' : '#9ca3af'}}
                >
                  <Filter size={14} />
                </button>
                {showFilterForColumn === 'orderNo' && uniqueOrderNos.length > 0 && (
                  <div style={styles.statusFilterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.statusFilterHeader}>
                      <span>选择订单号</span>
                      {selectedOrderNos.length > 0 && (
                        <button onClick={() => setSelectedOrderNos([])} style={styles.clearStatusFilter}>清除</button>
                      )}
                    </div>
                    <div style={styles.filterScrollList}>
                      {uniqueOrderNos.slice(0, 50).map(no => (
                        <label key={no} style={styles.statusFilterItem}>
                          <input
                            type="checkbox"
                            checked={selectedOrderNos.includes(no)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderNos([...selectedOrderNos, no]);
                              } else {
                                setSelectedOrderNos(selectedOrderNos.filter(s => s !== no));
                              }
                            }}
                          />
                          <span>{no}（{orderNoCounts[no]}个）</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </th>
              <th style={styles.th}>
                商品规格
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'productName' ? null : 'productName'); }}
                  style={{...styles.filterIconBtn, color: selectedProductNames.length > 0 ? '#3b82f6' : '#9ca3af'}}
                >
                  <Filter size={14} />
                </button>
                {showFilterForColumn === 'productName' && uniqueProductNames.length > 0 && (
                  <div style={styles.statusFilterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.statusFilterHeader}>
                      <span>选择商品规格</span>
                      {selectedProductNames.length > 0 && (
                        <button onClick={() => setSelectedProductNames([])} style={styles.clearStatusFilter}>清除</button>
                      )}
                    </div>
                    <div style={styles.filterScrollList}>
                      {uniqueProductNames.slice(0, 50).map(name => (
                        <label key={name} style={styles.statusFilterItem}>
                          <input
                            type="checkbox"
                            checked={selectedProductNames.includes(name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductNames([...selectedProductNames, name]);
                              } else {
                                setSelectedProductNames(selectedProductNames.filter(s => s !== name));
                              }
                            }}
                          />
                          <span>{name}（{productNameCounts[name]}个）</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </th>
              <th style={{...styles.th, ...styles.sortableHeader}} onClick={() => handleSort('quantity')}>
                商品数量(件)
                {sortField === 'quantity' && (
                  <span style={{marginLeft: 4}}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'quantity' ? null : 'quantity'); }}
                  style={{...styles.filterIconBtn, color: selectedQuantities.length > 0 ? '#3b82f6' : '#9ca3af'}}
                >
                  <Filter size={14} />
                </button>
                {showFilterForColumn === 'quantity' && uniqueQuantities.length > 0 && (
                  <div style={styles.statusFilterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.statusFilterHeader}>
                      <span>选择数量</span>
                      {selectedQuantities.length > 0 && (
                        <button onClick={() => setSelectedQuantities([])} style={styles.clearStatusFilter}>清除</button>
                      )}
                    </div>
                    <div style={styles.filterScrollList}>
                      {uniqueQuantities.slice(0, 50).map(q => (
                        <label key={q} style={styles.statusFilterItem}>
                          <input
                            type="checkbox"
                            checked={selectedQuantities.includes(q)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuantities([...selectedQuantities, q]);
                              } else {
                                setSelectedQuantities(selectedQuantities.filter(s => s !== q));
                              }
                            }}
                          />
                          <span>{q}（{quantityCounts[q]}个）</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </th>
              <th style={styles.th}>
                订单状态
                <button
                  onClick={(e) => { e.stopPropagation(); setShowStatusFilter(!showStatusFilter); }}
                  style={{...styles.filterIconBtn, color: selectedOrderStatuses.length > 0 ? '#3b82f6' : '#9ca3af'}}
                >
                  <Filter size={14} />
                </button>
                {showStatusFilter && uniqueOrderStatuses.length > 0 && (
                  <div style={styles.statusFilterDropdown} ref={statusFilterRef}>
                    <div style={styles.statusFilterHeader}>
                      <span>选择订单状态</span>
                      {selectedOrderStatuses.length > 0 && (
                        <button onClick={() => setSelectedOrderStatuses([])} style={styles.clearStatusFilter}>
                          清除
                        </button>
                      )}
                    </div>
                    {uniqueOrderStatuses.map(status => (
                      <label key={status} style={styles.statusFilterItem}>
                        <input
                          type="checkbox"
                          checked={selectedOrderStatuses.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderStatuses([...selectedOrderStatuses, status]);
                            } else {
                              setSelectedOrderStatuses(selectedOrderStatuses.filter(s => s !== status));
                            }
                          }}
                        />
                        <span>{status}（{statusCounts[status]}个）</span>
                      </label>
                    ))}
                  </div>
                )}
              </th>
              <th style={{...styles.th, ...styles.sortableHeader}} onClick={() => handleSort('totalAmount')}>
                商家实收金额(元)
                {sortField === 'totalAmount' && (
                  <span style={{marginLeft: 4}}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'amount' ? null : 'amount'); }}
                  style={{...styles.filterIconBtn, color: selectedAmounts.length > 0 ? '#3b82f6' : '#9ca3af'}}
                >
                  <Filter size={14} />
                </button>
                {showFilterForColumn === 'amount' && uniqueAmounts.length > 0 && (
                  <div style={styles.statusFilterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.statusFilterHeader}>
                      <span>选择金额</span>
                      {selectedAmounts.length > 0 && (
                        <button onClick={() => setSelectedAmounts([])} style={styles.clearStatusFilter}>清除</button>
                      )}
                    </div>
                    <div style={styles.filterScrollList}>
                      {uniqueAmounts.slice(0, 50).map(a => (
                        <label key={a} style={styles.statusFilterItem}>
                          <input
                            type="checkbox"
                            checked={selectedAmounts.includes(a)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAmounts([...selectedAmounts, a]);
                              } else {
                                setSelectedAmounts(selectedAmounts.filter(s => s !== a));
                              }
                            }}
                          />
                          <span>{a}（{amountCounts[a]}个）</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </th>
              <th style={{...styles.th, ...styles.sortableHeader}} onClick={() => handleSort('cost')}>
                成本
                {sortField === 'cost' && (
                  <span style={{marginLeft: 4}}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'cost' ? null : 'cost'); }}
                  style={{...styles.filterIconBtn, color: selectedCosts.length > 0 ? '#3b82f6' : '#9ca3af'}}
                >
                  <Filter size={14} />
                </button>
                {showFilterForColumn === 'cost' && (
                  <div style={styles.statusFilterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.statusFilterHeader}>
                      <span>选择成本</span>
                      {selectedCosts.length > 0 && (
                        <button onClick={() => setSelectedCosts([])} style={styles.clearStatusFilter}>清除</button>
                      )}
                    </div>
                    <div style={styles.filterScrollList}>
                      {uniqueCosts.slice(0, 50).map(c => (
                        <label key={c} style={styles.statusFilterItem}>
                          <input
                            type="checkbox"
                            checked={selectedCosts.includes(c)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCosts([...selectedCosts, c]);
                              } else {
                                setSelectedCosts(selectedCosts.filter(s => s !== c));
                              }
                            }}
                          />
                          <span>{c}（{costCounts[c]}个）</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </th>
              <th style={{...styles.th, ...styles.sortableHeader}} onClick={() => handleSort('profit')}>
                利润
                {sortField === 'profit' && (
                  <span style={{marginLeft: 4}}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'profit' ? null : 'profit'); }}
                  style={{...styles.filterIconBtn, color: selectedProfits.length > 0 ? '#3b82f6' : '#9ca3af'}}
                >
                  <Filter size={14} />
                </button>
                {showFilterForColumn === 'profit' && (
                  <div style={styles.statusFilterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.statusFilterHeader}>
                      <span>选择利润</span>
                      {selectedProfits.length > 0 && (
                        <button onClick={() => setSelectedProfits([])} style={styles.clearStatusFilter}>清除</button>
                      )}
                    </div>
                    <div style={styles.filterScrollList}>
                      {uniqueProfits.slice(0, 50).map(p => (
                        <label key={p} style={styles.statusFilterItem}>
                          <input
                            type="checkbox"
                            checked={selectedProfits.includes(p)}
                            onChange={() => {
                              if (selectedProfits.includes(p)) {
                                setSelectedProfits(selectedProfits.filter(x => x !== p));
                              } else {
                                setSelectedProfits([...selectedProfits, p]);
                              }
                            }}
                          />
                          <span>{p}（{profitCounts[p]}个）</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </th>
              <th style={{...styles.th, ...styles.sortableHeader}} onClick={() => handleSort('profitMargin')}>
                毛利率
                {sortField === 'profitMargin' && (
                  <span style={{marginLeft: 4}}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'profitMargin' ? null : 'profitMargin'); }}
                  style={{...styles.filterIconBtn, color: selectedProfitMargins.length > 0 ? '#3b82f6' : '#9ca3af'}}
                >
                  <Filter size={14} />
                </button>
                {showFilterForColumn === 'profitMargin' && (
                  <div style={styles.statusFilterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.statusFilterHeader}>
                      <span>选择毛利率</span>
                      {selectedProfitMargins.length > 0 && (
                        <button onClick={() => setSelectedProfitMargins([])} style={styles.clearStatusFilter}>清除</button>
                      )}
                    </div>
                    <div style={styles.filterScrollList}>
                      {uniqueProfitMargins.slice(0, 50).map(m => (
                        <label key={m} style={styles.statusFilterItem}>
                          <input
                            type="checkbox"
                            checked={selectedProfitMargins.includes(m)}
                            onChange={() => {
                              if (selectedProfitMargins.includes(m)) {
                                setSelectedProfitMargins(selectedProfitMargins.filter(x => x !== m));
                              } else {
                                setSelectedProfitMargins([...selectedProfitMargins, m]);
                              }
                            }}
                          />
                          <span>{m}%（{profitMarginCounts[m]}个）</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </th>
              <th style={{...styles.th, ...styles.sortableHeader}} onClick={() => handleSort('orderDate')}>
                日期
                {sortField === 'orderDate' && (
                  <span style={{marginLeft: 4}}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'date' ? null : 'date'); }}
                  style={{...styles.filterIconBtn, color: selectedDates.length > 0 ? '#3b82f6' : '#9ca3af'}}
                >
                  <Filter size={14} />
                </button>
                {showFilterForColumn === 'date' && (
                  <div style={styles.statusFilterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.statusFilterHeader}>
                      <span>选择日期</span>
                      {selectedDates.length > 0 && (
                        <button onClick={() => setSelectedDates([])} style={styles.clearStatusFilter}>清除</button>
                      )}
                    </div>
                    <div style={styles.filterScrollList}>
                      {uniqueDates.slice(0, 50).map(d => (
                        <label key={d} style={styles.statusFilterItem}>
                          <input
                            type="checkbox"
                            checked={selectedDates.includes(d)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDates([...selectedDates, d]);
                              } else {
                                setSelectedDates(selectedDates.filter(s => s !== d));
                              }
                            }}
                          />
                          <span>{d}（{dateCounts[d]}个）</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={9} style={styles.emptyCell}>
                  暂无订单数据
                </td>
              </tr>
            ) : (
              paginatedOrders.map(order => (
                <tr key={order.id} style={styles.tr}>
                  <td style={{...styles.td, textAlign: 'center'}}>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => handleSelectOne(order.id)}
                    />
                  </td>
                  <td style={styles.td} title={order.orderNo}>{order.orderNo}</td>
                  <td style={styles.td} title={order.productName}>{order.productName}</td>
                  <td style={styles.td}>{order.quantity}</td>
                  <td style={styles.td}>{order.orderStatus || '-'}</td>
                  <td style={styles.td}>{formatCurrency(order.totalAmount)}</td>
                  <td style={styles.td}>
                    {formatCurrency(order.costPrice * order.quantity + order.platformFee + order.shippingFee + order.otherFees)}
                  </td>
                  <td style={{
                    ...styles.td,
                    color: (order.profit || 0) >= 0 ? '#10b981' : '#ef4444',
                    fontWeight: 600,
                  }}>
                    {formatCurrency(order.profit || 0)}
                  </td>
                  <td style={{
                    ...styles.td,
                    color: order.totalAmount > 0 ? ((order.profit || 0) / order.totalAmount * 100 >= 0 ? '#10b981' : '#ef4444') : '#9ca3af',
                    fontWeight: 600,
                  }}>
                    {order.totalAmount > 0 ? (((order.profit || 0) / order.totalAmount * 100)).toFixed(2) + '%' : '-'}
                  </td>
                  <td style={styles.td}>{order.orderDate}</td>
                  <td style={styles.td}>
                    <button
                      onClick={() => setShowDeleteConfirm(order.id)}
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div style={styles.paginationContainer}>
        <div style={styles.pageSizeSelector}>
          <span style={{ marginRight: 8 }}>每页</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            style={styles.pageSizeSelect}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span style={{ marginLeft: 8 }}>条</span>
        </div>

        <div style={styles.pagination}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={styles.pageBtn}
            title="首页"
          >
            <ChevronFirst size={20} />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={styles.pageBtn}
          >
            <ChevronLeft size={20} />
          </button>

          {/* 页码按钮 */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  ...styles.pageBtn,
                  ...(currentPage === pageNum ? styles.pageBtnActive : {}),
                }}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={styles.pageBtn}
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={styles.pageBtn}
            title="末页"
          >
            <ChevronLast size={20} />
          </button>

          <span style={styles.pageInfo}>
            第 {currentPage} / {totalPages} 页
          </span>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>确认删除</h3>
            <p>确定要删除这条订单记录吗？</p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowDeleteConfirm(null)} style={styles.cancelBtn}>
                取消
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm)} style={styles.confirmBtn}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认弹窗 */}
      {showBatchDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>批量删除</h3>
            <p>确定要删除选中的 {selectedOrderIds.length} 条订单记录吗？</p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowBatchDeleteConfirm(false)} style={styles.cancelBtn}>
                取消
              </button>
              <button onClick={handleBatchDelete} style={styles.confirmBtn}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}

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
  headerActions: {
    display: 'flex',
    gap: 12,
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    backgroundColor: '#fff',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 16,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '8px 12px',
    flex: 1,
    maxWidth: 400,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    flex: 1,
    fontSize: 14,
  },
  timeFilter: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '8px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    color: '#6b7280',
  },
  filterBtnActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  filterIconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    marginLeft: 4,
    display: 'inline-flex',
    alignItems: 'center',
  },
  statusFilterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    zIndex: 100,
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    padding: 8,
    maxHeight: 300,
    minHeight: 50,
    overflowY: 'auto',
    minWidth: 220,
    whiteSpace: 'nowrap',
  },
  statusFilterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 8px',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
  },
  clearStatusFilter: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: 12,
  },
  statusFilterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 12,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  filterTextInput: {
    width: '100%',
    padding: '8px',
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    fontSize: 12,
    marginTop: 8,
  },
  filterScrollList: {
    maxHeight: 250,
    overflowY: 'auto',
    marginTop: 8,
  },
  rangeFilterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  rangeInputSmall: {
    flex: 1,
    padding: '6px 8px',
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    fontSize: 12,
  },
  rangeFilter: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
  },
  rangeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  rangeLabel: {
    fontSize: 14,
    color: '#374151',
    minWidth: 40,
  },
  rangeInput: {
    width: 80,
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
  },
  clearFilterBtn: {
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    color: '#6b7280',
  },
  sortableHeader: {
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  statsInfo: {
    marginBottom: 16,
    color: '#6b7280',
    fontSize: 14,
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'visible',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    fontWeight: 600,
    fontSize: 14,
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    position: 'relative',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '12px 16px',
    fontSize: 14,
    color: '#374151',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 200,
  },
  emptyCell: {
    padding: '48px',
    textAlign: 'center',
    color: '#9ca3af',
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 4,
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  pageSizeSelector: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    color: '#6b7280',
  },
  pageSizeSelect: {
    padding: '6px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pageBtn: {
    padding: '8px 12px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  pageBtnActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  pageInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '90%',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  confirmBtn: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  copyright: {
    textAlign: 'center',
    marginTop: 32,
    padding: 16,
    color: '#9ca3af',
    fontSize: 12,
  },
};

export default OrdersScreen;
