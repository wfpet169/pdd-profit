import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, FileSpreadsheet, ShoppingCart, Settings } from 'lucide-react';
import DashboardScreen from './screens/DashboardScreen';
import OrdersScreen from './screens/OrdersScreen';
import ImportScreen from './screens/ImportScreen';
import CostScreen from './screens/CostScreen';

function App() {
  return (
    <BrowserRouter>
      <div style={styles.app}>
        {/* 侧边栏导航 */}
        <nav style={styles.sidebar}>
          <div style={styles.logo}>
            <h2>PDD利润核算</h2>
          </div>

          <div style={styles.nav}>
            <NavLink
              to="/"
              style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}
            >
              <LayoutDashboard size={20} />
              <span>首页</span>
            </NavLink>

            <NavLink
              to="/orders"
              style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}
            >
              <ShoppingCart size={20} />
              <span>订单列表</span>
            </NavLink>

            <NavLink
              to="/import"
              style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}
            >
              <FileSpreadsheet size={20} />
              <span>导入数据</span>
            </NavLink>

            <NavLink
              to="/cost"
              style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}
            >
              <Settings size={20} />
              <span>成本管理</span>
            </NavLink>
          </div>
        </nav>

        {/* 主内容区 */}
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/orders" element={<OrdersScreen />} />
            <Route path="/import" element={<ImportScreen />} />
            <Route path="/cost" element={<CostScreen />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  sidebar: {
    width: 240,
    backgroundColor: '#1f2937',
    color: '#fff',
    padding: '24px 0',
    flexShrink: 0,
  },
  logo: {
    padding: '0 24px 24px',
    borderBottom: '1px solid #374151',
    marginBottom: 24,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '0 12px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    color: '#9ca3af',
    textDecoration: 'none',
    borderRadius: 8,
    transition: 'all 0.2s',
    fontSize: 15,
  },
  navLinkActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  main: {
    flex: 1,
    overflow: 'auto',
  },
};

export default App;
