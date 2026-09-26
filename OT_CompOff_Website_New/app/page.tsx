'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Staff = {
  id: number;
  employee_id: string;
  name: string;
  access_enabled: boolean;
  role: string;
};

type OTEntry = {
  id?: number;
  employee_id?: string;
  name?: string;
  ot_date?: string;
  start_time?: string;
  end_time?: string;
  ot_hours?: number;
  comp_off?: boolean;
  status?: string;
};

type Page =
  | 'dashboard'
  | 'staff'
  | 'add'
  | 'ot'
  | 'admin'
  | 'password';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const MAIN_ADMIN_ID = 'SAS102';
const SESSION_KEY = 'ot_details_session';

const css = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Inter, Arial, Helvetica, sans-serif;
  background: #f5f7fb;
  color: #172033;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

.ot-app {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(37,99,235,.08), transparent 28%),
    #f5f7fb;
}

/* LOGIN */

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  background:
    radial-gradient(circle at 15% 15%, rgba(37,99,235,.12), transparent 30%),
    radial-gradient(circle at 85% 85%, rgba(15,23,42,.08), transparent 30%),
    #f5f7fb;
}

.login-wrapper {
  width: 100%;
  max-width: 1050px;
  min-height: 620px;
  display: grid;
  grid-template-columns: 46% 54%;
  background: #fff;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(15,23,42,.14);
  border: 1px solid #e7ebf2;
}

.login-brand {
  position: relative;
  padding: 55px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    linear-gradient(145deg, #071a3a 0%, #0d2f68 55%, #1455b8 100%);
  color: white;
  overflow: hidden;
}

.login-brand:before {
  content: '';
  position: absolute;
  width: 330px;
  height: 330px;
  border-radius: 50%;
  right: -150px;
  top: -100px;
  background: rgba(255,255,255,.07);
}

.login-brand:after {
  content: '';
  position: absolute;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  left: -120px;
  bottom: -100px;
  background: rgba(255,255,255,.05);
}

.brand-logo {
  position: relative;
  z-index: 1;
}

.brand-mark {
  width: 62px;
  height: 62px;
  border-radius: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,.13);
  border: 1px solid rgba(255,255,255,.2);
  font-size: 25px;
  font-weight: 800;
  margin-bottom: 26px;
}

.brand-title {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -1.5px;
  margin: 0;
}

.brand-subtitle {
  margin-top: 12px;
  color: #cbd9ef;
  line-height: 1.7;
  font-size: 15px;
  max-width: 350px;
}

.brand-bottom {
  position: relative;
  z-index: 1;
}

.brand-line {
  height: 1px;
  background: rgba(255,255,255,.15);
  margin-bottom: 20px;
}

.brand-small {
  color: #afc3e4;
  font-size: 12px;
}

.login-form-area {
  padding: 55px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-form {
  width: 100%;
  max-width: 390px;
}

.login-heading {
  margin-bottom: 35px;
}

.login-heading h2 {
  margin: 0 0 8px;
  font-size: 30px;
  letter-spacing: -.5px;
}

.login-heading p {
  margin: 0;
  color: #7a8496;
  font-size: 14px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #3b4659;
  margin-bottom: 8px;
}

.form-group {
  margin-bottom: 19px;
}

.form-input {
  width: 100%;
  height: 52px;
  border: 1px solid #dce2eb;
  border-radius: 12px;
  padding: 0 15px;
  outline: none;
  background: #fafbfd;
  color: #172033;
  transition: .2s;
}

.form-input:focus {
  border-color: #2563eb;
  background: white;
  box-shadow: 0 0 0 4px rgba(37,99,235,.08);
}

.primary-btn {
  width: 100%;
  height: 52px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #1455b8, #2563eb);
  color: white;
  font-weight: 700;
  box-shadow: 0 9px 20px rgba(37,99,235,.2);
  transition: .2s;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 13px 25px rgba(37,99,235,.28);
}

.primary-btn:disabled,
.action-btn:disabled,
.danger-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.secondary-btn {
  width: 100%;
  height: 50px;
  border: 1px solid #dce2eb;
  border-radius: 12px;
  background: white;
  color: #243149;
  font-weight: 700;
  margin-top: 12px;
}

.secondary-btn:hover {
  background: #f6f8fc;
}

.login-switch {
  margin-top: 22px;
  padding-top: 22px;
  border-top: 1px solid #edf0f5;
}

.login-switch button {
  width: 100%;
  border: 0;
  background: #eef4ff;
  color: #1754b6;
  height: 48px;
  border-radius: 11px;
  font-weight: 700;
}

.message {
  margin-bottom: 18px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff5f5;
  color: #b42318;
  font-size: 13px;
  border: 1px solid #ffd9d6;
}

/* APP */

.app-layout {
  min-height: 100vh;
  display: flex;
}

.sidebar {
  width: 255px;
  background: #071a3a;
  color: white;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 20;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
}

.side-brand {
  padding: 6px 12px 28px;
  border-bottom: 1px solid rgba(255,255,255,.09);
  margin-bottom: 22px;
}

.side-brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.side-mark {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #1554b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 800;
}

.side-title {
  font-size: 19px;
  font-weight: 800;
}

.side-subtitle {
  font-size: 10px;
  color: #93a8ca;
  margin-top: 2px;
}

.nav-title {
  color: #7288ac;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 12px 9px;
}

.nav-btn {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #c0cee3;
  text-align: left;
  padding: 0 13px;
  margin-bottom: 5px;
  transition: .18s;
}

.nav-btn:hover,
.nav-btn.active {
  background: rgba(255,255,255,.09);
  color: white;
}

.nav-icon {
  width: 23px;
  text-align: center;
  font-size: 16px;
}

.side-bottom {
  margin-top: auto;
}

.logout-btn {
  width: 100%;
  height: 45px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.05);
  color: #d8e2f2;
  font-weight: 600;
}

.logout-btn:hover {
  background: rgba(255,255,255,.1);
}

.main-area {
  margin-left: 255px;
  width: calc(100% - 255px);
}

.topbar {
  height: 76px;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e8ecf2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 35px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.topbar-title {
  font-size: 20px;
  font-weight: 800;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px 7px 7px;
  border: 1px solid #e5e9f0;
  border-radius: 30px;
  background: white;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #eaf1ff;
  color: #1455b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.user-name {
  font-size: 12px;
  font-weight: 700;
}

.user-role {
  font-size: 10px;
  color: #8590a3;
  margin-top: 2px;
}

.content {
  padding: 35px;
  max-width: 1450px;
  margin: auto;
}

.page-heading {
  margin-bottom: 28px;
}

.page-heading h1 {
  margin: 0 0 7px;
  font-size: 29px;
  letter-spacing: -.7px;
}

.page-heading p {
  margin: 0;
  color: #7c8799;
  font-size: 14px;
}

/* STATS */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border: 1px solid #e6eaf0;
  border-radius: 17px;
  padding: 22px;
  box-shadow: 0 7px 22px rgba(15,23,42,.045);
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-icon {
  width: 43px;
  height: 43px;
  border-radius: 12px;
  background: #edf4ff;
  color: #1754b6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.stat-label {
  margin-top: 17px;
  color: #7d8798;
  font-size: 12px;
  font-weight: 600;
}

.stat-value {
  margin-top: 5px;
  font-size: 27px;
  font-weight: 800;
}

/* FEATURE */

.section-title {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 15px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 17px;
}

.feature-card {
  background: white;
  border: 1px solid #e6eaf0;
  border-radius: 17px;
  padding: 23px;
  min-height: 155px;
  transition: .2s;
  cursor: pointer;
  box-shadow: 0 7px 22px rgba(15,23,42,.035);
}

.feature-card:hover {
  transform: translateY(-3px);
  border-color: #cbdaf3;
  box-shadow: 0 15px 32px rgba(15,23,42,.08);
}

.feature-icon {
  width: 45px;
  height: 45px;
  border-radius: 12px;
  background: #f0f5ff;
  color: #1754b6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  margin-bottom: 17px;
}

.feature-title {
  font-weight: 800;
  font-size: 15px;
}

.feature-desc {
  margin-top: 6px;
  color: #8992a3;
  font-size: 12px;
  line-height: 1.5;
}

/* PANELS */

.panel {
  background: white;
  border: 1px solid #e5e9f0;
  border-radius: 18px;
  padding: 25px;
  box-shadow: 0 7px 22px rgba(15,23,42,.04);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 22px;
}

.panel-title {
  font-size: 18px;
  font-weight: 800;
}

.action-btn {
  height: 42px;
  padding: 0 17px;
  border: 0;
  border-radius: 9px;
  background: #1455b8;
  color: white;
  font-weight: 700;
}

.action-btn:hover {
  background: #10499f;
}

.danger-btn {
  height: 40px;
  padding: 0 14px;
  border: 1px solid #ffd2d0;
  border-radius: 9px;
  background: #fff5f4;
  color: #b42318;
  font-weight: 700;
}

.danger-btn:hover {
  background: #ffeceb;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #e8ebf0;
  border-radius: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 650px;
}

.data-table th {
  text-align: left;
  background: #f8f9fb;
  color: #697386;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .4px;
  padding: 13px 15px;
  border-bottom: 1px solid #e5e8ed;
}

.data-table td {
  padding: 14px 15px;
  border-bottom: 1px solid #edf0f4;
  font-size: 13px;
}

.data-table tr:last-child td {
  border-bottom: 0;
}

.badge {
  display: inline-flex;
  padding: 5px 9px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 800;
}

.badge-active {
  background: #eaf8ef;
  color: #147a3f;
}

.badge-off {
  background: #f2f4f7;
  color: #667085;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}

.form-full {
  grid-column: 1 / -1;
}

.select-box {
  width: 100%;
  height: 50px;
  border: 1px solid #dce2eb;
  border-radius: 11px;
  background: white;
  padding: 0 13px;
  outline: none;
}

.helper {
  color: #8a94a6;
  font-size: 12px;
  margin-top: 7px;
}

.two-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* MOBILE */

@media (max-width: 900px) {
  .login-wrapper {
    grid-template-columns: 1fr;
  }

  .login-brand {
    display: none;
  }

  .sidebar {
    width: 75px;
    padding: 18px 10px;
  }

  .side-title,
  .side-subtitle,
  .nav-title,
  .nav-btn span:not(.nav-icon) {
    display: none;
  }

  .side-brand {
    padding: 0 0 20px;
  }

  .side-brand-row {
    justify-content: center;
  }

  .nav-btn {
    justify-content: center;
    padding: 0;
  }

  .main-area {
    margin-left: 75px;
    width: calc(100% - 75px);
  }

  .topbar {
    padding: 0 18px;
  }

  .content {
    padding: 22px 18px;
  }

  .stats-grid,
  .feature-grid,
  .two-panel {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-full {
    grid-column: auto;
  }
}

@media (max-width: 600px) {
  .login-page {
    padding: 15px;
  }

  .login-form-area {
    padding: 30px 22px;
  }

  .topbar-title {
    font-size: 16px;
  }

  .user-chip {
    padding-right: 7px;
  }

  .user-name,
  .user-role {
    display: none;
  }

  .content {
    padding: 18px 13px;
  }

  .page-heading h1 {
    font-size: 24px;
  }

  .panel {
    padding: 18px;
  }

  .panel-header {
    align-items: flex-start;
  }
}
`;

function Header({
  title,
  session,
}: {
  title: string;
  session: any;
}) {
  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>

      <div className="topbar-right">
        <div className="user-chip">
          <div className="avatar">
            {(session?.name || session?.employee_id || 'A')
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <div className="user-name">
              {session?.name || session?.employee_id}
            </div>

            <div className="user-role">
              {session?.role === 'admin'
                ? 'Administrator'
                : 'Staff'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar({
  page,
  setPage,
  onLogout,
}: {
  page: Page;
  setPage: (p: Page) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="side-brand">
        <div className="side-brand-row">
          <div className="side-mark">OT</div>

          <div>
            <div className="side-title">OT DETAILS</div>
            <div className="side-subtitle">
              MANAGEMENT PORTAL
            </div>
          </div>
        </div>
      </div>

      <div className="nav-title">Workspace</div>

      <button
        className={
          'nav-btn ' +
          (page === 'dashboard' ? 'active' : '')
        }
        onClick={() => setPage('dashboard')}
      >
        <span className="nav-icon">⌂</span>
        <span>Dashboard</span>
      </button>

      <button
        className={
          'nav-btn ' +
          (page === 'staff' ? 'active' : '')
        }
        onClick={() => setPage('staff')}
      >
        <span className="nav-icon">♙</span>
        <span>Staff Details</span>
      </button>

      <button
        className={
          'nav-btn ' +
          (page === 'add' ? 'active' : '')
        }
        onClick={() => setPage('add')}
      >
        <span className="nav-icon">＋</span>
        <span>Add Employee</span>
      </button>

      <button
        className={
          'nav-btn ' +
          (page === 'ot' ? 'active' : '')
        }
        onClick={() => setPage('ot')}
      >
        <span className="nav-icon">▣</span>
        <span>OT Records</span>
      </button>

      <button
        className={
          'nav-btn ' +
          (page === 'admin' ? 'active' : '')
        }
        onClick={() => setPage('admin')}
      >
        <span className="nav-icon">⚙</span>
        <span>Admin Management</span>
      </button>

      <button
        className={
          'nav-btn ' +
          (page === 'password' ? 'active' : '')
        }
        onClick={() => setPage('password')}
      >
        <span className="nav-icon">⌁</span>
        <span>Change Password</span>
      </button>

      <div className="side-bottom">
        <button
          className="logout-btn"
          onClick={onLogout}
        >
          ⇥ &nbsp; Logout
        </button>
      </div>
    </aside>
  );
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loginMode, setLoginMode] =
    useState<'staff' | 'admin'>('staff');

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [page, setPage] =
    useState<Page>('dashboard');

  const [staff, setStaff] = useState<Staff[]>([]);
  const [admins, setAdmins] = useState<Staff[]>([]);
  const [otRecords, setOtRecords] =
    useState<OTEntry[]>([]);

  const [newEmployeeId, setNewEmployeeId] =
    useState('');
  const [newEmployeeName, setNewEmployeeName] =
    useState('');

  const [selectedStaff, setSelectedStaff] =
    useState('');
  const [selectedAdmin, setSelectedAdmin] =
    useState('');

  const [adminPassword, setAdminPassword] =
    useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] =
    useState('');

  const [oldPassword, setOldPassword] =
    useState('');
  const [newPassword, setNewPassword] =
    useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(SESSION_KEY);

      if (saved) {
        setSession(JSON.parse(saved));
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (session?.role === 'admin') {
      loadDashboardData();
    }
  }, [session]);

  async function adminRPC(
    functionName: string,
    params: Record<string, any>
  ) {
    return supabase.rpc(functionName, params);
  }

  /* LOGIN */

  async function login() {
    setMessage('');

    if (!employeeId.trim()) {
      setMessage(
        loginMode === 'staff'
          ? 'Employee ID is required'
          : 'Admin ID is required'
      );
      return;
    }

    if (loginMode === 'admin' && !password) {
      setMessage('Password is required');
      return;
    }

    setLoading(true);

    try {
      if (loginMode === 'admin') {
        const { data, error } =
          await adminRPC('admin_login', {
            p_employee_id: employeeId.trim(),
            p_password: password,
          });

        if (error) {
          setMessage(error.message);
          return;
        }

        if (!data?.success) {
          setMessage(
            data?.message || 'Admin login failed'
          );
          return;
        }

        const user = {
          id: data.staff_id,
          employee_id: data.employee_id,
          name: data.name,
          role: 'admin',
        };

        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify(user)
        );

        setSession(user);
        setEmployeeId('');
        setPassword('');
        setPage('dashboard');
      } else {
        /*
          STAFF LOGIN
          Employee ID only.
          Uses SECURITY DEFINER RPC so RLS
          does not block authorized staff.
        */

        const { data, error } =
          await adminRPC('staff_login', {
            p_employee_id: employeeId.trim(),
          });

        if (error) {
          setMessage(error.message);
          return;
        }

        if (!data?.success) {
          setMessage(
            data?.message || 'Staff ID not authorized'
          );
          return;
        }

        const staffUser = {
          id: data.staff_id,
          employee_id: data.employee_id,
          name: data.name,
          role: 'staff',
        };

        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify(staffUser)
        );

        setSession(staffUser);
        setEmployeeId('');
        setPassword('');
      }
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setLoginMode('staff');
    setPage('dashboard');
    setMessage('');
    setEmployeeId('');
    setPassword('');
  }

  /* ADMIN DATA */

  async function loadDashboardData() {
    if (!session?.employee_id) return;

    await loadStaff();
    await loadAdmins();
    await loadOT();
  }

  async function loadStaff() {
    const { data, error } =
      await adminRPC('admin_get_staff', {
        p_admin_employee_id:
          session.employee_id,
      });

    if (!error && data?.success) {
      const activeStaff = (data.staff || []).filter(
        (x: Staff) =>
          x.access_enabled === true &&
          x.role !== 'admin'
      );

      setStaff(activeStaff);
    }
  }

  async function loadAdmins() {
    const { data, error } =
      await adminRPC('admin_get_admins', {
        p_admin_employee_id:
          session.employee_id,
      });

    if (!error && data?.success) {
      setAdmins(data.admins || []);
    }
  }

  async function loadOT() {
    const { data, error } =
      await adminRPC('admin_get_all_ot', {
        p_admin_employee_id:
          session.employee_id,
      });

    if (!error && data?.success) {
      setOtRecords(
        data.records ||
          data.ot_records ||
          []
      );
    }
  }

  /* ADD EMPLOYEE */

  async function addEmployee() {
    setMessage('');

    if (
      !newEmployeeId.trim() ||
      !newEmployeeName.trim()
    ) {
      setMessage(
        'Employee ID and Name are required'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await adminRPC('admin_add_staff', {
          p_admin_employee_id:
            session.employee_id,
          p_employee_id:
            newEmployeeId.trim(),
          p_name:
            newEmployeeName.trim(),
        });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data?.success) {
        setMessage(
          data?.message ||
            'Unable to add employee'
        );
        return;
      }

      setMessage(
        data?.message ||
          'Employee added successfully'
      );

      setNewEmployeeId('');
      setNewEmployeeName('');

      /*
        Refresh staff list.
        New/re-activated employee is expected
        to have access_enabled = true.
      */
      await loadStaff();
    } finally {
      setLoading(false);
    }
  }

  /* REMOVE STAFF */

  async function removeStaff() {
    setMessage('');

    const selected = staff.find(
      (x) =>
        String(x.id) === selectedStaff
    );

    if (!selected) {
      setMessage(
        'Please select a staff member'
      );
      return;
    }

    const confirmed = window.confirm(
      'Remove ' +
        selected.name +
        ' (' +
        selected.employee_id +
        ')?'
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const { data, error } =
        await adminRPC(
          'admin_remove_staff',
          {
            p_admin_employee_id:
              session.employee_id,
            p_staff_id: selected.id,
          }
        );

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        data?.message ||
          'Staff removed successfully'
      );

      setSelectedStaff('');

      await loadStaff();
    } finally {
      setLoading(false);
    }
  }

  /* MAKE ADMIN */

  async function makeAdmin() {
    setMessage('');

    const selected = staff.find(
      (x) =>
        String(x.id) === selectedStaff
    );

    if (!selected) {
      setMessage(
        'Please select an employee'
      );
      return;
    }

    if (
      !adminPassword ||
      !adminConfirmPassword
    ) {
      setMessage(
        'Admin password and confirm password are required'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await adminRPC(
          'admin_make_admin',
          {
            p_admin_employee_id:
              session.employee_id,
            p_staff_id: selected.id,
            p_new_password:
              adminPassword,
            p_confirm_password:
              adminConfirmPassword,
          }
        );

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        data?.message ||
          'Employee is now an admin'
      );

      setSelectedStaff('');
      setAdminPassword('');
      setAdminConfirmPassword('');

      await loadStaff();
      await loadAdmins();
    } finally {
      setLoading(false);
    }
  }

  /* REMOVE ADMIN */

  async function removeAdmin() {
    setMessage('');

    const selected = admins.find(
      (x) =>
        String(x.id) === selectedAdmin
    );

    if (!selected) {
      setMessage(
        'Please select an admin'
      );
      return;
    }

    const confirmed = window.confirm(
      'Remove admin access from ' +
        selected.name +
        ' (' +
        selected.employee_id +
        ')?'
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const { data, error } =
        await adminRPC(
          'admin_remove_admin',
          {
            p_admin_employee_id:
              session.employee_id,
            p_target_admin_id:
              selected.id,
          }
        );

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        data?.message ||
          'Admin removed successfully'
      );

      setSelectedAdmin('');

      await loadAdmins();
      await loadStaff();
    } finally {
      setLoading(false);
    }
  }

  /* RESET ADMIN PASSWORD */

  async function resetAdminPassword() {
    setMessage('');

    if (!selectedAdmin) {
      setMessage(
        'Please select an admin'
      );
      return;
    }

    if (
      !adminPassword ||
      !adminConfirmPassword
    ) {
      setMessage(
        'New password and confirm password are required'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await adminRPC(
          'admin_reset_admin_password',
          {
            p_admin_employee_id:
              session.employee_id,
            p_target_admin_id:
              Number(selectedAdmin),
            p_new_password:
              adminPassword,
            p_confirm_password:
              adminConfirmPassword,
          }
        );

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        data?.message ||
          'Admin password reset successfully'
      );

      setAdminPassword('');
      setAdminConfirmPassword('');
    } finally {
      setLoading(false);
    }
  }

  /* CHANGE PASSWORD */

  async function changePassword() {
    setMessage('');

    if (!oldPassword) {
      setMessage(
        'Old password is required'
      );
      return;
    }

    if (!newPassword) {
      setMessage(
        'New password is required'
      );
      return;
    }

    if (!confirmPassword) {
      setMessage(
        'Confirm password is required'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await adminRPC(
          'admin_change_password',
          {
            p_admin_employee_id:
              session.employee_id,
            p_old_password:
              oldPassword,
            p_new_password:
              newPassword,
            p_confirm_password:
              confirmPassword,
          }
        );

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        data?.message ||
          'Password changed successfully'
      );

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  }

  /* OT FILTER */

  const filteredOT = useMemo(() => {
    return otRecords.filter((row) => {
      if (
        fromDate &&
        row.ot_date &&
        row.ot_date < fromDate
      ) {
        return false;
      }

      if (
        toDate &&
        row.ot_date &&
        row.ot_date > toDate
      ) {
        return false;
      }

      return true;
    });
  }, [
    otRecords,
    fromDate,
    toDate,
  ]);

  const totalHours = useMemo(() => {
    return filteredOT.reduce(
      (sum, row) =>
        sum + Number(row.ot_hours || 0),
      0
    );
  }, [filteredOT]);

  /* DOWNLOAD */

  function downloadCSV() {
    if (!filteredOT.length) {
      setMessage(
        'No OT records available'
      );
      return;
    }

    const headers = [
      'Employee ID',
      'Name',
      'OT Date',
      'Start Time',
      'End Time',
      'OT Hours',
      'Comp Off',
      'Status',
    ];

    const rows = filteredOT.map((r) => [
      r.employee_id || '',
      r.name || '',
      r.ot_date || '',
      r.start_time || '',
      r.end_time || '',
      r.ot_hours || '',
      r.comp_off ? 'Yes' : 'No',
      r.status || '',
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(
            (value) =>
              '"' +
              String(value).replace(
                /"/g,
                '""'
              ) +
              '"'
          )
          .join(',')
      )
      .join('\n');

    const blob = new Blob(
      [csv],
      {
        type:
          'text/csv;charset=utf-8;',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;
    link.download =
      'OT_Records.csv';

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  /* LOGIN SCREEN */

  if (!session) {
    return (
      <>
        <style>{css}</style>

        <div className="login-page">
          <div className="login-wrapper">

            <div className="login-brand">
              <div className="brand-logo">
                <div className="brand-mark">
                  OT
                </div>

                <h1 className="brand-title">
                  OT DETAILS
                </h1>

                <p className="brand-subtitle">
                  Centralized overtime and
                  employee management portal
                  for secure and efficient
                  workforce operations.
                </p>
              </div>

              <div className="brand-bottom">
                <div className="brand-line" />

                <div className="brand-small">
                  Secure Management Portal
                </div>
              </div>
            </div>

            <div className="login-form-area">
              <div className="login-form">

                <div className="login-heading">
                  <h2>
                    {loginMode === 'staff'
                      ? 'Staff Login'
                      : 'Admin Login'}
                  </h2>

                  <p>
                    {loginMode === 'staff'
                      ? 'Enter your Employee ID to continue'
                      : 'Authorized administrators only'}
                  </p>
                </div>

                {message && (
                  <div className="message">
                    {message}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    {loginMode === 'staff'
                      ? 'Employee ID'
                      : 'Admin ID'}
                  </label>

                  <input
                    className="form-input"
                    value={employeeId}
                    onChange={(e) =>
                      setEmployeeId(
                        e.target.value
                      )
                    }
                    placeholder={
                      loginMode === 'staff'
                        ? 'Enter Employee ID'
                        : 'Enter Admin ID'
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter'
                      ) {
                        login();
                      }
                    }}
                  />
                </div>

                {loginMode === 'admin' && (
                  <div className="form-group">
                    <label className="form-label">
                      Password
                    </label>

                    <input
                      className="form-input"
                      type="password"
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      placeholder="Enter password"
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter'
                        ) {
                          login();
                        }
                      }}
                    />
                  </div>
                )}

                <button
                  className="primary-btn"
                  onClick={login}
                  disabled={loading}
                >
                  {loading
                    ? 'Signing in...'
                    : loginMode === 'staff'
                    ? 'Login as Staff'
                    : 'Login as Admin'}
                </button>

                <div className="login-switch">
                  {loginMode === 'staff' ? (
                    <button
                      onClick={() => {
                        setLoginMode(
                          'admin'
                        );
                        setMessage('');
                        setEmployeeId('');
                        setPassword('');
                      }}
                    >
                      ⚙ &nbsp; Admin Login
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setLoginMode(
                          'staff'
                        );
                        setMessage('');
                        setEmployeeId('');
                        setPassword('');
                      }}
                    >
                      ← &nbsp; Back to Staff Login
                    </button>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      </>
    );
  }

  /* STAFF PORTAL */

  if (session.role !== 'admin') {
    return (
      <>
        <style>{css}</style>

        <div className="ot-app">
          <div className="app-layout">

            <aside className="sidebar">

              <div className="side-brand">
                <div className="side-brand-row">
                  <div className="side-mark">
                    OT
                  </div>

                  <div>
                    <div className="side-title">
                      OT DETAILS
                    </div>

                    <div className="side-subtitle">
                      STAFF PORTAL
                    </div>
                  </div>
                </div>
              </div>

              <div className="nav-title">
                Workspace
              </div>

              <button
                className="nav-btn active"
              >
                <span className="nav-icon">
                  ⌂
                </span>

                <span>
                  My Dashboard
                </span>
              </button>

              <button
                className="nav-btn"
                onClick={() =>
                  setMessage(
                    'Add OT module will be connected next.'
                  )
                }
              >
                <span className="nav-icon">
                  ＋
                </span>

                <span>
                  Add OT
                </span>
              </button>

              <button
                className="nav-btn"
                onClick={() =>
                  setMessage(
                    'My OT Records module will be connected next.'
                  )
                }
              >
                <span className="nav-icon">
                  ▣
                </span>

                <span>
                  My OT Records
                </span>
              </button>

              <div className="side-bottom">
                <button
                  className="logout-btn"
                  onClick={logout}
                >
                  ⇥ &nbsp; Logout
                </button>
              </div>

            </aside>

            <main className="main-area">

              <Header
                title="Staff Dashboard"
                session={session}
              />

              <div className="content">

                <div className="page-heading">
                  <h1>
                    Welcome, {session.name}
                  </h1>

                  <p>
                    Manage your overtime
                    information from one place.
                  </p>
                </div>

                {message && (
                  <div className="message">
                    {message}
                  </div>
                )}

                <div className="stats-grid">

                  <div className="stat-card">
                    <div className="stat-top">
                      <div className="stat-icon">
                        ◷
                      </div>
                    </div>

                    <div className="stat-label">
                      TOTAL OT HOURS
                    </div>

                    <div className="stat-value">
                      0.00
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <div className="stat-icon">
                        ▣
                      </div>
                    </div>

                    <div className="stat-label">
                      OT RECORDS
                    </div>

                    <div className="stat-value">
                      0
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <div className="stat-icon">
                        ✓
                      </div>
                    </div>

                    <div className="stat-label">
                      ACCOUNT STATUS
                    </div>

                    <div className="stat-value">
                      Active
                    </div>
                  </div>

                </div>

                <div className="section-title">
                  Quick Actions
                </div>

                <div className="feature-grid">

                  <div
                    className="feature-card"
                    onClick={() =>
                      setMessage(
                        'Add OT module will be connected next.'
                      )
                    }
                  >
                    <div className="feature-icon">
                      ＋
                    </div>

                    <div className="feature-title">
                      Add OT
                    </div>

                    <div className="feature-desc">
                      Submit your overtime
                      details.
                    </div>
                  </div>

                  <div
                    className="feature-card"
                    onClick={() =>
                      setMessage(
                        'My OT Records module will be connected next.'
                      )
                    }
                  >
                    <div className="feature-icon">
                      ▣
                    </div>

                    <div className="feature-title">
                      My OT Records
                    </div>

                    <div className="feature-desc">
                      View your previous
                      overtime records.
                    </div>
                  </div>

                </div>

              </div>
            </main>

          </div>
        </div>
      </>
    );
  }

  /* ADMIN PORTAL */

  return (
    <>
      <style>{css}</style>

      <div className="ot-app">
        <div className="app-layout">

          <Sidebar
            page={page}
            setPage={(p) => {
              setPage(p);
              setMessage('');
            }}
            onLogout={logout}
          />

          <main className="main-area">

            <Header
              title={
                page === 'dashboard'
                  ? 'Admin Dashboard'
                  : page === 'staff'
                  ? 'Staff Details'
                  : page === 'add'
                  ? 'Add Employee'
                  : page === 'ot'
                  ? 'OT Records'
                  : page === 'admin'
                  ? 'Admin Management'
                  : 'Change Password'
              }
              session={session}
            />

            <div className="content">

              {message && (
                <div className="message">
                  {message}
                </div>
              )}

              {/* DASHBOARD */}

              {page === 'dashboard' && (
                <>
                  <div className="page-heading">
                    <h1>
                      Good day, {session.name}
                    </h1>

                    <p>
                      Here is your OT DETAILS
                      overview.
                    </p>
                  </div>

                  <div className="stats-grid">

                    <div className="stat-card">
                      <div className="stat-top">
                        <div className="stat-icon">
                          ♙
                        </div>
                      </div>

                      <div className="stat-label">
                        ACTIVE STAFF
                      </div>

                      <div className="stat-value">
                        {
                          staff.filter(
                            (x) =>
                              x.access_enabled &&
                              x.role !== 'admin'
                          ).length
                        }
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-top">
                        <div className="stat-icon">
                          ▣
                        </div>
                      </div>

                      <div className="stat-label">
                        OT RECORDS
                      </div>

                      <div className="stat-value">
                        {otRecords.length}
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-top">
                        <div className="stat-icon">
                          ◷
                        </div>
                      </div>

                      <div className="stat-label">
                        TOTAL OT HOURS
                      </div>

                      <div className="stat-value">
                        {totalHours.toFixed(2)}
                      </div>
                    </div>

                  </div>

                  <div className="section-title">
                    Management
                  </div>

                  <div className="feature-grid">

                    <div
                      className="feature-card"
                      onClick={() =>
                        setPage('staff')
                      }
                    >
                      <div className="feature-icon">
                        ♙
                      </div>

                      <div className="feature-title">
                        Staff Details
                      </div>

                      <div className="feature-desc">
                        View active employees
                        and manage staff
                        access.
                      </div>
                    </div>

                    <div
                      className="feature-card"
                      onClick={() =>
                        setPage('add')
                      }
                    >
                      <div className="feature-icon">
                        ＋
                      </div>

                      <div className="feature-title">
                        Add Employee
                      </div>

                      <div className="feature-desc">
                        Create or reactivate
                        a staff account.
                      </div>
                    </div>

                    <div
                      className="feature-card"
                      onClick={() =>
                        setPage('ot')
                      }
                    >
                      <div className="feature-icon">
                        ▣
                      </div>

                      <div className="feature-title">
                        OT Records
                      </div>

                      <div className="feature-desc">
                        View, filter and
                        download overtime
                        records.
                      </div>
                    </div>

                    <div
                      className="feature-card"
                      onClick={() =>
                        setPage('admin')
                      }
                    >
                      <div className="feature-icon">
                        ⚙
                      </div>

                      <div className="feature-title">
                        Admin Management
                      </div>

                      <div className="feature-desc">
                        Manage administrators
                        and staff permissions.
                      </div>
                    </div>

                    <div
                      className="feature-card"
                      onClick={() =>
                        setPage('password')
                      }
                    >
                      <div className="feature-icon">
                        ⌁
                      </div>

                      <div className="feature-title">
                        Change Password
                      </div>

                      <div className="feature-desc">
                        Securely update your
                        admin password.
                      </div>
                    </div>

                    <div
                      className="feature-card"
                      onClick={logout}
                    >
                      <div className="feature-icon">
                        ⇥
                      </div>

                      <div className="feature-title">
                        Logout
                      </div>

                      <div className="feature-desc">
                        Sign out securely from
                        the management portal.
                      </div>
                    </div>

                  </div>
                </>
              )}

              {/* STAFF DETAILS */}

              {page === 'staff' && (
                <div className="panel">

                  <div className="panel-header">
                    <div className="panel-title">
                      Staff Details
                    </div>

                    <button
                      className="action-btn"
                      onClick={loadStaff}
                    >
                      ↻ Refresh
                    </button>
                  </div>

                  <div className="table-wrap">
                    <table className="data-table">

                      <thead>
                        <tr>
                          <th>
                            Employee ID
                          </th>

                          <th>
                            Name
                          </th>

                          <th>
                            Role
                          </th>

                          <th>
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>

                        {staff.map((s) => (
                          <tr key={s.id}>

                            <td>
                              <strong>
                                {s.employee_id}
                              </strong>
                            </td>

                            <td>
                              {s.name}
                            </td>

                            <td>
                              Staff
                            </td>

                            <td>
                              <span className="badge badge-active">
                                Active
                              </span>
                            </td>

                          </tr>
                        ))}

                        {!staff.length && (
                          <tr>
                            <td
                              colSpan={4}
                              style={{
                                textAlign:
                                  'center',
                                padding: 35,
                                color:
                                  '#8a94a6',
                              }}
                            >
                              No active staff
                              found.
                            </td>
                          </tr>
                        )}

                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* ADD EMPLOYEE */}

              {page === 'add' && (
                <div className="panel">

                  <div className="panel-header">
                    <div>
                      <div className="panel-title">
                        Add Employee
                      </div>

                      <div className="helper">
                        Add a new employee or
                        reactivate a previously
                        removed employee.
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">

                    <div className="form-group">
                      <label className="form-label">
                        Employee ID
                      </label>

                      <input
                        className="form-input"
                        value={newEmployeeId}
                        onChange={(e) =>
                          setNewEmployeeId(
                            e.target.value
                          )
                        }
                        placeholder="Enter Employee ID"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Employee Name
                      </label>

                      <input
                        className="form-input"
                        value={newEmployeeName}
                        onChange={(e) =>
                          setNewEmployeeName(
                            e.target.value
                          )
                        }
                        placeholder="Enter Employee Name"
                      />
                    </div>

                    <div className="form-full">
                      <button
                        className="action-btn"
                        onClick={addEmployee}
                        disabled={loading}
                      >
                        {loading
                          ? 'Adding...'
                          : '＋ Add Employee'}
                      </button>
                    </div>

                  </div>

                </div>
              )}

              {/* OT RECORDS */}

              {page === 'ot' && (
                <div className="panel">

                  <div className="panel-header">
                    <div>
                      <div className="panel-title">
                        OT Records
                      </div>

                      <div className="helper">
                        Filter and download
                        overtime records.
                      </div>
                    </div>

                    <button
                      className="action-btn"
                      onClick={downloadCSV}
                    >
                      ↓ Download CSV
                    </button>
                  </div>

                  <div className="form-grid">

                    <div className="form-group">
                      <label className="form-label">
                        From Date
                      </label>

                      <input
                        className="form-input"
                        type="date"
                        value={fromDate}
                        onChange={(e) =>
                          setFromDate(
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        To Date
                      </label>

                      <input
                        className="form-input"
                        type="date"
                        value={toDate}
                        onChange={(e) =>
                          setToDate(
                            e.target.value
                          )
                        }
                      />
                    </div>

                  </div>

                  <div
                    className="stats-grid"
                    style={{
                      marginTop: 20,
                    }}
                  >

                    <div className="stat-card">
                      <div className="stat-label">
                        FILTERED RECORDS
                      </div>

                      <div className="stat-value">
                        {filteredOT.length}
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-label">
                        OT HOURS
                      </div>

                      <div className="stat-value">
                        {totalHours.toFixed(
                          2
                        )}
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-label">
                        STATUS
                      </div>

                      <div className="stat-value">
                        Ready
                      </div>
                    </div>

                  </div>

                  <div className="table-wrap">
                    <table className="data-table">

                      <thead>
                        <tr>
                          <th>
                            Employee ID
                          </th>
                          <th>Name</th>
                          <th>Date</th>
                          <th>Start</th>
                          <th>End</th>
                          <th>Hours</th>
                          <th>
                            Comp Off
                          </th>
                        </tr>
                      </thead>

                      <tbody>

                        {filteredOT.map(
                          (r, i) => (
                            <tr
                              key={
                                r.id || i
                              }
                            >
                              <td>
                                {r.employee_id ||
                                  '-'}
                              </td>

                              <td>
                                {r.name ||
                                  '-'}
                              </td>

                              <td>
                                {r.ot_date ||
                                  '-'}
                              </td>

                              <td>
                                {r.start_time ||
                                  '-'}
                              </td>

                              <td>
                                {r.end_time ||
                                  '-'}
                              </td>

                              <td>
                                {Number(
                                  r.ot_hours ||
                                    0
                                ).toFixed(
                                  2
                                )}
                              </td>

                              <td>
                                {r.comp_off
                                  ? 'Yes'
                                  : 'No'}
                              </td>
                            </tr>
                          )
                        )}

                        {!filteredOT.length && (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                textAlign:
                                  'center',
                                padding: 35,
                                color:
                                  '#8a94a6',
                              }}
                            >
                              No OT records
                              found.
                            </td>
                          </tr>
                        )}

                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* ADMIN MANAGEMENT */}

              {page === 'admin' && (
                <div className="two-panel">

                  {/* MAKE ADMIN */}

                  <div className="panel">

                    <div className="panel-header">
                      <div>
                        <div className="panel-title">
                          Make Admin
                        </div>

                        <div className="helper">
                          Give admin access to
                          a staff member.
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Select Employee
                      </label>

                      <select
                        className="select-box"
                        value={
                          selectedStaff
                        }
                        onChange={(e) =>
                          setSelectedStaff(
                            e.target.value
                          )
                        }
                      >
                        <option value="">
                          Select employee
                        </option>

                        {staff
                          .filter(
                            (s) =>
                              s.role !==
                                'admin' &&
                              s.access_enabled
                          )
                          .map((s) => (
                            <option
                              key={s.id}
                              value={s.id}
                            >
                              {s.employee_id} -
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        New Admin Password
                      </label>

                      <input
                        className="form-input"
                        type="password"
                        value={
                          adminPassword
                        }
                        onChange={(e) =>
                          setAdminPassword(
                            e.target.value
                          )
                        }
                        placeholder="Minimum 6 characters"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Confirm Password
                      </label>

                      <input
                        className="form-input"
                        type="password"
                        value={
                          adminConfirmPassword
                        }
                        onChange={(e) =>
                          setAdminConfirmPassword(
                            e.target.value
                          )
                        }
                        placeholder="Confirm password"
                      />
                    </div>

                    <button
                      className="action-btn"
                      onClick={makeAdmin}
                      disabled={loading}
                    >
                      Make Admin
                    </button>

                  </div>

                  {/* REMOVE STAFF */}

                  <div className="panel">

                    <div className="panel-header">
                      <div>
                        <div className="panel-title">
                          Remove Staff
                        </div>

                        <div className="helper">
                          Remove staff from
                          active list while
                          preserving OT history.
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Select Staff
                      </label>

                      <select
                        className="select-box"
                        value={
                          selectedStaff
                        }
                        onChange={(e) =>
                          setSelectedStaff(
                            e.target.value
                          )
                        }
                      >
                        <option value="">
                          Select staff
                        </option>

                        {staff
                          .filter(
                            (s) =>
                              s.role !==
                                'admin' &&
                              s.access_enabled
                          )
                          .map((s) => (
                            <option
                              key={s.id}
                              value={s.id}
                            >
                              {s.employee_id} -
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <button
                      className="danger-btn"
                      onClick={removeStaff}
                      disabled={loading}
                    >
                      Remove Staff
                    </button>

                    <div className="helper">
                      After removal, the employee
                      will disappear from Staff
                      Details and can be added again
                      later using the same Employee ID.
                    </div>

                  </div>

                  {/* ADMIN ACCOUNTS */}

                  <div className="panel">

                    <div className="panel-header">
                      <div>
                        <div className="panel-title">
                          Admin Accounts
                        </div>

                        <div className="helper">
                          Main Admin SAS102 is
                          protected.
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Select Admin
                      </label>

                      <select
                        className="select-box"
                        value={
                          selectedAdmin
                        }
                        onChange={(e) =>
                          setSelectedAdmin(
                            e.target.value
                          )
                        }
                      >
                        <option value="">
                          Select admin
                        </option>

                        {admins.map((a) => (
                          <option
                            key={a.id}
                            value={a.id}
                          >
                            {a.employee_id} -
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      className="danger-btn"
                      onClick={removeAdmin}
                      disabled={loading}
                    >
                      Remove Admin
                    </button>

                  </div>

                  {/* RESET ADMIN PASSWORD */}

                  <div className="panel">

                    <div className="panel-header">
                      <div>
                        <div className="panel-title">
                          Reset Admin Password
                        </div>

                        <div className="helper">
                          Reset the password of
                          an existing admin.
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Select Admin
                      </label>

                      <select
                        className="select-box"
                        value={
                          selectedAdmin
                        }
                        onChange={(e) =>
                          setSelectedAdmin(
                            e.target.value
                          )
                        }
                      >
                        <option value="">
                          Select admin
                        </option>

                        {admins.map((a) => (
                          <option
                            key={a.id}
                            value={a.id}
                          >
                            {a.employee_id} -
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        New Password
                      </label>

                      <input
                        className="form-input"
                        type="password"
                        value={
                          adminPassword
                        }
                        onChange={(e) =>
                          setAdminPassword(
                            e.target.value
                          )
                        }
                        placeholder="New password"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Confirm Password
                      </label>

                      <input
                        className="form-input"
                        type="password"
                        value={
                          adminConfirmPassword
                        }
                        onChange={(e) =>
                          setAdminConfirmPassword(
                            e.target.value
                          )
                        }
                        placeholder="Confirm password"
                      />
                    </div>

                    <button
                      className="action-btn"
                      onClick={
                        resetAdminPassword
                      }
                      disabled={loading}
                    >
                      Reset Password
                    </button>

                  </div>

                </div>
              )}

              {/* CHANGE PASSWORD */}

              {page === 'password' && (
                <div
                  className="panel"
                  style={{
                    maxWidth: 650,
                  }}
                >

                  <div className="panel-header">
                    <div>
                      <div className="panel-title">
                        Change My Password
                      </div>

                      <div className="helper">
                        Enter your current
                        password before
                        creating a new one.
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Old Password
                    </label>

                    <input
                      className="form-input"
                      type="password"
                      value={oldPassword}
                      onChange={(e) =>
                        setOldPassword(
                          e.target.value
                        )
                      }
                      placeholder="Enter old password"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      New Password
                    </label>

                    <input
                      className="form-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(
                          e.target.value
                        )
                      }
                      placeholder="Minimum 6 characters"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Confirm New Password
                    </label>

                    <input
                      className="form-input"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(
                          e.target.value
                        )
                      }
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    className="action-btn"
                    onClick={changePassword}
                    disabled={loading}
                  >
                    {loading
                      ? 'Updating...'
                      : 'Update Password'}
                  </button>

                </div>
              )}

            </div>
          </main>

        </div>
      </div>
    </>
  );
}
