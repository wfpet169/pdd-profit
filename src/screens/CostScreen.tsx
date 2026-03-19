import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X, Download, Upload } from 'lucide-react';
import { costConfigStorage } from '../storage/Database';
import type { CostConfig } from '../types';

const CostScreen: React.FC = () => {
  const [configs, setConfigs] = useState<CostConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<CostConfig>>({
    productName: '',
    costPrice: 0,
    platformFeeRate: 0.6,
    shippingCost: 0,
    otherCosts: 0,
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = () => {
    setConfigs(costConfigStorage.getAll());
  };

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

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedCostIds.length === configs.length) {
      setSelectedCostIds([]);
    } else {
      setSelectedCostIds(configs.map(c => c.id));
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
          <button onClick={() => setShowAddForm(true)} style={styles.addBtn}>
            <Plus size={18} />
            添加商品成本
          </button>
        </div>
      </div>

      {/* 添加/编辑表单 */}
      {showAddForm && (
        <div style={styles.formCard}>
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
      )}

      {/* 成本配置列表 */}
      <div style={styles.listSection}>
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
                      checked={configs.length > 0 && selectedCostIds.length === configs.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={styles.th}>商品规格</th>
                  <th style={styles.th}>成本价</th>
                  <th style={styles.th}>平台费率</th>
                  <th style={styles.th}>快递成本</th>
                  <th style={styles.th}>其他成本</th>
                  <th style={styles.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {configs.map(config => (
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
    overflow: 'hidden',
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
    color: '#374151',
    fontSize: 14,
    lineHeight: 1.6,
  },
};

export default CostScreen;
