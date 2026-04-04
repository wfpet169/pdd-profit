import * as XLSX from 'xlsx';
import type { Order, OrderStatus } from '../types';

// 生成唯一ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 解析日期
function parseDate(value: any): string {
  if (!value) return '';

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // 处理Excel日期序列号
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  // 尝试解析字符串日期
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '';
}

// 解析数字
function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const str = String(value).replace(/[¥￥$,\s]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// 解析订单状态，直接返回原始值
function parseOrderStatus(value: any): OrderStatus {
  if (!value) return '';
  return String(value).trim();
}

// Excel表头映射
const HEADER_MAPPING: Record<string, keyof Order> = {
  '订单号': 'orderNo',
  '订单编号': 'orderNo',
  '订单号/号码': 'orderNo',
  '商品名称': 'productName',
  '商品': 'productName',
  '商品规格': 'productName',
  '产品名称': 'productName',
  '数量': 'quantity',
  '商品数量(件)': 'quantity',
  '件数': 'quantity',
  '单价': 'unitPrice',
  '单价(元)': 'unitPrice',
  '单价(分)': 'unitPrice',
  '总价': 'totalAmount',
  '总金额': 'totalAmount',
  '商家实收金额(元)': 'totalAmount',
  '订单金额': 'totalAmount',
  '金额': 'totalAmount',
  '运费': 'shippingFee',
  '快递费': 'shippingFee',
  '物流费': 'shippingFee',
  '平台服务费': 'platformFee',
  '技术服务费': 'platformFee',
  '成本价': 'costPrice',
  '成本': 'costPrice',
  '其他费用': 'otherFees',
  '其他': 'otherFees',
  '订单日期': 'orderDate',
  '日期': 'orderDate',
  '下单时间': 'orderDate',
  '创建时间': 'orderDate',
  '订单成交时间': 'orderDate',
  '售后状态': 'status',
  '售后': 'status',
  '订单状态': 'orderStatus',
  '状态': 'orderStatus',
};

// 标准化表头
function normalizeHeader(header: string): string {
  return header.trim();
}

// 解析Excel/CSV数据
export function parseExcelData(file: File): Promise<Order[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          resolve([]);
          return;
        }

        // 第一行是表头
        const headers = jsonData[0].map(h => normalizeHeader(String(h || '')));

        // 建立列索引映射
        const columnMap: Record<number, keyof Order> = {};
        headers.forEach((header, index) => {
          const mappedKey = HEADER_MAPPING[header];
          if (mappedKey) {
            columnMap[index] = mappedKey;
          }
        });

        // 解析数据行
        const orders: Order[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const order: Partial<Order> = {
            id: generateId(),
          };

          let hasValidData = false;
          Object.entries(columnMap).forEach(([colIndex, key]) => {
            const value = row[parseInt(colIndex)];
            if (value !== undefined && value !== null && value !== '') {
              hasValidData = true;
              switch (key) {
                case 'orderNo':
                  order.orderNo = String(value);
                  break;
                case 'productName':
                  order.productName = String(value);
                  break;
                case 'quantity':
                  order.quantity = parseNumber(value);
                  break;
                case 'unitPrice':
                  order.unitPrice = parseNumber(value);
                  break;
                case 'totalAmount':
                  order.totalAmount = parseNumber(value);
                  break;
                case 'shippingFee':
                  order.shippingFee = parseNumber(value);
                  break;
                case 'platformFee':
                  order.platformFee = parseNumber(value);
                  break;
                case 'costPrice':
                  order.costPrice = parseNumber(value);
                  break;
                case 'otherFees':
                  order.otherFees = parseNumber(value);
                  break;
                case 'orderDate':
                  order.orderDate = parseDate(value);
                  break;
                case 'status':
                  order.status = parseOrderStatus(value);
                  break;
                case 'orderStatus':
                  order.orderStatus = String(value);
                  break;
              }
            }
          });

          // 默认值
          if (!order.orderNo) {
            order.orderNo = `ORD-${generateId()}`;
          }
          if (!order.productName) {
            order.productName = '未知商品';
          }
          if (!order.totalAmount && order.unitPrice && order.quantity) {
            order.totalAmount = order.unitPrice * order.quantity;
          }
          if (!order.status) {
            order.status = 'normal';
          }

          if (hasValidData) {
            orders.push(order as Order);
          }
        }

        resolve(orders);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsBinaryString(file);
  });
}

// 导出数据到Excel
export function exportToExcel(orders: Order[]): void {
  const data = orders.map(order => ({
    '订单号': order.orderNo,
    '商品规格': order.productName,
    '商品数量(件)': order.quantity,
    '单价': order.unitPrice,
    '商家实收金额(元)': order.totalAmount,
    '运费': order.shippingFee,
    '平台服务费': order.platformFee,
    '成本价': order.costPrice,
    '其他费用': order.otherFees,
    '利润': order.profit || 0,
    '订单状态': order.orderStatus,
    '订单日期': order.orderDate,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '订单数据');

  XLSX.writeFile(workbook, `拼多多订单_${new Date().toISOString().split('T')[0]}.xlsx`);
}
