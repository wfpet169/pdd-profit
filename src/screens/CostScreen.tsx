import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Edit2, Trash2, Save, X, Download, Upload, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { costConfigStorage } from '../storage/Database';
import type { CostConfig } from '../types';

const CostScreen: React.FC = () => {
  const [configs, setConfigs] = useState<CostConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<CostConfig>>({
    productName: '',
    costPrice: 0,
    platformFeeRate: 0.6,
    shippingCost: 0,
    otherCosts: 0,
  });
  // 批量修改表单：null 表示不修改该字段
  const [batchEditForm, setBatchEditForm] = useState<{
    costPrice: number | null;
    platformFeeRate: number | null;
    shippingCost: number | null;
    otherCosts: number | null;
  }>({
    costPrice: null,
    platformFeeRate: null,
    shippingCost: null,
    otherCosts: null,
  });

  // 筛选状态
  type FilterColumn = 'productName' | 'costPrice' | 'platformFeeRate' | 'shippingCost' | 'otherCosts';
  const [showFilterForColumn, setShowFilterForColumn] = useState<FilterColumn | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([]);
  const [selectedCostPrices, setSelectedCostPrices] = useState<number[]>([]);
  const [selectedPlatformFeeRates, setSelectedPlatformFeeRates] = useState<number[]>([]);
  const [selectedShippingCosts, setSelectedShippingCosts] = useState<number[]>([]);
  const [selectedOtherCosts, setSelectedOtherCosts] = useState<number[]>([]);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = () => {
    setConfigs(costConfigStorage.getAll());
  };

  // 各列唯一值和计数
  const productNameCounts = useMemo(() => {
    return configs.reduce((acc, config) => {
      acc[config.productName] = (acc[config.productName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [configs]);
  const uniqueProductNames = Object.keys(productNameCounts).sort();

  const costPriceCounts = useMemo(() => {
    return configs.reduce((acc, config) => {
      const key = config.costPrice.toString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [configs]);
  const uniqueCostPrices = Object.keys(costPriceCounts).map(Number).sort((a, b) => a - b);

  const platformFeeRateCounts = useMemo(() => {
    return configs.reduce((acc, config) => {
      const key = config.platformFeeRate.toString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [configs]);
  const uniquePlatformFeeRates = Object.keys(platformFeeRateCounts).map(Number).sort((a, b) => a - b);

  const shippingCostCounts = useMemo(() => {
    return configs.reduce((acc, config) => {
      const key = config.shippingCost.toString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [configs]);
  const uniqueShippingCosts = Object.keys(shippingCostCounts).map(Number).sort((a, b) => a - b);

  const otherCostCounts = useMemo(() => {
    return configs.reduce((acc, config) => {
      const key = config.otherCosts.toString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [configs]);
  const uniqueOtherCosts = Object.keys(otherCostCounts).map(Number).sort((a, b) => a - b);

  // 筛选后的数据
  const filteredConfigs = useMemo(() => {
    let filtered = [...configs];

    if (selectedProductNames.length > 0) {
      filtered = filtered.filter(c => selectedProductNames.includes(c.productName));
    }
    if (selectedCostPrices.length > 0) {
      filtered = filtered.filter(c => selectedCostPrices.includes(c.costPrice));
    }
    if (selectedPlatformFeeRates.length > 0) {
      filtered = filtered.filter(c => selectedPlatformFeeRates.includes(c.platformFeeRate));
    }
    if (selectedShippingCosts.length > 0) {
      filtered = filtered.filter(c => selectedShippingCosts.includes(c.shippingCost));
    }
    if (selectedOtherCosts.length > 0) {
      filtered = filtered.filter(c => selectedOtherCosts.includes(c.otherCosts));
    }

    return filtered;
  }, [configs, selectedProductNames, selectedCostPrices, selectedPlatformFeeRates, selectedShippingCosts, selectedOtherCosts]);

  // 分页计算
  const totalPages = Math.ceil(filteredConfigs.length / pageSize);
  const paginatedConfigs = filteredConfigs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 点击外部关闭筛选下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterForColumn(null);
      }
    };
    if (showFilterForColumn) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showFilterForColumn]);

  // 筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProductNames, selectedCostPrices, selectedPlatformFeeRates, selectedShippingCosts, selectedOtherCosts]);

  // 导出成本数据
  const handleExport = () => {
    const data = costConfigStorage.getAll();
    if (data.length === 0) {
      alert('没有成本数据可导出');
      return;
    }
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `成本配置_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入成本数据
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (!Array.isArray(importedData)) {
          alert('文件格式不正确');
          return;
        }

        const existingData = costConfigStorage.getAll();
        const merged = [...existingData];

        importedData.forEach((item: CostConfig) => {
          const existsIndex = merged.findIndex(c => c.productName === item.productName);
          if (existsIndex >= 0) {
            // 已存在则更新
            merged[existsIndex] = { ...item, id: merged[existsIndex].id };
          } else {
            // 不存在则添加
            merged.push({
              ...item,
              id: item.id || Date.now().toString(36) + Math.random().toString(36).substr(2),
            });
          }
        });

        costConfigStorage.save(merged);
        loadConfigs();
        alert(`成功导入 ${importedData.length} 条成本配置`);
      } catch (err) {
        alert('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAdd = () => {
    if (!formData.productName) {
      alert('请输入商品规格');
      return;
    }

    const newConfig: CostConfig = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      productName: formData.productName!,
      costPrice: formData.costPrice || 0,
      platformFeeRate: formData.platformFeeRate || 0,
      shippingCost: formData.shippingCost || 0,
      otherCosts: formData.otherCosts || 0,
    };

    costConfigStorage.add(newConfig);
    loadConfigs();
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingId || !formData.productName) return;

    const updatedConfig: CostConfig = {
      id: editingId,
      productName: formData.productName!,
      costPrice: formData.costPrice || 0,
      platformFeeRate: formData.platformFeeRate || 0,
      shippingCost: formData.shippingCost || 0,
      otherCosts: formData.otherCosts || 0,
    };

    costConfigStorage.update(updatedConfig);
    loadConfigs();
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条成本配置吗？')) {
      costConfigStorage.delete(id);
      loadConfigs();
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    costConfigStorage.deleteMany(selectedCostIds);
    setSelectedCostIds([]);
    setShowBatchDeleteConfirm(false);
    loadConfigs();
  };

  // 批量修改
  const handleBatchEdit = () => {
    setBatchEditForm({
      costPrice: null,
      platformFeeRate: null,
      shippingCost: null,
      otherCosts: null,
    });
    setShowBatchEditModal(true);
  };

  const confirmBatchEdit = () => {
    const updates: { id: string; updates: Partial<CostConfig> }[] = [];
    selectedCostIds.forEach(id => {
      const config = configs.find(c => c.id === id);
      if (config) {
        const updatesObj: Partial<CostConfig> = {};
        if (batchEditForm.costPrice !== null) updatesObj.costPrice = batchEditForm.costPrice;
        if (batchEditForm.platformFeeRate !== null) updatesObj.platformFeeRate = batchEditForm.platformFeeRate;
        if (batchEditForm.shippingCost !== null) updatesObj.shippingCost = batchEditForm.shippingCost;
        if (batchEditForm.otherCosts !== null) updatesObj.otherCosts = batchEditForm.otherCosts;
        if (Object.keys(updatesObj).length > 0) {
          updates.push({ id, updates: updatesObj });
        }
      }
    });
    if (updates.length > 0) {
      costConfigStorage.batchUpdate(updates);
      loadConfigs();
    }
    setShowBatchEditModal(false);
    setSelectedCostIds([]);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedCostIds.length === filteredConfigs.length) {
      setSelectedCostIds([]);
    } else {
      setSelectedCostIds(filteredConfigs.map(c => c.id));
    }
  };

  // 单选/取消单选
  const handleSelectOne = (id: string) => {
    if (selectedCostIds.includes(id)) {
      setSelectedCostIds(selectedCostIds.filter(i => i !== id));
    } else {
      setSelectedCostIds([...selectedCostIds, id]);
    }
  };

  const handleEdit = (config: CostConfig) => {
    setEditingId(config.id);
    setFormData({
      productName: config.productName,
      costPrice: config.costPrice,
      platformFeeRate: config.platformFeeRate,
      shippingCost: config.shippingCost,
      otherCosts: config.otherCosts,
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      productName: '',
      costPrice: 0,
      platformFeeRate: 0.6,
      shippingCost: 0,
      otherCosts: 0,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value}%`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>成本管理</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} style={{ ...styles.addBtn, backgroundColor: '#10b981' }}>
            <Download size={18} />
            导出数据
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            style={{ display: 'none' }}
          />
          <button onClick={() => fileInputRef.current?.click()} style={{ ...styles.addBtn, backgroundColor: '#6366f1' }}>
            <Upload size={18} />
            导入数据
          </button>
          {selectedCostIds.length > 0 && (
            <button onClick={() => setShowBatchDeleteConfirm(true)} style={{ ...styles.addBtn, backgroundColor: '#ef4444' }}>
              <Trash2 size={18} />
              批量删除 ({selectedCostIds.length})
            </button>
          )}
          {selectedCostIds.length > 0 && (
            <button onClick={handleBatchEdit} style={styles.addBtn}>
              <Edit2 size={18} />
              批量修改 ({selectedCostIds.length})
            </button>
          )}
          <button onClick={() => setShowAddForm(true)} style={styles.addBtn}>
            <Plus size={18} />
            添加商品成本
          </button>
        </div>
      </div>

      {/* 成本配置列表 */}
      <div style={styles.listSection}>
        {configs.length > 0 && (
          <div style={styles.listHeader}>
            <span style={styles.countBadge}>共 {configs.length} 条成本配置</span>
          </div>
        )}
        {configs.length === 0 ? (
          <div style={styles.emptyState}>
            <p>暂无成本配置</p>
            <p style={styles.emptyHint}>添加商品成本后，系统将自动计算利润</p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{...styles.th, width: 40}}>
                    <input
                      type="checkbox"
                      checked={filteredConfigs.length > 0 && selectedCostIds.length === filteredConfigs.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={styles.th}>
                    商品规格
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'productName' ? null : 'productName'); }}
                      style={{...styles.filterIconBtn, color: selectedProductNames.length > 0 ? '#3b82f6' : '#9ca3af'}}
                    >
                      <Filter size={14} />
                    </button>
                    {showFilterForColumn === 'productName' && (
                      <div style={styles.filterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.filterHeader}>
                          <span>选择商品规格</span>
                          {selectedProductNames.length > 0 && (
                            <button onClick={() => setSelectedProductNames([])} style={styles.clearFilter}>清除</button>
                          )}
                        </div>
                        {uniqueProductNames.map(name => (
                          <label key={name} style={styles.filterItem}>
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
                    )}
                  </th>
                  <th style={styles.th}>
                    成本价
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'costPrice' ? null : 'costPrice'); }}
                      style={{...styles.filterIconBtn, color: selectedCostPrices.length > 0 ? '#3b82f6' : '#9ca3af'}}
                    >
                      <Filter size={14} />
                    </button>
                    {showFilterForColumn === 'costPrice' && (
                      <div style={styles.filterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.filterHeader}>
                          <span>选择成本价</span>
                          {selectedCostPrices.length > 0 && (
                            <button onClick={() => setSelectedCostPrices([])} style={styles.clearFilter}>清除</button>
                          )}
                        </div>
                        {uniqueCostPrices.map(price => (
                          <label key={price} style={styles.filterItem}>
                            <input
                              type="checkbox"
                              checked={selectedCostPrices.includes(price)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCostPrices([...selectedCostPrices, price]);
                                } else {
                                  setSelectedCostPrices(selectedCostPrices.filter(s => s !== price));
                                }
                              }}
                            />
                            <span>{formatCurrency(price)}（{costPriceCounts[price.toString()]}个）</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </th>
                  <th style={styles.th}>
                    平台费率
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'platformFeeRate' ? null : 'platformFeeRate'); }}
                      style={{...styles.filterIconBtn, color: selectedPlatformFeeRates.length > 0 ? '#3b82f6' : '#9ca3af'}}
                    >
                      <Filter size={14} />
                    </button>
                    {showFilterForColumn === 'platformFeeRate' && (
                      <div style={styles.filterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.filterHeader}>
                          <span>选择平台费率</span>
                          {selectedPlatformFeeRates.length > 0 && (
                            <button onClick={() => setSelectedPlatformFeeRates([])} style={styles.clearFilter}>清除</button>
                          )}
                        </div>
                        {uniquePlatformFeeRates.map(rate => (
                          <label key={rate} style={styles.filterItem}>
                            <input
                              type="checkbox"
                              checked={selectedPlatformFeeRates.includes(rate)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPlatformFeeRates([...selectedPlatformFeeRates, rate]);
                                } else {
                                  setSelectedPlatformFeeRates(selectedPlatformFeeRates.filter(s => s !== rate));
                                }
                              }}
                            />
                            <span>{rate}%（{platformFeeRateCounts[rate.toString()]}个）</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </th>
                  <th style={styles.th}>
                    快递成本
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'shippingCost' ? null : 'shippingCost'); }}
                      style={{...styles.filterIconBtn, color: selectedShippingCosts.length > 0 ? '#3b82f6' : '#9ca3af'}}
                    >
                      <Filter size={14} />
                    </button>
                    {showFilterForColumn === 'shippingCost' && (
                      <div style={styles.filterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.filterHeader}>
                          <span>选择快递成本</span>
                          {selectedShippingCosts.length > 0 && (
                            <button onClick={() => setSelectedShippingCosts([])} style={styles.clearFilter}>清除</button>
                          )}
                        </div>
                        {uniqueShippingCosts.map(cost => (
                          <label key={cost} style={styles.filterItem}>
                            <input
                              type="checkbox"
                              checked={selectedShippingCosts.includes(cost)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedShippingCosts([...selectedShippingCosts, cost]);
                                } else {
                                  setSelectedShippingCosts(selectedShippingCosts.filter(s => s !== cost));
                                }
                              }}
                            />
                            <span>{formatCurrency(cost)}（{shippingCostCounts[cost.toString()]}个）</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </th>
                  <th style={styles.th}>
                    其他成本
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowFilterForColumn(showFilterForColumn === 'otherCosts' ? null : 'otherCosts'); }}
                      style={{...styles.filterIconBtn, color: selectedOtherCosts.length > 0 ? '#3b82f6' : '#9ca3af'}}
                    >
                      <Filter size={14} />
                    </button>
                    {showFilterForColumn === 'otherCosts' && (
                      <div style={styles.filterDropdown} ref={filterRef} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.filterHeader}>
                          <span>选择其他成本</span>
                          {selectedOtherCosts.length > 0 && (
                            <button onClick={() => setSelectedOtherCosts([])} style={styles.clearFilter}>清除</button>
                          )}
                        </div>
                        {uniqueOtherCosts.map(cost => (
                          <label key={cost} style={styles.filterItem}>
                            <input
                              type="checkbox"
                              checked={selectedOtherCosts.includes(cost)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOtherCosts([...selectedOtherCosts, cost]);
                                } else {
                                  setSelectedOtherCosts(selectedOtherCosts.filter(s => s !== cost));
                                }
                              }}
                            />
                            <span>{formatCurrency(cost)}（{otherCostCounts[cost.toString()]}个）</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </th>
                  <th style={styles.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedConfigs.map(config => (
                  <tr key={config.id} style={styles.tr}>
                    <td style={{...styles.td, textAlign: 'center'}}>
                      <input
                        type="checkbox"
                        checked={selectedCostIds.includes(config.id)}
                        onChange={() => handleSelectOne(config.id)}
                      />
                    </td>
                    <td style={styles.td} title={config.productName}>{config.productName}</td>
                    <td style={styles.td}>{formatCurrency(config.costPrice)}</td>
                    <td style={styles.td}>{formatPercent(config.platformFeeRate)}</td>
                    <td style={styles.td}>{formatCurrency(config.shippingCost)}</td>
                    <td style={styles.td}>{formatCurrency(config.otherCosts)}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button onClick={() => handleEdit(config)} style={styles.editBtn}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(config.id)} style={styles.deleteBtn}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 分页 */}
      {configs.length > 0 && (
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
      )}

      {/* 说明 */}
      <div style={styles.instructions}>
        <h3>成本配置说明</h3>
        <ul>
          <li><strong>成本价</strong>：商品的生产/采购成本，按件计算</li>
          <li><strong>平台服务费</strong>：拼多多技术服务费，按订单金额的百分比计算（默认约0.6%）</li>
          <li><strong>快递成本</strong>：每单的快递费用</li>
          <li><strong>其他成本</strong>：包装费、人工等额外支出</li>
        </ul>
        <p style={{ marginTop: 16, color: '#6b7280' }}>
          利润计算公式：利润 = 销售收入 - 成本价×数量 - 平台服务费 - 快递成本 - 其他成本
        </p>
      </div>

      {/* 批量删除确认弹窗 */}
      {showBatchDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>批量删除</h3>
            <p>确定要删除选中的 {selectedCostIds.length} 条成本配置吗？</p>
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

      {/* 批量修改弹窗 */}
      {showBatchEditModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.formModal}>
            <div style={styles.formHeader}>
              <h3>批量修改成本配置（已选择 {selectedCostIds.length} 条）</h3>
              <button onClick={() => setShowBatchEditModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>留空表示不修改该字段</p>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>成本价 (元/件)</label>
                <input
                  type="number"
                  step="0.01"
                  value={batchEditForm.costPrice ?? ''}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, costPrice: e.target.value ? parseFloat(e.target.value) : null })}
                  style={styles.input}
                  placeholder="留空不修改"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>平台服务费 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={batchEditForm.platformFeeRate ?? ''}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, platformFeeRate: e.target.value ? parseFloat(e.target.value) : null })}
                  style={styles.input}
                  placeholder="留空不修改"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>快递成本 (元/单)</label>
                <input
                  type="number"
                  step="0.01"
                  value={batchEditForm.shippingCost ?? ''}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, shippingCost: e.target.value ? parseFloat(e.target.value) : null })}
                  style={styles.input}
                  placeholder="留空不修改"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>其他成本 (元/单)</label>
                <input
                  type="number"
                  step="0.01"
                  value={batchEditForm.otherCosts ?? ''}
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, otherCosts: e.target.value ? parseFloat(e.target.value) : null })}
                  style={styles.input}
                  placeholder="留空不修改"
                />
              </div>
            </div>
            <div style={styles.formActions}>
              <button onClick={() => setShowBatchEditModal(false)} style={styles.cancelBtn}>
                取消
              </button>
              <button onClick={confirmBatchEdit} style={styles.saveBtn}>
                <Save size={18} />
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑表单 Modal */}
      {showAddForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.formModal}>
            <div style={styles.formHeader}>
              <h3>{editingId ? '编辑成本配置' : '添加成本配置'}</h3>
              <button onClick={resetForm} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>商品规格 *</label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  style={styles.input}
                  placeholder="必须与导入Excel规格名称一致"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>成本价 (元/件)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  style={styles.input}
                  placeholder="0"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>平台服务费 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.platformFeeRate}
                  onChange={(e) => setFormData({ ...formData, platformFeeRate: parseFloat(e.target.value) || 0 })}
                  style={styles.input}
                  placeholder="0.6"
                />
                <span style={styles.hint}>拼多多默认约0.6%</span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>快递成本 (元/单)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.shippingCost}
                  onChange={(e) => setFormData({ ...formData, shippingCost: parseFloat(e.target.value) || 0 })}
                  style={styles.input}
                  placeholder="0"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>其他成本 (元/单)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.otherCosts}
                  onChange={(e) => setFormData({ ...formData, otherCosts: parseFloat(e.target.value) || 0 })}
                  style={styles.input}
                  placeholder="0"
                />
                <span style={styles.hint}>包装、人工等</span>
              </div>
            </div>

            <div style={styles.formActions}>
              <button onClick={resetForm} style={styles.cancelBtn}>
                取消
              </button>
              <button onClick={editingId ? handleUpdate : handleAdd} style={styles.saveBtn}>
                <Save size={18} />
                保存
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
    maxWidth: 1000,
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
  addBtn: {
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
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    padding: 4,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  listSection: {
    marginBottom: 24,
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  countBadge: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    padding: '6px 12px',
    borderRadius: 16,
    fontSize: 14,
    fontWeight: 500,
  },
  filterIconBtn: {
    padding: 2,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    marginLeft: 4,
    display: 'inline-flex',
    alignItems: 'center',
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 12,
    zIndex: 100,
    minWidth: 200,
    maxWidth: 300,
    maxHeight: 300,
    overflowY: 'auto',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  filterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: '1px solid #e5e7eb',
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
    fontSize: 14,
    cursor: 'pointer',
  },
  clearFilter: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: 12,
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
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 48,
    textAlign: 'center',
    color: '#6b7280',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    minWidth: 320,
    maxWidth: 400,
  },
  formModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    minWidth: 400,
    maxWidth: 560,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  confirmBtn: {
    cursor: 'pointer',
  },
  emptyHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'visible',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'relative',
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
  actions: {
    display: 'flex',
    gap: 8,
  },
  editBtn: {
    padding: 6,
    backgroundColor: '#eff6ff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    color: '#3b82f6',
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#fef2f2',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    color: '#ef4444',
  },
  instructions: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 24,
    marginTop: 32,
    color: '#374151',
    fontSize: 14,
    lineHeight: 1.6,
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
    marginLeft: 12,
  },
  copyright: {
    textAlign: 'center',
    marginTop: 32,
    padding: 16,
    color: '#9ca3af',
    fontSize: 12,
  },
};

export default CostScreen;
