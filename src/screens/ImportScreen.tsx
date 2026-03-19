import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { parseExcelData } from '../services/DataImporter';
import { orderStorage } from '../storage/Database';

const ImportScreen: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setResult({ success: false, message: '请选择 Excel (.xlsx, .xls) 或 CSV 文件' });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const orders = await parseExcelData(file);

      if (orders.length === 0) {
        setResult({ success: false, message: '未能解析出有效数据，请检查文件格式' });
        setImporting(false);
        return;
      }

      // 保存到存储
      orderStorage.addMany(orders);

      setResult({
        success: true,
        message: '导入成功',
        count: orders.length,
      });
    } catch (error) {
      setResult({
        success: false,
        message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>导入数据</h1>
        <p style={styles.subtitle}>支持导入 Excel (.xlsx, .xls) 和 CSV 格式的订单数据</p>
      </div>

      {/* 拖拽区域 */}
      <div
        style={{
          ...styles.dropZone,
          ...(isDragging ? styles.dropZoneActive : {}),
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleSelectFile}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {importing ? (
          <div style={styles.importingState}>
            <div style={styles.spinner}></div>
            <p>正在导入...</p>
          </div>
        ) : (
          <>
            <div style={styles.uploadIcon}>
              <Upload size={48} color="#3b82f6" />
            </div>
            <p style={styles.dropText}>拖拽文件到此处，或点击选择文件</p>
            <p style={styles.dropHint}>支持 .xlsx, .xls, .csv 格式</p>
          </>
        )}
      </div>

      {/* 导入结果 */}
      {result && (
        <div style={{
          ...styles.resultBox,
          ...(result.success ? styles.resultSuccess : styles.resultError),
        }}>
          {result.success ? (
            <CheckCircle size={24} color="#10b981" />
          ) : (
            <AlertCircle size={24} color="#ef4444" />
          )}
          <div style={styles.resultContent}>
            <p style={styles.resultTitle}>
              {result.message}
              {result.count !== undefined && ` (${result.count} 条订单)`}
            </p>
          </div>
        </div>
      )}

      {/* 导入说明 */}
      <div style={styles.instructions}>
        <h3 style={styles.instructionsTitle}>
          <FileSpreadsheet size={20} />
          Excel文件格式要求
        </h3>
        <div style={styles.instructionsContent}>
          <p>Excel文件应包含以下列（表头）：</p>
          <ul style={styles.instructionsList}>
            <li><strong>订单号</strong> - 订单的唯一标识</li>
            <li><strong>商品规格</strong> - 商品的名称/规格</li>
            <li><strong>商品数量(件)</strong> - 购买数量</li>
            <li><strong>单价</strong> - 商品单价</li>
            <li><strong>商家实收金额(元)</strong> - 订单总金额</li>
            <li><strong>运费</strong> - 快递费用（可选）</li>
            <li><strong>平台服务费</strong> - 拼多多服务费（可选）</li>
            <li><strong>成本价</strong> - 商品成本（可选）</li>
            <li><strong>售后状态</strong> - 售后状态（可选）</li>
            <li><strong>订单日期</strong> - 下单日期（可选）</li>
          </ul>
          <p style={{ marginTop: 16, color: '#6b7280' }}>
            注意：系统会自动尝试匹配表头，如果表头名称不同，请手动修改为上述名称。
          </p>
        </div>

        <h3 style={styles.instructionsTitle}>导入后操作</h3>
        <div style={styles.instructionsContent}>
          <ul style={styles.instructionsList}>
            <li>导入订单后，可在「成本管理」中设置商品的成本价和费用</li>
            <li>在「订单列表」中查看和筛选所有订单</li>
            <li>在「首页」查看利润统计和分析图表</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: 800,
    margin: '0 auto',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    margin: 0,
  },
  dropZone: {
    border: '2px dashed #d1d5db',
    borderRadius: 12,
    padding: '48px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#f9fafb',
    transition: 'all 0.2s',
    marginBottom: 24,
  },
  dropZoneActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  uploadIcon: {
    marginBottom: 16,
  },
  dropText: {
    fontSize: 16,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  dropHint: {
    fontSize: 14,
    color: '#9ca3af',
    margin: 0,
  },
  importingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  resultBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  resultSuccess: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #10b981',
  },
  resultError: {
    backgroundColor: '#fef2f2',
    border: '1px solid #ef4444',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 500,
    color: '#1f2937',
  },
  instructions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  instructionsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 18,
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 16px 0',
  },
  instructionsContent: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  instructionsList: {
    paddingLeft: 20,
    margin: '8px 0',
  },
};

export default ImportScreen;
