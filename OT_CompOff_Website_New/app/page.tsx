'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

type Session = {
  id: number;
  employee_id: string;
  name: string;
  role: 'staff' | 'admin';
};

type Staff = {
  id: number;
  employee_id: string;
  name: string;
  access_enabled: boolean;
  role: string;
};

type Admin = {
  id?: number;
  employee_id: string;
  name?: string;
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
  | 'password';

function calculateHours(start: string, end: string) {
  if (!start || !end) return 0;

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return Number(((endMinutes - startMinutes) / 60).toFixed(2));
}

function formatTime(value?: string) {
  if (!value) return '-';
  return value.substring(0, 5);
}

function Header({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <div>
        <div className="brand">OT & Comp-Off</div>
        <div className="subbrand">Staff & Operations Management</div>
      </div>

      <div className="user-area">
        <div className="user-info">
          <strong>{session.name}</strong>
          <span>{session.employee_id}</span>
        </div>

        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

function Sidebar({
  session,
  page,
  setPage,
}: {
  session: Session;
  page: Page;
  setPage: (p: Page) => void;
}) {
  if (session.role === 'staff') {
    return (
      <aside className="sidebar">
        <div className="side-title">STAFF PORTAL</div>

        <button
          className={page === 'dashboard' ? 'side-btn active' : 'side-btn'}
          onClick={() => setPage('dashboard')}
        >
          Dashboard
        </button>

        <button
          className={page === 'add' ? 'side-btn active' : 'side-btn'}
          onClick={() => setPage('add')}
        >
          Add OT
        </button>

        <button
          className={page === 'ot' ? 'side-btn active' : 'side-btn'}
          onClick={() => setPage('ot')}
        >
          My OT Records
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="side-title">ADMIN PANEL</div>

      <button
        className={page === 'dashboard' ? 'side-btn active' : 'side-btn'}
        onClick={() => setPage('dashboard')}
      >
        Dashboard
      </button>

      <button
        className={page === 'staff' ? 'side-btn active' : 'side-btn'}
        onClick={() => setPage('staff')}
      >
        Staff Management
      </button>

      <button
        className={page === 'ot' ? 'side-btn active' : 'side-btn'}
        onClick={() => setPage('ot')}
      >
        OT Records
      </button>

      <button
        className={page === 'admin' ? 'side-btn active' : 'side-btn'}
        onClick={() => setPage('admin')}
      >
        Admin Management
      </button>

      <button
        className={page === 'password' ? 'side-btn active' : 'side-btn'}
        onClick={() => setPage('password')}
      >
        Change Password
      </button>
    </aside>
  );
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);

  const [loginMode, setLoginMode] =
    useState<'staff' | 'admin'>('staff');

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [page, setPage] = useState<Page>('dashboard');

  const [staff, setStaff] = useState<Staff[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [otRecords, setOtRecords] = useState<OTEntry[]>([]);
  const [staffOTRecords, setStaffOTRecords] = useState<OTEntry[]>([]);

  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] =
    useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  /* STAFF OT FORM */
  const [staffOTDate, setStaffOTDate] = useState('');
  const [staffOTStart, setStaffOTStart] = useState('');
  const [staffOTEnd, setStaffOTEnd] = useState('');
  const [staffOTReason, setStaffOTReason] = useState('');
  const [staffOTSaving, setStaffOTSaving] = useState(false);

  /* COMP OFF */
  const [compOffRow, setCompOffRow] =
    useState<OTEntry | null>(null);
  const [compOffDate, setCompOffDate] = useState('');
  const [savingCompOff, setSavingCompOff] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ot_details_session');

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);
      } catch {
        localStorage.removeItem('ot_details_session');
      }
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    if (session.role === 'admin') {
      loadDashboardData();
    } else {
      loadStaffOT();
    }
  }, [session]);

  async function handleLogin() {
    setMessage('');

    if (!employeeId.trim()) {
      setMessage('Please enter Employee ID');
      return;
    }

    if (loginMode === 'admin' && !password) {
      setMessage('Please enter password');
      return;
    }

    setLoading(true);

    try {
      if (loginMode === 'admin') {
        const { data, error } = await supabase.rpc(
          'admin_login',
          {
            p_employee_id: employeeId.trim(),
            p_password: password,
          }
        );

        if (error) {
          setMessage(error.message);
          return;
        }

        if (!data?.success) {
          setMessage(data?.message || 'Invalid Admin ID or password');
          return;
        }

        const newSession: Session = {
          id: data.admin_id || data.id,
          employee_id: data.employee_id,
          name: data.name || 'Administrator',
          role: 'admin',
        };

        localStorage.setItem(
          'ot_details_session',
          JSON.stringify(newSession)
        );

        setSession(newSession);
        setEmployeeId('');
        setPassword('');
      } else {
        const { data, error } = await supabase.rpc(
          'staff_login',
          {
            p_employee_id: employeeId.trim(),
          }
        );

        if (error) {
          setMessage(error.message);
          return;
        }

        if (!data?.success) {
          setMessage(data?.message || 'Employee ID not found');
          return;
        }

        const newSession: Session = {
          id: data.staff_id || data.id,
          employee_id: data.employee_id,
          name: data.name,
          role: 'staff',
        };

        localStorage.setItem(
          'ot_details_session',
          JSON.stringify(newSession)
        );

        setSession(newSession);
        setEmployeeId('');
        setPassword('');
      }
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('ot_details_session');
    setSession(null);
    setPage('dashboard');
    setMessage('');
    setOtRecords([]);
    setStaffOTRecords([]);
  }

  async function adminRPC(
    functionName: string,
    params: Record<string, any>
  ) {
    return supabase.rpc(functionName, params);
  }

  async function loadDashboardData() {
    if (!session?.employee_id) return;

    await Promise.all([
      loadStaff(),
      loadAdmins(),
      loadOT(),
    ]);
  }

  async function loadStaff() {
    if (!session?.employee_id) return;

    const { data, error } = await adminRPC(
      'admin_get_staff',
      {
        p_admin_employee_id: session.employee_id,
      }
    );

    if (!error && data?.success) {
      setStaff(data.staff || data.records || []);
    }
  }

  async function loadAdmins() {
    if (!session?.employee_id) return;

    const { data, error } = await adminRPC(
      'admin_get_admins',
      {
        p_admin_employee_id: session.employee_id,
      }
    );

    if (!error && data?.success) {
      setAdmins(data.admins || data.records || []);
    }
  }

  async function loadOT() {
    if (!session?.employee_id) return;

    const { data, error } = await adminRPC(
      'admin_get_all_ot',
      {
        p_admin_employee_id: session.employee_id,
      }
    );

    if (!error && data?.success) {
      setOtRecords(
        data.records ||
          data.ot_records ||
          data.data ||
          []
      );
    } else if (error) {
      setMessage(error.message);
    }
  }

  async function loadStaffOT() {
    if (!session?.id) return;

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

    setStaffOTRecords(data || []);
  }

  async function saveStaffOT() {
    setMessage('');

    if (!session?.id) {
      setMessage('Session expired. Please login again.');
      return;
    }

    if (!staffOTDate) {
      setMessage('Please select OT Date');
      return;
    }

    if (!staffOTStart || !staffOTEnd) {
      setMessage('Please select Start Time and End Time');
      return;
    }

    if (!staffOTReason.trim()) {
      setMessage('Please enter OT Reason');
      return;
    }

    const hours = calculateHours(
      staffOTStart,
      staffOTEnd
    );

    if (hours <= 0) {
      setMessage('OT Hours must be greater than 0');
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

      setStaffOTDate('');
      setStaffOTStart('');
      setStaffOTEnd('');
      setStaffOTReason('');

      setMessage('OT added successfully');

      await loadStaffOT();
      setPage('ot');
    } finally {
      setStaffOTSaving(false);
    }
  }

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
          comp_off_status: 'Comp-Off Taken',
        })
        .eq('id', compOffRow.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      setCompOffRow(null);
      setCompOffDate('');

      setMessage('Comp-Off date saved successfully');

      await loadOT();
    } finally {
      setSavingCompOff(false);
    }
  }

  async function addStaff() {
    setMessage('');

    if (!session?.employee_id) return;

    if (!newEmployeeId.trim() || !newEmployeeName.trim()) {
      setMessage('Enter Employee ID and Name');
      return;
    }

    const { data, error } = await adminRPC(
      'admin_add_staff',
      {
        p_admin_employee_id: session.employee_id,
        p_employee_id: newEmployeeId.trim(),
        p_name: newEmployeeName.trim(),
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data?.success) {
      setMessage(data?.message || 'Unable to add staff');
      return;
    }

    setNewEmployeeId('');
    setNewEmployeeName('');
    setMessage('Staff added successfully');

    await loadStaff();
  }

  async function removeStaff(row: Staff) {
    if (!session?.employee_id) return;

    const ok = window.confirm(
      `Remove ${row.name} (${row.employee_id})?`
    );

    if (!ok) return;

    const { data, error } = await adminRPC(
      'admin_remove_staff',
      {
        p_admin_employee_id: session.employee_id,
        p_staff_id: row.id,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data?.success) {
      setMessage(data?.message || 'Unable to remove staff');
      return;
    }

    setMessage('Staff removed successfully');
    await loadStaff();
  }

  async function makeAdmin(row: Staff) {
    if (!session?.employee_id) return;

    const ok = window.confirm(
      `Make ${row.name} (${row.employee_id}) an Admin?`
    );

    if (!ok) return;

    const { data, error } = await adminRPC(
      'admin_make_admin',
      {
        p_admin_employee_id: session.employee_id,
        p_staff_id: row.id,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data?.success) {
      setMessage(data?.message || 'Unable to make admin');
      return;
    }

    setMessage('Admin created successfully');

    await Promise.all([
      loadStaff(),
      loadAdmins(),
    ]);
  }

  async function removeAdmin(row: Admin) {
    if (!session?.employee_id) return;

    if (row.employee_id === session.employee_id) {
      setMessage('You cannot remove your own admin account.');
      return;
    }

    const ok = window.confirm(
      `Remove admin ${row.employee_id}?`
    );

    if (!ok) return;

    const { data, error } = await adminRPC(
      'admin_remove_admin',
      {
        p_admin_employee_id: session.employee_id,
        p_employee_id: row.employee_id,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data?.success) {
      setMessage(data?.message || 'Unable to remove admin');
      return;
    }

    setMessage('Admin removed successfully');
    await loadAdmins();
  }

  async function resetAdminPassword(row: Admin) {
    if (!session?.employee_id) return;

    const newPass = window.prompt(
      `Enter new password for ${row.employee_id}:`
    );

    if (!newPass) return;

    if (newPass.length < 4) {
      setMessage('Password must be at least 4 characters');
      return;
    }

    const { data, error } = await adminRPC(
      'admin_reset_admin_password',
      {
        p_admin_employee_id: session.employee_id,
        p_target_employee_id: row.employee_id,
        p_new_password: newPass,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data?.success) {
      setMessage(
        data?.message || 'Unable to reset password'
      );
      return;
    }

    setMessage('Admin password reset successfully');
  }

  async function changeOwnPassword() {
    setMessage('');

    if (!session?.employee_id) return;

    if (!oldPassword) {
      setMessage('Enter old password');
      return;
    }

    if (!newPassword) {
      setMessage('Enter new password');
      return;
    }

    if (newPassword.length < 4) {
      setMessage('New password must be at least 4 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    const { data, error } = await adminRPC(
      'admin_change_password',
      {
        p_employee_id: session.employee_id,
        p_old_password: oldPassword,
        p_new_password: newPassword,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data?.success) {
      setMessage(
        data?.message || 'Unable to change password'
      );
      return;
    }

    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setMessage('Password changed successfully');
  }

  const filteredOT = useMemo(() => {
    return otRecords.filter((r) => {
      if (fromDate && r.ot_date && r.ot_date < fromDate) {
        return false;
      }

      if (toDate && r.ot_date && r.ot_date > toDate) {
        return false;
      }

      return true;
    });
  }, [otRecords, fromDate, toDate]);

  const totalHours = useMemo(() => {
    return filteredOT.reduce(
      (sum, r) => sum + Number(r.ot_hours || 0),
      0
    );
  }, [filteredOT]);

  const staffTotalHours = useMemo(() => {
    return staffOTRecords.reduce(
      (sum, r) => sum + Number(r.ot_hours || 0),
      0
    );
  }, [staffOTRecords]);

  const staffCompOffCount = useMemo(() => {
    return staffOTRecords.filter(
      (r) => r.comp_off_date
    ).length;
  }, [staffOTRecords]);

  function downloadCSV() {
    const headers = [
      'Employee ID',
      'Name',
      'OT Date',
      'Start Time',
      'End Time',
      'OT Hours',
      'OT Reason',
      'Comp-Off Date',
      'Comp-Off Status',
    ];

    const rows = filteredOT.map((r) => [
      r.employee_id || '',
      r.name || '',
      r.ot_date || '',
      formatTime(r.start_time),
      formatTime(r.end_time),
      r.ot_hours ?? '',
      r.reason || '',
      r.comp_off_date || '',
      r.comp_off_status || '',
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'OT_Records.csv';
    a.click();

    URL.revokeObjectURL(url);
  }

  if (!session) {
    return (
      <>
        <style>{styles}</style>

        <main className="login-page">
          <div className="login-card">
            <div className="login-logo">OT</div>

            <h1>OT & Comp-Off</h1>
            <p className="login-subtitle">
              Staff & Operations Portal
            </p>

            <div className="login-tabs">
              <button
                className={
                  loginMode === 'staff'
                    ? 'login-tab active'
                    : 'login-tab'
                }
                onClick={() => {
                  setLoginMode('staff');
                  setMessage('');
                  setPassword('');
                }}
              >
                Staff Login
              </button>

              <button
                className={
                  loginMode === 'admin'
                    ? 'login-tab active'
                    : 'login-tab'
                }
                onClick={() => {
                  setLoginMode('admin');
                  setMessage('');
                }}
              >
                Admin Login
              </button>
            </div>

            <div className="form-group">
              <label>Employee ID</label>
              <input
                value={employeeId}
                onChange={(e) =>
                  setEmployeeId(e.target.value)
                }
                placeholder={
                  loginMode === 'admin'
                    ? 'Enter Admin ID'
                    : 'Enter Employee ID'
                }
              />
            </div>

            {loginMode === 'admin' && (
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
                  }}
                />
              </div>
            )}

            <button
              className="primary-btn full"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {message && (
              <div className="message error">
                {message}
              </div>
            )}

            <div className="login-note">
              {loginMode === 'staff'
                ? 'No OTP / password required.'
                : 'Admin access is password protected.'}
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <div className="app">
        <Header
          session={session}
          onLogout={logout}
        />

        <div className="layout">
          <Sidebar
            session={session}
            page={page}
            setPage={(p) => {
              setPage(p);
              setMessage('');

              if (
                session.role === 'staff' &&
                p === 'ot'
              ) {
                loadStaffOT();
              }

              if (
                session.role === 'admin' &&
                p === 'ot'
              ) {
                loadOT();
              }
            }}
          />

          <main className="content">
            {message && (
              <div className="message success">
                {message}
              </div>
            )}

            {/* STAFF DASHBOARD */}
            {session.role === 'staff' &&
              page === 'dashboard' && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>Welcome, {session.name}</h1>
                      <p>
                        Manage your OT and Comp-Off records.
                      </p>
                    </div>

                    <button
                      className="primary-btn"
                      onClick={() => setPage('add')}
                    >
                      + Add OT
                    </button>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <span>Total OT Hours</span>
                      <strong>
                        {staffTotalHours.toFixed(2)}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <span>OT Records</span>
                      <strong>
                        {staffOTRecords.length}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <span>Comp-Off Taken</span>
                      <strong>
                        {staffCompOffCount}
                      </strong>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-head">
                      <div>
                        <h2>Recent OT Records</h2>
                        <p>
                          Your latest overtime entries
                        </p>
                      </div>

                      <button
                        className="secondary-btn"
                        onClick={loadStaffOT}
                      >
                        Refresh
                      </button>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Hours</th>
                            <th>Reason</th>
                            <th>Comp-Off</th>
                            <th>Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {staffOTRecords
                            .slice(0, 10)
                            .map((r) => (
                              <tr key={r.id}>
                                <td>{r.ot_date || '-'}</td>
                                <td>
                                  {formatTime(
                                    r.start_time
                                  )}
                                </td>
                                <td>
                                  {formatTime(
                                    r.end_time
                                  )}
                                </td>
                                <td>
                                  {Number(
                                    r.ot_hours || 0
                                  ).toFixed(2)}
                                </td>
                                <td>
                                  {r.reason || '-'}
                                </td>
                                <td>
                                  {r.comp_off_date || '-'}
                                </td>
                                <td>
                                  {r.comp_off_status ? (
                                    <span className="badge badge-active">
                                      {r.comp_off_status}
                                    </span>
                                  ) : (
                                    <span className="badge badge-pending">
                                      Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}

                          {staffOTRecords.length === 0 && (
                            <tr>
                              <td
                                colSpan={7}
                                className="empty"
                              >
                                No OT records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

            {/* STAFF ADD OT */}
            {session.role === 'staff' &&
              page === 'add' && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>Add OT</h1>
                      <p>
                        Submit your overtime details.
                      </p>
                    </div>
                  </div>

                  <div className="form-panel">
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Employee ID</label>
                        <input
                          value={session.employee_id}
                          disabled
                        />
                      </div>

                      <div className="form-group">
                        <label>Name</label>
                        <input
                          value={session.name}
                          disabled
                        />
                      </div>

                      <div className="form-group">
                        <label>OT Date</label>
                        <input
                          type="date"
                          value={staffOTDate}
                          onChange={(e) =>
                            setStaffOTDate(
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>Start Time</label>
                        <input
                          type="time"
                          value={staffOTStart}
                          onChange={(e) =>
                            setStaffOTStart(
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>End Time</label>
                        <input
                          type="time"
                          value={staffOTEnd}
                          onChange={(e) =>
                            setStaffOTEnd(
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>OT Hours</label>
                        <input
                          value={
                            calculateHours(
                              staffOTStart,
                              staffOTEnd
                            ) > 0
                              ? calculateHours(
                                  staffOTStart,
                                  staffOTEnd
                                ).toFixed(2)
                              : ''
                          }
                          disabled
                          placeholder="Auto calculated"
                        />
                      </div>

                      <div className="form-group full-span">
                        <label>OT Reason</label>
                        <textarea
                          value={staffOTReason}
                          onChange={(e) =>
                            setStaffOTReason(
                              e.target.value
                            )
                          }
                          placeholder="Enter OT reason"
                          rows={4}
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        className="secondary-btn"
                        onClick={() =>
                          setPage('dashboard')
                        }
                      >
                        Cancel
                      </button>

                      <button
                        className="primary-btn"
                        onClick={saveStaffOT}
                        disabled={staffOTSaving}
                      >
                        {staffOTSaving
                          ? 'Saving...'
                          : 'Save OT'}
                      </button>
                    </div>
                  </div>
                </>
              )}

            {/* STAFF MY OT */}
            {session.role === 'staff' &&
              page === 'ot' && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>My OT Records</h1>
                      <p>
                        Complete history of your OT entries.
                      </p>
                    </div>

                    <button
                      className="secondary-btn"
                      onClick={loadStaffOT}
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="panel">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Hours</th>
                            <th>Reason</th>
                            <th>Comp-Off Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {staffOTRecords.map((r) => (
                            <tr key={r.id}>
                              <td>{r.ot_date || '-'}</td>
                              <td>
                                {formatTime(
                                  r.start_time
                                )}
                              </td>
                              <td>
                                {formatTime(
                                  r.end_time
                                )}
                              </td>
                              <td>
                                {Number(
                                  r.ot_hours || 0
                                ).toFixed(2)}
                              </td>
                              <td>
                                {r.reason || '-'}
                              </td>
                              <td>
                                {r.comp_off_date || '-'}
                              </td>
                              <td>
                                {r.comp_off_status ? (
                                  <span className="badge badge-active">
                                    {r.comp_off_status}
                                  </span>
                                ) : (
                                  <span className="badge badge-pending">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}

                          {staffOTRecords.length === 0 && (
                            <tr>
                              <td
                                colSpan={7}
                                className="empty"
                              >
                                No OT records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

            {/* ADMIN DASHBOARD */}
            {session.role === 'admin' &&
              page === 'dashboard' && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>Admin Dashboard</h1>
                      <p>
                        OT & Comp-Off overview
                      </p>
                    </div>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <span>Total Staff</span>
                      <strong>{staff.length}</strong>
                    </div>

                    <div className="stat-card">
                      <span>Total OT Records</span>
                      <strong>
                        {otRecords.length}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <span>Total OT Hours</span>
                      <strong>
                        {totalHours.toFixed(2)}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <span>Total Admins</span>
                      <strong>
                        {admins.length}
                      </strong>
                    </div>
                  </div>
                </>
              )}

            {/* ADMIN STAFF */}
            {session.role === 'admin' &&
              page === 'staff' && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>Staff Management</h1>
                      <p>
                        Add, remove and manage staff.
                      </p>
                    </div>
                  </div>

                  <div className="form-panel">
                    <h2>Add Employee</h2>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Employee ID</label>
                        <input
                          value={newEmployeeId}
                          onChange={(e) =>
                            setNewEmployeeId(
                              e.target.value
                            )
                          }
                          placeholder="Employee ID"
                        />
                      </div>

                      <div className="form-group">
                        <label>Employee Name</label>
                        <input
                          value={newEmployeeName}
                          onChange={(e) =>
                            setNewEmployeeName(
                              e.target.value
                            )
                          }
                          placeholder="Employee Name"
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        className="primary-btn"
                        onClick={addStaff}
                      >
                        Add Employee
                      </button>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-head">
                      <div>
                        <h2>Staff Details</h2>
                        <p>
                          {staff.length} staff records
                        </p>
                      </div>

                      <button
                        className="secondary-btn"
                        onClick={loadStaff}
                      >
                        Refresh
                      </button>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Employee ID</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {staff.map((row) => (
                            <tr key={row.id}>
                              <td>
                                {row.employee_id}
                              </td>
                              <td>{row.name}</td>
                              <td>
                                {row.role || 'Staff'}
                              </td>
                              <td>
                                <span
                                  className={
                                    row.access_enabled
                                      ? 'badge badge-active'
                                      : 'badge badge-danger'
                                  }
                                >
                                  {row.access_enabled
                                    ? 'Active'
                                    : 'Disabled'}
                                </span>
                              </td>
                              <td>
                                <div className="action-row">
                                  <button
                                    className="small-btn"
                                    onClick={() =>
                                      makeAdmin(row)
                                    }
                                  >
                                    Make Admin
                                  </button>

                                  <button
                                    className="small-btn danger"
                                    onClick={() =>
                                      removeStaff(row)
                                    }
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}

                          {staff.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="empty"
                              >
                                No staff found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

            {/* ADMIN OT */}
            {session.role === 'admin' &&
              page === 'ot' && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>OT Records</h1>
                      <p>
                        View and manage all OT records.
                      </p>
                    </div>

                    <button
                      className="primary-btn"
                      onClick={downloadCSV}
                    >
                      Export CSV
                    </button>
                  </div>

                  <div className="filter-panel">
                    <div className="form-group">
                      <label>From Date</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) =>
                          setFromDate(e.target.value)
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label>To Date</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) =>
                          setToDate(e.target.value)
                        }
                      />
                    </div>

                    <button
                      className="secondary-btn"
                      onClick={() => {
                        setFromDate('');
                        setToDate('');
                      }}
                    >
                      Clear
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={loadOT}
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="stats-grid compact">
                    <div className="stat-card">
                      <span>Records</span>
                      <strong>
                        {filteredOT.length}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <span>OT Hours</span>
                      <strong>
                        {totalHours.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Employee ID</th>
                            <th>Name</th>
                            <th>Date</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Hours</th>
                            <th>OT Reason</th>
                            <th>Status</th>
                            <th>Comp-Off</th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredOT.map((r) => (
                            <tr key={r.id}>
                              <td>
                                {r.employee_id || '-'}
                              </td>

                              <td>
                                {r.name || '-'}
                              </td>

                              <td>
                                {r.ot_date || '-'}
                              </td>

                              <td>
                                {formatTime(
                                  r.start_time
                                )}
                              </td>

                              <td>
                                {formatTime(
                                  r.end_time
                                )}
                              </td>

                              <td>
                                {Number(
                                  r.ot_hours || 0
                                ).toFixed(2)}
                              </td>

                              <td>
                                {r.reason || '-'}
                              </td>

                              <td>
                                {r.comp_off_status ? (
                                  <span className="badge badge-active">
                                    {r.comp_off_status}
                                  </span>
                                ) : (
                                  <span className="badge badge-pending">
                                    Pending
                                  </span>
                                )}
                              </td>

                              <td>
                                {r.comp_off_date ? (
                                  <span className="comp-off-date">
                                    {r.comp_off_date}
                                  </span>
                                ) : (
                                  <button
                                    className="comp-off-btn"
                                    onClick={() => {
                                      setCompOffRow(r);
                                      setCompOffDate('');
                                    }}
                                  >
                                    Comp-Off
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}

                          {filteredOT.length === 0 && (
                            <tr>
                              <td
                                colSpan={9}
                                className="empty"
                              >
                                No OT records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

            {/* ADMIN MANAGEMENT */}
            {session.role === 'admin' &&
              page === 'admin' && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>Admin Management</h1>
                      <p>
                        Manage administrator accounts.
                      </p>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Employee ID</th>
                            <th>Name</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {admins.map((row) => (
                            <tr key={row.employee_id}>
                              <td>
                                {row.employee_id}
                              </td>

                              <td>
                                {row.name || '-'}
                              </td>

                              <td>
                                <div className="action-row">
                                  <button
                                    className="small-btn"
                                    onClick={() =>
                                      resetAdminPassword(
                                        row
                                      )
                                    }
                                  >
                                    Reset Password
                                  </button>

                                  {row.employee_id !==
                                    session.employee_id && (
                                    <button
                                      className="small-btn danger"
                                      onClick={() =>
                                        removeAdmin(row)
                                      }
                                    >
                                      Remove Admin
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}

                          {admins.length === 0 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="empty"
                              >
                                No admins found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

            {/* CHANGE PASSWORD */}
            {session.role === 'admin' &&
              page === 'password' && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>Change Password</h1>
                      <p>
                        Old password is required to
                        change your password.
                      </p>
                    </div>
                  </div>

                  <div className="form-panel password-panel">
                    <div className="form-group">
                      <label>Old Password</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) =>
                          setOldPassword(
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) =>
                          setNewPassword(
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) =>
                          setConfirmPassword(
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="form-actions">
                      <button
                        className="primary-btn"
                        onClick={changeOwnPassword}
                      >
                        Change Password
                      </button>
                    </div>
                  </div>
                </>
              )}
          </main>
        </div>
      </div>

      {/* COMP-OFF MODAL */}
      {compOffRow && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!savingCompOff) {
              setCompOffRow(null);
              setCompOffDate('');
            }
          }}
        >
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Assign Comp-Off</h2>

            <p className="modal-info">
              Employee:{' '}
              <strong>
                {compOffRow.employee_id || '-'}
              </strong>
              <br />
              OT Date:{' '}
              <strong>
                {compOffRow.ot_date || '-'}
              </strong>
            </p>

            <div className="form-group">
              <label>Comp-Off Date</label>
              <input
                type="date"
                value={compOffDate}
                onChange={(e) =>
                  setCompOffDate(e.target.value)
                }
              />
            </div>

            <div className="modal-actions">
              <button
                className="secondary-btn"
                disabled={savingCompOff}
                onClick={() => {
                  setCompOffRow(null);
                  setCompOffDate('');
                }}
              >
                Cancel
              </button>

              <button
                className="primary-btn"
                disabled={savingCompOff}
                onClick={saveCompOff}
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

const styles = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Inter, Arial, sans-serif;
  background: #f4f7fb;
  color: #182230;
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, #dbeafe, transparent 35%),
    radial-gradient(circle at bottom right, #e0e7ff, transparent 35%),
    #f4f7fb;
}

.login-card {
  width: 100%;
  max-width: 430px;
  background: white;
  border-radius: 22px;
  padding: 38px;
  box-shadow: 0 25px 70px rgba(15, 23, 42, .12);
}

.login-logo {
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: #111827;
  color: white;
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 18px;
}

.login-card h1 {
  margin: 0;
  font-size: 30px;
}

.login-subtitle {
  margin: 8px 0 28px;
  color: #64748b;
}

.login-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 5px;
  background: #f1f5f9;
  border-radius: 12px;
  margin-bottom: 24px;
}

.login-tab {
  border: 0;
  background: transparent;
  padding: 11px;
  border-radius: 9px;
  color: #64748b;
  font-weight: 700;
}

.login-tab.active {
  background: white;
  color: #111827;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.form-group label {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}

.form-group input,
.form-group textarea {
  width: 100%;
  border: 1px solid #d7dee8;
  border-radius: 10px;
  padding: 11px 13px;
  outline: none;
  background: white;
  color: #111827;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #64748b;
  box-shadow: 0 0 0 3px rgba(100,116,139,.10);
}

.form-group input:disabled {
  background: #f8fafc;
  color: #64748b;
}

.full {
  width: 100%;
  margin-top: 20px;
}

.primary-btn,
.secondary-btn,
.small-btn,
.logout-btn,
.comp-off-btn {
  border: 0;
  border-radius: 9px;
  padding: 10px 15px;
  font-weight: 700;
  transition: .15s;
}

.primary-btn {
  background: #111827;
  color: white;
}

.primary-btn:hover {
  background: #263244;
}

.primary-btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.secondary-btn {
  background: #eef2f7;
  color: #334155;
}

.secondary-btn:hover {
  background: #e2e8f0;
}

.logout-btn {
  background: #fee2e2;
  color: #991b1b;
}

.small-btn {
  background: #e2e8f0;
  color: #334155;
  padding: 7px 10px;
  font-size: 12px;
}

.small-btn.danger {
  background: #fee2e2;
  color: #991b1b;
}

.comp-off-btn {
  background: #111827;
  color: white;
  padding: 7px 11px;
  font-size: 12px;
}

.comp-off-date {
  font-weight: 700;
  color: #166534;
  white-space: nowrap;
}

.login-note {
  margin-top: 18px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

.message {
  padding: 12px 15px;
  border-radius: 10px;
  margin-bottom: 18px;
  font-size: 14px;
  font-weight: 600;
}

.message.success {
  background: #ecfdf5;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.message.error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.app {
  min-height: 100vh;
  background: #f4f7fb;
}

.topbar {
  height: 76px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
}

.brand {
  font-size: 21px;
  font-weight: 800;
  color: #111827;
}

.subbrand {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 3px;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 18px;
}

.user-info {
  display: flex;
  flex-direction: column;
  text-align: right;
}

.user-info strong {
  font-size: 14px;
}

.user-info span {
  font-size: 12px;
  color: #64748b;
}

.layout {
  display: flex;
  min-height: calc(100vh - 76px);
}

.sidebar {
  width: 230px;
  background: #111827;
  padding: 24px 15px;
  flex-shrink: 0;
}

.side-title {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
  padding: 0 12px 14px;
}

.side-btn {
  width: 100%;
  border: 0;
  background: transparent;
  color: #cbd5e1;
  text-align: left;
  padding: 12px 13px;
  border-radius: 9px;
  margin-bottom: 4px;
  font-weight: 600;
}

.side-btn:hover,
.side-btn.active {
  background: #263244;
  color: white;
}

.content {
  flex: 1;
  padding: 30px;
  max-width: 1600px;
  overflow-x: auto;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
}

.page-heading h1 {
  margin: 0;
  font-size: 28px;
}

.page-heading p {
  margin: 7px 0 0;
  color: #64748b;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 24px;
}

.stats-grid.compact {
  grid-template-columns: repeat(2, 220px);
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 15px;
  padding: 21px;
  box-shadow: 0 5px 20px rgba(15,23,42,.035);
}

.stat-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 9px;
}

.stat-card strong {
  font-size: 27px;
}

.panel,
.form-panel,
.filter-panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 15px;
  padding: 22px;
  margin-bottom: 22px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 18px;
}

.panel h2,
.form-panel h2 {
  margin: 0;
  font-size: 18px;
}

.panel-head p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 13px;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 850px;
}

th,
td {
  padding: 13px 12px;
  border-bottom: 1px solid #edf0f4;
  text-align: left;
  font-size: 13px;
  white-space: nowrap;
}

th {
  color: #64748b;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .5px;
  background: #f8fafc;
}

tbody tr:hover {
  background: #fafafa;
}

.empty {
  text-align: center;
  color: #94a3b8;
  padding: 30px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.badge-active {
  background: #dcfce7;
  color: #166534;
}

.badge-pending {
  background: #fef3c7;
  color: #92400e;
}

.badge-danger {
  background: #fee2e2;
  color: #991b1b;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}

.full-span {
  grid-column: 1 / -1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.password-panel {
  max-width: 620px;
}

.filter-panel {
  display: flex;
  align-items: end;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-panel .form-group {
  width: 190px;
}

.action-row {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
}

.modal-box {
  width: 100%;
  max-width: 440px;
  background: white;
  border-radius: 17px;
  padding: 25px;
  box-shadow: 0 30px 80px rgba(0,0,0,.22);
}

.modal-box h2 {
  margin: 0 0 10px;
}

.modal-info {
  color: #64748b;
  line-height: 1.7;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

@media (max-width: 900px) {
  .sidebar {
    width: 190px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .topbar {
    padding: 0 15px;
  }

  .user-info {
    display: none;
  }

  .layout {
    display: block;
  }

  .sidebar {
    width: 100%;
    display: flex;
    overflow-x: auto;
    padding: 10px;
    gap: 5px;
  }

  .side-title {
    display: none;
  }

  .side-btn {
    width: auto;
    white-space: nowrap;
    margin: 0;
  }

  .content {
    padding: 18px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .full-span {
    grid-column: auto;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}
`;
