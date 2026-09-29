'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
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
  staff_id?: number;
  employee_id?: string;
  name?: string;
  ot_date?: string;
  start_time?: string;
  end_time?: string;
  ot_hours?: number;
  reason?: string;
  comp_off_date?: string | null;
  comp_off_status?: string | null;
};

type Page =
  | 'dashboard'
  | 'staff'
  | 'add'
  | 'ot'
  | 'admin'
  | 'password'
  | 'profile';

type StaffPage =
  | 'dashboard'
  | 'add'
  | 'ot'
  | 'profile';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const MAIN_ADMIN_ID = 'SAS102';
const SESSION_KEY = 'ot_details_session';
const LOGIN_BRAND_NAME_KEY = 'ot_login_brand_name';
const LOGIN_BRAND_PHOTO_KEY = 'ot_login_brand_photo';

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
  min-width: 900px;
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

.comp-off-btn {
  cursor: pointer;
  position: relative;
  z-index: 2;
  height: 36px;
  padding: 0 13px;
  border: 0;
  border-radius: 8px;
  background: #1455b8;
  color: white;
  font-weight: 700;
  font-size: 12px;
}

.comp-off-btn:hover {
  background: #10499f;
}

.comp-off-date {
  color: #1754b6;
  font-weight: 800;
  white-space: nowrap;
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

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,.48);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-box {
  width: 100%;
  max-width: 450px;
  background: white;
  border-radius: 18px;
  padding: 25px;
  box-shadow: 0 25px 70px rgba(15,23,42,.25);
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.modal-actions .secondary-btn,
.modal-actions .action-btn {
  flex: 1;
  margin-top: 0;
}

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
          <div
            className="avatar"
            style={
              session?.profile_photo
                ? {
                    backgroundImage: `url(${session.profile_photo})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: 'transparent',
                  }
                : undefined
            }
          >
            {!session?.profile_photo &&
              (session?.name || session?.employee_id || 'A')
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
          (page === 'profile' ? 'active' : '')
        }
        onClick={() => setPage('profile')}
      >
        <span className="nav-icon">◉</span>
        <span>Profile</span>
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
  const [staffDirectory, setStaffDirectory] = useState<Staff[]>([]);
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

  /* COMP-OFF */

  const [compOffRow, setCompOffRow] =
    useState<OTEntry | null>(null);

  const [compOffDate, setCompOffDate] =
    useState('');

  const [savingCompOff, setSavingCompOff] =
    useState(false);

  /* STAFF PORTAL */

  const [staffPage, setStaffPage] =
    useState<StaffPage>('dashboard');

  const [staffOTRecords, setStaffOTRecords] =
    useState<OTEntry[]>([]);

  const [staffOTDate, setStaffOTDate] =
    useState('');
  const [staffOTStart, setStaffOTStart] =
    useState('');
  const [staffOTEnd, setStaffOTEnd] =
    useState('');
  const [staffOTReason, setStaffOTReason] =
    useState('');
  const [staffOTSaving, setStaffOTSaving] =
    useState(false);

  const [profilePhoto, setProfilePhoto] =
    useState('');
  const [profilePhotoSaving, setProfilePhotoSaving] =
    useState(false);

  /* LOGIN PAGE BRANDING */

  const [loginBrandName, setLoginBrandName] =
    useState('Ajeet Sharma');
  const [loginBrandPhoto, setLoginBrandPhoto] =
    useState('');
  const [loginBrandSaving, setLoginBrandSaving] =
    useState(false);

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
    try {
      const savedName =
        localStorage.getItem(LOGIN_BRAND_NAME_KEY);
      const savedPhoto =
        localStorage.getItem(LOGIN_BRAND_PHOTO_KEY);

      if (savedName) setLoginBrandName(savedName);
      if (savedPhoto) setLoginBrandPhoto(savedPhoto);
    } catch {
      // Keep default login branding if local storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!session?.employee_id) return;

    const savedPhoto =
      localStorage.getItem(
        `ot_profile_photo_${session.employee_id}`
      ) || '';

    setProfilePhoto(savedPhoto);

    const nextSession = {
      ...session,
      profile_photo: savedPhoto || undefined,
    };

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(nextSession)
    );
    setSession(nextSession);
  }, [session?.employee_id]);

  useEffect(() => {
    setCompOffRow(null);
    setCompOffDate('');

    if (session?.role === 'admin') {
      loadDashboardData();
    } else if (session?.role === 'staff') {
      loadStaffOT();
    }
  }, [session?.role, session?.employee_id]);

  async function adminRPC(
    functionName: string,
    params: Record<string, any>
  ) {
    return supabase.rpc(functionName, params);
  }

  /* LOGIN PAGE BRANDING */

  async function handleLoginBrandPhoto(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image size must be 5 MB or less');
      event.target.value = '';
      return;
    }

    setLoginBrandSaving(true);
    setMessage('');

    try {
      const reader = new FileReader();

      const compressed = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const max = 300;
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Unable to process image'));
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          };
          img.onerror = () => reject(new Error('Unable to read image'));
          img.src = String(reader.result);
        };
        reader.onerror = () => reject(new Error('Unable to read file'));
        reader.readAsDataURL(file);
      });

      setLoginBrandPhoto(compressed);
      localStorage.setItem(LOGIN_BRAND_PHOTO_KEY, compressed);
      setMessage('Login page photo updated successfully');
    } catch (error: any) {
      setMessage(error?.message || 'Unable to update login page photo');
    } finally {
      setLoginBrandSaving(false);
      event.target.value = '';
    }
  }

  function saveLoginBranding() {
    const name = loginBrandName.trim();
    if (!name) {
      setMessage('Please enter the owner name');
      return;
    }

    try {
      localStorage.setItem(LOGIN_BRAND_NAME_KEY, name);
      localStorage.setItem(LOGIN_BRAND_PHOTO_KEY, loginBrandPhoto || '');
      setLoginBrandName(name);
      setMessage('Login page profile updated successfully');
    } catch {
      setMessage('Unable to save login page profile on this browser');
    }
  }

  function resetLoginBranding() {
    localStorage.removeItem(LOGIN_BRAND_NAME_KEY);
    localStorage.removeItem(LOGIN_BRAND_PHOTO_KEY);
    setLoginBrandName('Ajeet Sharma');
    setLoginBrandPhoto('');
    setMessage('Login page profile reset successfully');
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
          profile_photo:
            localStorage.getItem(
              `ot_profile_photo_${data.employee_id}`
            ) || '',
        };

        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify(user)
        );

        setCompOffRow(null);
        setCompOffDate('');
        setSession(user);
        setEmployeeId('');
        setPassword('');
        setPage('dashboard');
      } else {
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
          profile_photo:
            localStorage.getItem(
              `ot_profile_photo_${data.employee_id}`
            ) || '',
        };

        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify(staffUser)
        );

        setCompOffRow(null);
        setCompOffDate('');
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
    setCompOffRow(null);
    setCompOffDate('');
    setSession(null);
    setLoginMode('staff');
    setPage('dashboard');
    setStaffPage('dashboard');
    setMessage('');
    setEmployeeId('');
    setPassword('');
  }

  function getDayName(date?: string) {
    if (!date) return '-';
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  function resolveStaffPerson(row: any, staffList: Staff[]) {
    const rowStaffId = row?.staff_id ?? row?.staffId ?? row?.staff?.id;
    const rowEmployeeId = row?.employee_id ?? row?.employeeId ?? row?.staff_employee_id ?? row?.staff?.employee_id;
    const rowName = row?.name ?? row?.staff_name ?? row?.employee_name ?? row?.staff?.name;

    // Match by database staff primary key first.
    if (rowStaffId != null && Array.isArray(staffList)) {
      const byId = staffList.find(
        (person) => String(person?.id ?? '').trim() === String(rowStaffId).trim()
      );
      if (byId) return byId;
    }

    // Then match by Employee ID. This also handles RPCs that already return employee_id.
    if (rowEmployeeId && Array.isArray(staffList)) {
      const target = String(rowEmployeeId).trim().toLowerCase();
      const byEmployeeId = staffList.find(
        (person) => String(person?.employee_id ?? '').trim().toLowerCase() === target
      );
      if (byEmployeeId) return byEmployeeId;
    }

    // If the OT RPC itself supplied a name/employee id, keep those values as a fallback.
    if (rowEmployeeId || rowName) {
      return {
        id: rowStaffId != null ? Number(rowStaffId) : undefined,
        employee_id: rowEmployeeId ? String(rowEmployeeId).trim() : '',
        name: rowName ? String(rowName).trim() : '',
        access_enabled: true,
        role: 'staff',
      } as Staff;
    }

    return undefined;
  }

  function normalizeOTRow(row: any, staffList: Staff[]): OTEntry {
    const person = resolveStaffPerson(row, staffList);
    const rawEmployeeId =
      row?.employee_id ?? row?.employeeId ?? row?.staff_employee_id ?? '';
    const rawName =
      row?.name ?? row?.staff_name ?? row?.employee_name ?? '';

    const employeeId =
      String(rawEmployeeId || '').trim() ||
      String(person?.employee_id || '').trim() ||
      '';

    const name =
      String(rawName || '').trim() ||
      String(person?.name || '').trim() ||
      '';

    const reason = String(
      row?.reason ?? row?.ot_reason ?? ''
    ).trim();

    return {
      ...row,
      staff_id: row?.staff_id ?? row?.staffId ?? person?.id,
      employee_id: employeeId,
      name,
      reason,
      comp_off_date: row?.comp_off_date || null,
      comp_off_status: row?.comp_off_date
        ? 'Taken'
        : (row?.comp_off_status || null),
    };
  }

  /* ADMIN DATA */

  async function loadDashboardData() {
    if (!session?.employee_id) return;

    const loadedStaff = await loadStaff();
    await loadAdmins();
    await loadOT(loadedStaff);
  }

  async function loadStaff(): Promise<Staff[]> {
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

      setStaffDirectory(data.staff || []);
      setStaff(activeStaff);
      return data.staff || [];
    }

    setStaff([]);
    return [];
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

  async function loadOT(staffList: Staff[] = staffDirectory) {
    if (!session?.employee_id) return;

    const { data: rpcData, error: rpcError } =
      await adminRPC('admin_get_all_ot', {
        p_admin_employee_id: session.employee_id,
      });

    const rpcRecords =
      !rpcError && rpcData?.success
        ? (Array.isArray(rpcData.records)
            ? rpcData.records
            : Array.isArray(rpcData.ot_records)
              ? rpcData.ot_records
              : [])
        : [];

    // Always keep the staff directory available for mapping OT staff_id -> employee_id/name.
    // The RPC result can have slightly different property names depending on the SQL version,
    // so normalize the staff list before mapping OT rows.
    const safeStaffList: Staff[] = Array.isArray(staffList)
      ? staffList
          .map((person: any) => ({
            id: Number(person?.id ?? person?.staff_id),
            employee_id: String(
              person?.employee_id ?? person?.employeeId ?? ''
            ).trim(),
            name: String(
              person?.name ?? person?.staff_name ?? person?.employee_name ?? ''
            ).trim(),
            access_enabled: person?.access_enabled !== false,
            role: String(person?.role ?? 'staff'),
          }))
          .filter((person) => Number.isFinite(person.id))
      : [];

    const { data: directRows, error: directError } =
      await supabase
        .from('ot_entries')
        .select('*')
        .order('ot_date', { ascending: false })
        .order('id', { ascending: false });

    // Prefer the real table because it contains the exact current
    // Comp-Off/Delete state. If RLS prevents direct reading, use the
    // admin RPC instead.
    if (!directError && Array.isArray(directRows)) {
      setOtRecords(
        directRows.map((row: any) =>
          normalizeOTRow(row, safeStaffList)
        )
      );
      return;
    }

    if (rpcRecords.length > 0) {
      setOtRecords(
        rpcRecords.map((row: any) =>
          normalizeOTRow(row, safeStaffList)
        )
      );
      return;
    }

    setOtRecords([]);
    setMessage(
      directError?.message ||
      rpcError?.message ||
      'Unable to load OT records'
    );
  }

  /* STAFF OT */

  function calculateHours(start: string, end: string) {
    if (!start || !end) return 0;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);

    let startMinutes = sh * 60 + sm;
    let endMinutes = eh * 60 + em;

    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    return Number(
      ((endMinutes - startMinutes) / 60).toFixed(2)
    );
  }

  async function loadStaffOT() {
    if (!session?.id || session?.role !== 'staff') return;

    const { data, error } = await supabase
      .from('ot_entries')
      .select('*')
      .eq('staff_id', session.id)
      .order('ot_date', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setStaffOTRecords(
      (data || []).map((row: any) =>
        normalizeOTRow(row, [
          {
            id: session.id,
            employee_id: session.employee_id,
            name: session.name,
            access_enabled: true,
            role: 'staff',
          },
        ])
      )
    );
  }

  async function saveStaffOT() {
    setMessage('');

    if (!session?.id) {
      setMessage('Staff session not found');
      return;
    }

    if (
      !staffOTDate ||
      !staffOTStart ||
      !staffOTEnd ||
      !staffOTReason.trim()
    ) {
      setMessage(
        'OT Date, Start Time, End Time and OT Reason are required'
      );
      return;
    }

    const hours = calculateHours(
      staffOTStart,
      staffOTEnd
    );

    if (hours <= 0) {
      setMessage(
        'End Time must be different from Start Time'
      );
      return;
    }

    setStaffOTSaving(true);

    try {
      const { error } = await supabase
        .from('ot_entries')
        .insert({
          staff_id: session.id,
          ot_date: staffOTDate,
          start_time: staffOTStart,
          end_time: staffOTEnd,
          ot_hours: hours,
          reason: staffOTReason.trim(),
          comp_off_date: null,
          comp_off_status: null,
        });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage('OT record added successfully');
      setStaffOTDate('');
      setStaffOTStart('');
      setStaffOTEnd('');
      setStaffOTReason('');

      await loadStaffOT();
      setStaffPage('ot');
    } finally {
      setStaffOTSaving(false);
    }
  }

  /* PROFILE PHOTO */

  async function handleProfilePhoto(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file || !session?.employee_id) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image size must be 5 MB or less');
      return;
    }

    setProfilePhotoSaving(true);
    setMessage('');

    try {
      const reader = new FileReader();

      const compressed = await new Promise<string>(
        (resolve, reject) => {
          reader.onload = () => {
            const img = new Image();

            img.onload = () => {
              const max = 300;
              const scale = Math.min(
                1,
                max / Math.max(img.width, img.height)
              );

              const canvas = document.createElement('canvas');
              canvas.width = Math.max(1, Math.round(img.width * scale));
              canvas.height = Math.max(1, Math.round(img.height * scale));

              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Unable to process image'));
                return;
              }

              ctx.drawImage(
                img,
                0,
                0,
                canvas.width,
                canvas.height
              );

              resolve(
                canvas.toDataURL('image/jpeg', 0.82)
              );
            };

            img.onerror = () =>
              reject(new Error('Unable to read image'));

            img.src = String(reader.result);
          };

          reader.onerror = () =>
            reject(new Error('Unable to read file'));

          reader.readAsDataURL(file);
        }
      );

      localStorage.setItem(
        `ot_profile_photo_${session.employee_id}`,
        compressed
      );

      const nextSession = {
        ...session,
        profile_photo: compressed,
      };

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(nextSession)
      );

      setSession(nextSession);
      setProfilePhoto(compressed);
      setMessage('Profile photo updated successfully');
    } catch (error: any) {
      setMessage(
        error?.message || 'Unable to update profile photo'
      );
    } finally {
      setProfilePhotoSaving(false);
      event.target.value = '';
    }
  }

  function removeProfilePhoto() {
    if (!session?.employee_id) return;

    localStorage.removeItem(
      `ot_profile_photo_${session.employee_id}`
    );

    const nextSession = {
      ...session,
      profile_photo: '',
    };

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(nextSession)
    );

    setSession(nextSession);
    setProfilePhoto('');
    setMessage('Profile photo removed');
  }

  const staffTotalHours = useMemo(
    () =>
      staffOTRecords.reduce(
        (sum, row) =>
          sum + Number(row.ot_hours || 0),
        0
      ),
    [staffOTRecords]
  );

  /* SAVE COMP-OFF */

  async function saveCompOff() {
    setMessage('');

    if (!compOffRow?.id) {
      setMessage('OT record ID not found');
      return;
    }

    if (!compOffDate) {
      setMessage('Please select Comp-Off date');
      return;
    }

    setSavingCompOff(true);

    try {
      const { error } = await supabase
        .from('ot_entries')
        .update({
          comp_off_date: compOffDate,
          comp_off_status: 'Taken',
        })
        .eq('id', compOffRow.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setCompOffRow(null);
      setCompOffDate('');

      if (session?.role === 'admin') {
        await loadOT();
      } else {
        await loadStaffOT();
      }

      setMessage('Comp-Off saved — Status: Comp-Off Taken');
    } finally {
      setSavingCompOff(false);
    }
  }

  /* DELETE OT */

  async function deleteOTEntry(row: OTEntry) {
    if (!row.id) {
      setMessage('OT record ID not found');
      return;
    }

    const confirmed = window.confirm(
      `Delete this OT entry${row.ot_date ? ` (${row.ot_date})` : ''}?\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setMessage('');

    try {
      let query = supabase
        .from('ot_entries')
        .delete()
        .eq('id', row.id);

      if (session?.role === 'staff' && session?.id) {
        query = query.eq('staff_id', session.id);
      }

      const { error } = await query;

      if (error) {
        setMessage(
          `Delete failed: ${error.message}`
        );
        return;
      }

      // Remove immediately from the visible list so the deleted row
      // disappears without waiting for another page refresh.
      if (session?.role === 'admin') {
        setOtRecords((current) =>
          current.filter((item) => item.id !== row.id)
        );
        await loadOT();
      } else {
        setStaffOTRecords((current) =>
          current.filter((item) => item.id !== row.id)
        );
        await loadStaffOT();
      }

      setMessage('OT entry deleted successfully');
    } catch (error: any) {
      setMessage(
        error?.message || 'Unable to delete OT entry'
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
      'Day',
      'OT Reason',
      'Status',
      'Comp-Off Date',
    ];

    const rows = filteredOT.map((r) => [
      r.employee_id || '',
      r.name || '',
      r.ot_date || '',
      r.start_time || '',
      r.end_time || '',
      r.ot_hours || '',
      getDayName(r.ot_date),
      r.reason || '',
      r.comp_off_date
        ? 'Comp-Off Taken'
        : 'Pending',
      r.comp_off_date || '',
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
                  A
                </div>

                <h1 className="brand-title">
                  AROVIA COLLECTIVE
                </h1>

                <p className="brand-subtitle">
                  Building smarter workplaces for a stronger tomorrow.
                  Technology-driven solutions for simpler and more efficient workforce operations.
                </p>
              </div>

              <div className="brand-bottom">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,.14)', border: '2px solid rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundImage: loginBrandPhoto ? `url(${loginBrandPhoto})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    {!loginBrandPhoto && (loginBrandName || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                      {loginBrandName || 'Ajeet Sharma'}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#cbd9ef', fontWeight: 700 }}>
                      Owner
                    </div>
                  </div>
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
                  <div className="side-mark">OT</div>
                  <div>
                    <div className="side-title">OT DETAILS</div>
                    <div className="side-subtitle">STAFF PORTAL</div>
                  </div>
                </div>
              </div>

              <div className="nav-title">Workspace</div>

              <button className={'nav-btn ' + (staffPage === 'dashboard' ? 'active' : '')} onClick={() => { setStaffPage('dashboard'); setMessage(''); }}>
                <span className="nav-icon">⌂</span><span>My Dashboard</span>
              </button>

              <button className={'nav-btn ' + (staffPage === 'add' ? 'active' : '')} onClick={() => { setStaffPage('add'); setMessage(''); }}>
                <span className="nav-icon">＋</span><span>Add OT</span>
              </button>

              <button className={'nav-btn ' + (staffPage === 'ot' ? 'active' : '')} onClick={() => { setStaffPage('ot'); setMessage(''); loadStaffOT(); }}>
                <span className="nav-icon">▣</span><span>My OT Records</span>
              </button>

              <button className={'nav-btn ' + (staffPage === 'profile' ? 'active' : '')} onClick={() => { setStaffPage('profile'); setMessage(''); }}>
                <span className="nav-icon">◉</span><span>Profile</span>
              </button>

              <div className="side-bottom">
                <button className="logout-btn" onClick={logout}>⇥ &nbsp; Logout</button>
              </div>

            </aside>

            <main className="main-area">
              <Header
                title={
                  staffPage === 'dashboard' ? 'Staff Dashboard' :
                  staffPage === 'add' ? 'Add OT' :
                  staffPage === 'ot' ? 'My OT Records' :
                  'My Profile'
                }
                session={session}
              />

              <div className="content">
                {message && <div className="message">{message}</div>}

                {staffPage === 'dashboard' && (
                  <>
                    <div className="page-heading">
                      <h1>Welcome, {session.name}</h1>
                      <p>Manage your overtime information from one place.</p>
                    </div>

                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-top"><div className="stat-icon">◷</div></div>
                        <div className="stat-label">TOTAL OT HOURS</div>
                        <div className="stat-value">{staffTotalHours.toFixed(2)}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-top"><div className="stat-icon">▣</div></div>
                        <div className="stat-label">OT RECORDS</div>
                        <div className="stat-value">{staffOTRecords.length}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-top"><div className="stat-icon">✓</div></div>
                        <div className="stat-label">ACCOUNT STATUS</div>
                        <div className="stat-value">Active</div>
                      </div>
                    </div>

                    <div className="section-title">Quick Actions</div>
                    <div className="feature-grid">
                      <div className="feature-card" onClick={() => { setStaffPage('add'); setMessage(''); }}>
                        <div className="feature-icon">＋</div>
                        <div className="feature-title">Add OT</div>
                        <div className="feature-desc">Submit your overtime details.</div>
                      </div>
                      <div className="feature-card" onClick={() => { setStaffPage('ot'); setMessage(''); loadStaffOT(); }}>
                        <div className="feature-icon">▣</div>
                        <div className="feature-title">My OT Records</div>
                        <div className="feature-desc">View your previous overtime records.</div>
                      </div>
                      <div className="feature-card" onClick={() => { setStaffPage('profile'); setMessage(''); }}>
                        <div className="feature-icon">◉</div>
                        <div className="feature-title">My Profile</div>
                        <div className="feature-desc">Change your profile photo.</div>
                      </div>
                    </div>
                  </>
                )}

                {staffPage === 'add' && (
                  <div className="panel" style={{ maxWidth: 850 }}>
                    <div className="panel-header">
                      <div>
                        <div className="panel-title">Add OT</div>
                        <div className="helper">Enter your overtime details. OT hours are calculated automatically.</div>
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">OT Date</label>
                        <input className="form-input" type="date" value={staffOTDate} onChange={(e) => setStaffOTDate(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Day</label>
                        <input
                          className="form-input"
                          value={getDayName(staffOTDate)}
                          readOnly
                          placeholder="Select OT date"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">OT Hours</label>
                        <input className="form-input" value={calculateHours(staffOTStart, staffOTEnd).toFixed(2)} readOnly />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Start Time</label>
                        <input className="form-input" type="time" value={staffOTStart} onChange={(e) => setStaffOTStart(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">End Time</label>
                        <input className="form-input" type="time" value={staffOTEnd} onChange={(e) => setStaffOTEnd(e.target.value)} />
                      </div>
                      <div className="form-group form-full">
                        <label className="form-label">OT Reason</label>
                        <input className="form-input" value={staffOTReason} onChange={(e) => setStaffOTReason(e.target.value)} placeholder="Enter OT reason" />
                      </div>
                    </div>

                    <button className="action-btn" onClick={saveStaffOT} disabled={staffOTSaving} style={{ marginTop: 8 }}>
                      {staffOTSaving ? 'Saving...' : 'Save OT'}
                    </button>
                  </div>
                )}

                {staffPage === 'ot' && (
                  <div className="panel">
                    <div className="panel-header">
                      <div>
                        <div className="panel-title">My OT Records</div>
                        <div className="helper">View your overtime and assign Comp-Off date.</div>
                      </div>
                      <button className="action-btn" onClick={loadStaffOT}>↻ Refresh</button>
                    </div>

                    <div className="stats-grid" style={{ marginBottom: 20 }}>
                      <div className="stat-card"><div className="stat-label">TOTAL RECORDS</div><div className="stat-value">{staffOTRecords.length}</div></div>
                      <div className="stat-card"><div className="stat-label">TOTAL OT HOURS</div><div className="stat-value">{staffTotalHours.toFixed(2)}</div></div>
                      <div className="stat-card"><div className="stat-label">COMP-OFF TAKEN</div><div className="stat-value">{staffOTRecords.filter((r) => !!r.comp_off_date).length}</div></div>
                    </div>

                    <div className="table-wrap">
                      <table className="data-table">
                        <thead><tr>
                          <th>Date</th><th>Start</th><th>End</th><th>Hours</th><th style={{ minWidth: 95, whiteSpace: 'nowrap' }}>Day</th><th>OT Reason</th><th>Comp-Off Date</th><th>Status</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                          {staffOTRecords.map((r, i) => (
                            <tr key={r.id || i}>
                              <td>{r.ot_date || '-'}</td>
                              <td>{r.start_time || '-'}</td>
                              <td>{r.end_time || '-'}</td>
                              <td>{Number(r.ot_hours || 0).toFixed(2)}</td>
                              <td style={{ minWidth: 95, whiteSpace: 'nowrap', fontWeight: 700 }}>{getDayName(r.ot_date)}</td>
                              <td>{r.reason || '-'}</td>
                              <td>{r.comp_off_date ? <span className="comp-off-date">{r.comp_off_date}</span> : '-'}</td>
                              <td>{r.comp_off_date ? <span className="badge badge-active">Comp-Off Taken</span> : <span className="badge badge-off">Pending</span>}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <button className="comp-off-btn" onClick={() => {
                                    setCompOffRow({ ...r, employee_id: session.employee_id, name: session.name });
                                    setCompOffDate(r.comp_off_date || '');
                                    setMessage('');
                                  }}>
                                    {r.comp_off_date ? 'Change' : 'Comp-Off'}
                                  </button>
                                  <button
                                    className="secondary-btn"
                                    onClick={() => deleteOTEntry(r)}
                                    style={{ color: '#c62828', borderColor: '#f0caca' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!staffOTRecords.length && (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 35, color: '#8a94a6' }}>No OT records found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {staffPage === 'profile' && (
                  <div className="panel" style={{ maxWidth: 650 }}>
                    <div className="panel-header">
                      <div>
                        <div className="panel-title">My Profile</div>
                        <div className="helper">Update your profile photo. It will remain after logout and login on this browser.</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 25 }}>
                      <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#eaf1ff', color: '#1455b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, overflow: 'hidden', backgroundImage: profilePhoto ? `url(${profilePhoto})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        {!profilePhoto && (session.name || session.employee_id || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>{session.name}</div>
                        <div className="helper">{session.employee_id} · Staff</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Profile Photo</label>
                      <input className="form-input" type="file" accept="image/*" onChange={handleProfilePhoto} disabled={profilePhotoSaving} />
                      <div className="helper">JPG, PNG or other image. Maximum 5 MB.</div>
                    </div>

                    {profilePhoto && (
                      <button className="danger-btn" onClick={removeProfilePhoto} disabled={profilePhotoSaving}>Remove Profile Photo</button>
                    )}
                  </div>
                )}

              </div>
            </main>

          </div>
        </div>

        {/* STAFF COMP-OFF MODAL */}
        {compOffRow && (
          <div
            className="modal-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setCompOffRow(null);
                setCompOffDate('');
              }
            }}
          >
            <div className="modal-box" onMouseDown={(e) => e.stopPropagation()}>
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    {compOffRow.comp_off_date ? 'Change Comp-Off' : 'Add Comp-Off'}
                  </div>
                  <div className="helper">
                    {session.employee_id} - {session.name}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Comp-Off Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={compOffDate}
                  onChange={(e) => setCompOffDate(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setCompOffRow(null);
                    setCompOffDate('');
                  }}
                  disabled={savingCompOff}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={saveCompOff}
                  disabled={savingCompOff || !compOffDate}
                >
                  {savingCompOff ? 'Saving...' : 'Save Comp-Off'}
                </button>
              </div>
            </div>
          </div>
        )}
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
                  : page === 'profile'
                  ? 'My Profile'
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
                      onClick={() =>
                        setPage('profile')
                      }
                    >
                      <div className="feature-icon">
                        ◉
                      </div>
                      <div className="feature-title">
                        My Profile
                      </div>
                      <div className="feature-desc">
                        Change your profile
                        photo.
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

                          <th>
                            Name
                          </th>

                          <th>
                            Date
                          </th>

                          <th>
                            Start
                          </th>

                          <th>
                            End
                          </th>

                          <th>
                            Hours
                          </th>

                          <th style={{ minWidth: 95, whiteSpace: 'nowrap' }}>
                            Day
                          </th>

                          <th>
                            OT Reason
                          </th>

                          <th>
                            Comp-Off Date
                          </th>

                          <th>
                            Status
                          </th>

                          <th>
                            Actions
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

                              <td style={{ minWidth: 95, whiteSpace: 'nowrap', fontWeight: 700 }}>
                                {getDayName(r.ot_date)}
                              </td>

                              <td>
                                {r.reason ||
                                  '-'}
                              </td>

                              <td>
                                {r.comp_off_date || '-'}
                              </td>

                              <td>
                                {r.comp_off_date ? (
                                  <span className="badge badge-active">
                                    Comp-Off Taken
                                  </span>
                                ) : (
                                  <span className="badge badge-off">
                                    Pending
                                  </span>
                                )}
                              </td>

                              <td>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <button
                                    className="comp-off-btn"
                                    onClick={() => {
                                      setCompOffRow(r);
                                      setCompOffDate(r.comp_off_date || '');
                                      setMessage('');
                                    }}
                                  >
                                    {r.comp_off_date ? 'Change' : 'Comp-Off'}
                                  </button>

                                  <button
                                    className="secondary-btn"
                                    onClick={() => deleteOTEntry(r)}
                                    style={{ color: '#c62828', borderColor: '#f0caca' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>

                            </tr>
                          )
                        )}

                        {!filteredOT.length && (
                          <tr>
                            <td
                              colSpan={11}
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

                  <div className="panel" style={{ gridColumn: '1 / -1' }}>
                    <div className="panel-header">
                      <div>
                        <div className="panel-title">
                          Login Page Profile
                        </div>
                        <div className="helper">
                          Set the name and photo shown at the bottom-left of the Staff/Admin login screen.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
                      <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', background: '#eaf1ff', color: '#1455b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, border: '3px solid #d8e5ff', backgroundImage: loginBrandPhoto ? `url(${loginBrandPhoto})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        {!loginBrandPhoto && (loginBrandName || 'A').charAt(0).toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div className="form-group">
                          <label className="form-label">Owner Name</label>
                          <input
                            className="form-input"
                            value={loginBrandName}
                            onChange={(e) => setLoginBrandName(e.target.value)}
                            placeholder="Enter owner name"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Owner Photo</label>
                          <input
                            className="form-input"
                            type="file"
                            accept="image/*"
                            onChange={handleLoginBrandPhoto}
                            disabled={loginBrandSaving}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button
                            className="action-btn"
                            onClick={saveLoginBranding}
                            disabled={loginBrandSaving}
                          >
                            {loginBrandSaving ? 'Saving...' : 'Save Login Profile'}
                          </button>

                          <button
                            className="danger-btn"
                            onClick={resetLoginBranding}
                            disabled={loginBrandSaving}
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* PROFILE */}

              {page === 'profile' && (
                <div
                  className="panel"
                  style={{ maxWidth: 650 }}
                >
                  <div className="panel-header">
                    <div>
                      <div className="panel-title">
                        My Profile
                      </div>
                      <div className="helper">
                        Update your profile photo. It will remain after logout and login on this browser.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 25 }}>
                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#eaf1ff', color: '#1455b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, overflow: 'hidden', backgroundImage: profilePhoto ? `url(${profilePhoto})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      {!profilePhoto && (session.name || session.employee_id || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{session.name}</div>
                      <div className="helper">{session.employee_id} · Administrator</div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Profile Photo</label>
                    <input className="form-input" type="file" accept="image/*" onChange={handleProfilePhoto} disabled={profilePhotoSaving} />
                    <div className="helper">JPG, PNG or other image. Maximum 5 MB.</div>
                  </div>

                  {profilePhoto && (
                    <button className="danger-btn" onClick={removeProfilePhoto} disabled={profilePhotoSaving}>Remove Profile Photo</button>
                  )}
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

      {/* COMP-OFF MODAL */}

      {compOffRow && (
        <div className="modal-overlay">

          <div className="modal-box">

            <div className="panel-header">

              <div>
                <div className="panel-title">
                  Add Comp-Off
                </div>

                <div className="helper">
                  {compOffRow.employee_id || '-'}
                  {' - '}
                  {compOffRow.name || '-'}
                </div>
              </div>

            </div>

            <div className="form-group">

              <label className="form-label">
                Comp-Off Date
              </label>

              <input
                className="form-input"
                type="date"
                value={compOffDate}
                onChange={(e) =>
                  setCompOffDate(
                    e.target.value
                  )
                }
              />

            </div>

            <div className="modal-actions">

              <button
                className="secondary-btn"
                onClick={() => {
                  setCompOffRow(null);
                  setCompOffDate('');
                }}
                disabled={savingCompOff}
              >
                Cancel
              </button>

              <button
                className="action-btn"
                onClick={saveCompOff}
                disabled={
                  savingCompOff ||
                  !compOffDate
                }
              >
                {savingCompOff
                  ? 'Saving...'
                  : 'Save Comp-Off'}
              </button>

            </div>

          </div>

        </div>
      )}

    </>
  );
}
