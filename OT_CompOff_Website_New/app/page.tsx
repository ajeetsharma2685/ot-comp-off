'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

type Session = {
  role: 'admin' | 'staff';
  id?: number;
  employee_id?: string;
  name?: string;
  admin_id?: string;
};

type Staff = {
  id?: number;
  employee_id?: string;
  name?: string;
  role?: string;
  department?: string;
  password?: string;
  active?: boolean;
};

type Admin = {
  id?: number;
  admin_id?: string;
  name?: string;
  active?: boolean;
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

function formatHours(value: number | string | null | undefined) {
  const n = Number(value || 0);
  return `${n.toFixed(2)} hrs`;
}

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function downloadCSV(rows: OTEntry[], filename: string) {
  const headers = [
    'Employee ID',
    'Name',
    'OT Date',
    'Start Time',
    'End Time',
    'OT Hours',
    'Reason',
    'Comp-Off Date',
    'Comp-Off Status',
  ];

  const csvRows = rows.map((r) => [
    r.employee_id || '',
    r.name || '',
    r.ot_date || '',
    r.start_time || '',
    r.end_time || '',
    r.ot_hours ?? '',
    r.reason || '',
    r.comp_off_date || '',
    r.comp_off_status || '',
  ]);

  const csv = [
    headers,
    ...csvRows,
  ]
    .map((row) =>
      row
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);

  const [loginType, setLoginType] = useState<'staff' | 'admin'>('staff');
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [page, setPage] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [staff, setStaff] = useState<Staff[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [otRows, setOtRows] = useState<OTEntry[]>([]);
  const [staffOTRows, setStaffOTRows] = useState<OTEntry[]>([]);

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [staffOTDate, setStaffOTDate] = useState(todayDate());
  const [staffOTStart, setStaffOTStart] = useState('');
  const [staffOTEnd, setStaffOTEnd] = useState('');
  const [staffOTReason, setStaffOTReason] = useState('');

  const [newStaffId, setNewStaffId] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffDepartment, setNewStaffDepartment] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');

  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminName, setNewAdminName] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [resetAdminId, setResetAdminId] = useState('');
  const [resetPassword, setResetPassword] = useState('');

  const [compOffRow, setCompOffRow] = useState<OTEntry | null>(null);
  const [compOffDate, setCompOffDate] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ot_details_session');

      if (saved) {
        const parsed = JSON.parse(saved);
        setSession(parsed);
      }
    } catch {
      localStorage.removeItem('ot_details_session');
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    if (session.role === 'admin') {
      loadStaff();
      loadAdmins();
      loadOT();
    } else {
      loadStaffOT();
    }
  }, [session]);

  async function login() {
    setLoading(true);
    setMessage('');

    try {
      if (!loginId.trim() || !loginPassword) {
        setMessage('Please enter ID and password.');
        return;
      }

      if (loginType === 'admin') {
        const { data, error } = await supabase.rpc('admin_login', {
          p_admin_id: loginId.trim(),
          p_password: loginPassword,
        });

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;

        if (!row) {
          setMessage('Invalid Admin ID or password.');
          return;
        }

        const newSession: Session = {
          role: 'admin',
          id: row.id,
          admin_id: row.admin_id || loginId.trim(),
          name: row.name || 'Admin',
        };

        localStorage.setItem(
          'ot_details_session',
          JSON.stringify(newSession)
        );

        setSession(newSession);
        setPage('dashboard');
        setLoginId('');
        setLoginPassword('');
      } else {
        const { data, error } = await supabase.rpc('staff_login', {
          p_employee_id: loginId.trim(),
          p_password: loginPassword,
        });

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;

        if (!row) {
          setMessage('Invalid Employee ID or password.');
          return;
        }

        const newSession: Session = {
          role: 'staff',
          id: row.id,
          employee_id: row.employee_id || loginId.trim(),
          name: row.name || 'Staff',
        };

        localStorage.setItem(
          'ot_details_session',
          JSON.stringify(newSession)
        );

        setSession(newSession);
        setPage('dashboard');
        setLoginId('');
        setLoginPassword('');
      }
    } catch (error: any) {
      setMessage(error?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('ot_details_session');
    setSession(null);
    setPage('dashboard');
    setMessage('');
  }

  async function loadStaff() {
    const { data, error } = await supabase.rpc('admin_get_staff');

    if (error) {
      setMessage(error.message);
      return;
    }

    setStaff(data || []);
  }

  async function loadAdmins() {
    const { data, error } = await supabase.rpc('admin_get_admins');

    if (error) {
      setMessage(error.message);
      return;
    }

    setAdmins(data || []);
  }

  async function loadOT() {
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('admin_get_all_ot');

      if (error) throw error;

      const rows = (data || []).map((row: any) => ({
        id: row.id,
        staff_id: row.staff_id,
        employee_id:
          row.employee_id ||
          row.staff_employee_id ||
          row.emp_id ||
          '',
        name:
          row.name ||
          row.staff_name ||
          '',
        ot_date: row.ot_date,
        start_time: row.start_time,
        end_time: row.end_time,
        ot_hours: row.ot_hours,
        reason: row.reason ?? row.ot_reason ?? '',
        comp_off_date: row.comp_off_date ?? null,
        comp_off_status: row.comp_off_status ?? null,
      }));

      setOtRows(rows);
    } catch (error: any) {
      setMessage(
        error?.message ||
          'Unable to load OT records. Please check admin_get_all_ot RPC.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadStaffOT() {
    if (!session?.id) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('ot_entries')
        .select('*')
        .eq('staff_id', session.id)
        .order('ot_date', { ascending: false })
        .order('id', { ascending: false });

      if (error) throw error;

      setStaffOTRows(data || []);
    } catch (error: any) {
      setMessage(error?.message || 'Unable to load OT records.');
    } finally {
      setLoading(false);
    }
  }

  async function saveStaffOT() {
    if (!session?.id) return;

    if (!staffOTDate || !staffOTStart || !staffOTEnd) {
      setMessage('Please enter OT date, start time and end time.');
      return;
    }

    if (!staffOTReason.trim()) {
      setMessage('Please enter OT reason.');
      return;
    }

    const hours = calculateHours(staffOTStart, staffOTEnd);

    if (hours <= 0) {
      setMessage('Invalid OT time.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.from('ot_entries').insert({
        staff_id: session.id,
        ot_date: staffOTDate,
        start_time: staffOTStart,
        end_time: staffOTEnd,
        ot_hours: hours,
        reason: staffOTReason.trim(),
        comp_off_date: null,
        comp_off_status: null,
      });

      if (error) throw error;

      setMessage('OT entry saved successfully.');

      setStaffOTStart('');
      setStaffOTEnd('');
      setStaffOTReason('');

      await loadStaffOT();
      setPage('my-ot');
    } catch (error: any) {
      setMessage(error?.message || 'Unable to save OT.');
    } finally {
      setLoading(false);
    }
  }

  async function saveCompOff() {
    if (!compOffRow?.id) return;

    if (!compOffDate) {
      setMessage('Please select Comp-Off date.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('ot_entries')
        .update({
          comp_off_date: compOffDate,
          comp_off_status: 'Comp-Off Taken',
        })
        .eq('id', compOffRow.id);

      if (error) throw error;

      setMessage('Comp-Off saved successfully.');
      setCompOffRow(null);
      setCompOffDate('');

      if (session?.role === 'admin') {
        await loadOT();
      } else {
        await loadStaffOT();
      }
    } catch (error: any) {
      setMessage(
        error?.message ||
          'Unable to save Comp-Off. Please check Supabase permissions.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function addStaff() {
    if (!newStaffId.trim() || !newStaffName.trim()) {
      setMessage('Employee ID and Name are required.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.rpc('admin_add_staff', {
        p_employee_id: newStaffId.trim(),
        p_name: newStaffName.trim(),
        p_role: newStaffRole.trim(),
        p_department: newStaffDepartment.trim(),
        p_password: newStaffPassword,
      });

      if (error) throw error;

      setMessage('Staff added successfully.');

      setNewStaffId('');
      setNewStaffName('');
      setNewStaffRole('');
      setNewStaffDepartment('');
      setNewStaffPassword('');

      await loadStaff();
    } catch (error: any) {
      setMessage(error?.message || 'Unable to add staff.');
    } finally {
      setLoading(false);
    }
  }

  async function removeStaff(id: number | undefined) {
    if (!id) return;

    if (!confirm('Remove this staff?')) return;

    setLoading(true);

    try {
      const { error } = await supabase.rpc('admin_remove_staff', {
        p_staff_id: id,
      });

      if (error) throw error;

      setMessage('Staff removed successfully.');
      await loadStaff();
    } catch (error: any) {
      setMessage(error?.message || 'Unable to remove staff.');
    } finally {
      setLoading(false);
    }
  }

  async function addAdmin() {
    if (!newAdminId.trim()) {
      setMessage('Admin ID is required.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.rpc('admin_make_admin', {
        p_employee_id: newAdminId.trim(),
      });

      if (error) throw error;

      setMessage('Admin created successfully.');

      setNewAdminId('');
      setNewAdminName('');

      await loadAdmins();
    } catch (error: any) {
      setMessage(error?.message || 'Unable to create admin.');
    } finally {
      setLoading(false);
    }
  }

  async function removeAdmin(id: number | undefined) {
    if (!id) return;

    if (!confirm('Remove this admin?')) return;

    setLoading(true);

    try {
      const { error } = await supabase.rpc('admin_remove_admin', {
        p_admin_id: id,
      });

      if (error) throw error;

      setMessage('Admin removed successfully.');
      await loadAdmins();
    } catch (error: any) {
      setMessage(error?.message || 'Unable to remove admin.');
    } finally {
      setLoading(false);
    }
  }

  async function resetAdminPassword() {
    if (!resetAdminId.trim() || !resetPassword) {
      setMessage('Admin ID and new password are required.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.rpc(
        'admin_reset_admin_password',
        {
          p_admin_id: resetAdminId.trim(),
          p_new_password: resetPassword,
        }
      );

      if (error) throw error;

      setMessage('Admin password reset successfully.');

      setResetAdminId('');
      setResetPassword('');
    } catch (error: any) {
      setMessage(
        error?.message || 'Unable to reset admin password.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage('Please fill all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('New password and confirm password do not match.');
      return;
    }

    if (!session) return;

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.rpc(
        'admin_change_password',
        {
          p_admin_id: session.admin_id,
          p_old_password: oldPassword,
          p_new_password: newPassword,
        }
      );

      if (error) throw error;

      setMessage('Password changed successfully.');

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage(
        error?.message ||
          'Password change failed. Please check old password.'
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredOT = useMemo(() => {
    let rows = [...otRows];

    if (search.trim()) {
      const q = search.toLowerCase();

      rows = rows.filter((r) =>
        [
          r.employee_id,
          r.name,
          r.reason,
          r.ot_date,
          r.comp_off_date,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    if (dateFilter) {
      rows = rows.filter((r) => r.ot_date === dateFilter);
    }

    return rows;
  }, [otRows, search, dateFilter]);

  const filteredStaffOT = useMemo(() => {
    let rows = [...staffOTRows];

    if (search.trim()) {
      const q = search.toLowerCase();

      rows = rows.filter((r) =>
        [
          r.reason,
          r.ot_date,
          r.comp_off_date,
          r.comp_off_status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    if (dateFilter) {
      rows = rows.filter((r) => r.ot_date === dateFilter);
    }

    return rows;
  }, [staffOTRows, search, dateFilter]);

  const adminTotalHours = otRows.reduce(
    (sum, r) => sum + Number(r.ot_hours || 0),
    0
  );

  const staffTotalHours = staffOTRows.reduce(
    (sum, r) => sum + Number(r.ot_hours || 0),
    0
  );

  if (!session) {
    return (
      <>
        <style jsx global>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Inter, Arial, sans-serif;
            background: #f4f7fb;
            color: #172033;
          }

          button,
          input,
          select {
            font: inherit;
          }

          .login-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 25px;
            background:
              radial-gradient(circle at top left, #dbeafe, transparent 35%),
              radial-gradient(circle at bottom right, #e0e7ff, transparent 35%),
              #f4f7fb;
          }

          .login-card {
            width: 430px;
            max-width: 100%;
            background: white;
            border-radius: 24px;
            padding: 34px;
            box-shadow: 0 25px 70px rgba(15, 23, 42, .12);
            border: 1px solid #e5e7eb;
          }

          .logo {
            width: 58px;
            height: 58px;
            border-radius: 17px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #172554;
            color: white;
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 18px;
          }

          .login-card h1 {
            margin: 0;
            font-size: 27px;
          }

          .login-card p {
            color: #64748b;
            margin: 8px 0 25px;
          }

          .tabs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            background: #f1f5f9;
            padding: 4px;
            border-radius: 12px;
            margin-bottom: 22px;
          }

          .tabs button {
            border: 0;
            padding: 11px;
            border-radius: 9px;
            cursor: pointer;
            background: transparent;
            color: #64748b;
          }

          .tabs button.active {
            background: white;
            color: #172554;
            font-weight: 700;
            box-shadow: 0 2px 7px rgba(15, 23, 42, .08);
          }

          .field {
            margin-bottom: 15px;
          }

          .field label {
            display: block;
            margin-bottom: 7px;
            font-size: 13px;
            font-weight: 700;
            color: #475569;
          }

          .field input,
          .field select {
            width: 100%;
            padding: 12px 13px;
            border: 1px solid #dbe1ea;
            border-radius: 10px;
            outline: none;
            background: white;
          }

          .field input:focus,
          .field select:focus {
            border-color: #4f46e5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, .08);
          }

          .primary {
            width: 100%;
            border: 0;
            background: #172554;
            color: white;
            padding: 13px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 700;
          }

          .primary:hover {
            background: #1e3a8a;
          }

          .message {
            margin: 15px 0;
            padding: 11px 13px;
            border-radius: 10px;
            background: #eff6ff;
            color: #1e40af;
            font-size: 14px;
          }
        `}</style>

        <div className="login-page">
          <div className="login-card">
            <div className="logo">OT</div>

            <h1>OT & Comp-Off</h1>
            <p>Staff and Admin Management Portal</p>

            <div className="tabs">
              <button
                className={loginType === 'staff' ? 'active' : ''}
                onClick={() => {
                  setLoginType('staff');
                  setMessage('');
                }}
              >
                Staff Login
              </button>

              <button
                className={loginType === 'admin' ? 'active' : ''}
                onClick={() => {
                  setLoginType('admin');
                  setMessage('');
                }}
              >
                Admin Login
              </button>
            </div>

            <div className="field">
              <label>
                {loginType === 'staff'
                  ? 'Employee ID'
                  : 'Admin ID'}
              </label>

              <input
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder={
                  loginType === 'staff'
                    ? 'Enter Employee ID'
                    : 'Enter Admin ID'
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') login();
                }}
              />
            </div>

            <div className="field">
              <label>Password</label>

              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') login();
                }}
              />
            </div>

            {message && <div className="message">{message}</div>}

            <button
              className="primary"
              onClick={login}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Inter, Arial, sans-serif;
          background: #f5f7fb;
          color: #172033;
        }

        button,
        input,
        select {
          font: inherit;
        }

        .app {
          min-height: 100vh;
          display: flex;
        }

        .sidebar {
          width: 245px;
          min-height: 100vh;
          background: #111827;
          color: white;
          padding: 22px 15px;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
        }

        .brand {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 5px 10px 25px;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .brand strong {
          display: block;
          font-size: 15px;
        }

        .brand span {
          color: #94a3b8;
          font-size: 11px;
        }

        .nav-title {
          color: #64748b;
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 800;
          padding: 12px 12px 7px;
          letter-spacing: .08em;
        }

        .nav-btn {
          width: 100%;
          border: 0;
          background: transparent;
          color: #cbd5e1;
          padding: 11px 12px;
          border-radius: 9px;
          text-align: left;
          cursor: pointer;
          margin-bottom: 3px;
        }

        .nav-btn:hover,
        .nav-btn.active {
          background: #1e293b;
          color: white;
        }

        .logout {
          position: absolute;
          bottom: 20px;
          left: 15px;
          right: 15px;
          width: calc(100% - 30px);
          border: 1px solid #334155;
          background: transparent;
          color: #cbd5e1;
          padding: 10px;
          border-radius: 9px;
          cursor: pointer;
        }

        .main {
          margin-left: 245px;
          width: calc(100% - 245px);
          min-height: 100vh;
          padding: 28px;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .topbar h1 {
          margin: 0;
          font-size: 25px;
        }

        .topbar p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .user-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          padding: 9px 13px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }

        .avatar {
          width: 35px;
          height: 35px;
          border-radius: 10px;
          background: #e0e7ff;
          color: #3730a3;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .card {
          background: white;
          border: 1px solid #e7eaf0;
          border-radius: 15px;
          padding: 18px;
          box-shadow: 0 3px 12px rgba(15, 23, 42, .035);
        }

        .card-label {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .card-value {
          font-size: 25px;
          font-weight: 800;
          margin-top: 8px;
        }

        .panel {
          background: white;
          border: 1px solid #e7eaf0;
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 3px 12px rgba(15, 23, 42, .035);
        }

        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 18px;
        }

        .panel-head h2 {
          margin: 0;
          font-size: 17px;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .toolbar input,
        .toolbar select,
        .form-grid input,
        .form-grid select {
          border: 1px solid #dbe1ea;
          border-radius: 9px;
          padding: 10px 11px;
          background: white;
          outline: none;
        }

        .toolbar input:focus,
        .toolbar select:focus,
        .form-grid input:focus,
        .form-grid select:focus {
          border-color: #6366f1;
        }

        .btn {
          border: 0;
          padding: 10px 14px;
          border-radius: 9px;
          cursor: pointer;
          font-weight: 700;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
        }

        .btn-dark {
          background: #172033;
          color: white;
        }

        .btn-light {
          background: #eef2ff;
          color: #3730a3;
        }

        .btn-danger {
          background: #fee2e2;
          color: #b91c1c;
        }

        .btn-success {
          background: #dcfce7;
          color: #166534;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 850px;
        }

        th {
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .04em;
          text-align: left;
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        td {
          padding: 13px 12px;
          border-bottom: 1px solid #eef2f7;
          font-size: 13px;
        }

        tr:hover td {
          background: #fafbff;
        }

        .status {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          background: #dcfce7;
          color: #166534;
        }

        .muted {
          color: #94a3b8;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .form-item label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
        }

        .form-item input,
        .form-item select {
          width: 100%;
        }

        .form-full {
          grid-column: 1 / -1;
        }

        .empty {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
        }

        .alert {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          padding: 11px 14px;
          border-radius: 10px;
          margin-bottom: 18px;
        }

        .modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, .55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 100;
        }

        .modal {
          width: 420px;
          max-width: 100%;
          background: white;
          border-radius: 18px;
          padding: 23px;
          box-shadow: 0 25px 80px rgba(0, 0, 0, .2);
        }

        .modal h3 {
          margin: 0 0 7px;
        }

        .modal p {
          color: #64748b;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .modal input {
          width: 100%;
          border: 1px solid #dbe1ea;
          border-radius: 9px;
          padding: 11px;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        @media (max-width: 1000px) {
          .cards {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 750px) {
          .sidebar {
            width: 210px;
          }

          .main {
            margin-left: 210px;
            width: calc(100% - 210px);
            padding: 18px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-full {
            grid-column: auto;
          }
        }
      `}</style>

      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">OT</div>

            <div>
              <strong>OT & Comp-Off</strong>
              <span>{session.role === 'admin' ? 'Admin Portal' : 'Staff Portal'}</span>
            </div>
          </div>

          <div className="nav-title">Menu</div>

          <button
            className={`nav-btn ${page === 'dashboard' ? 'active' : ''}`}
            onClick={() => setPage('dashboard')}
          >
            Dashboard
          </button>

          {session.role === 'staff' && (
            <>
              <button
                className={`nav-btn ${page === 'add-ot' ? 'active' : ''}`}
                onClick={() => setPage('add-ot')}
              >
                Add OT
              </button>

              <button
                className={`nav-btn ${page === 'my-ot' ? 'active' : ''}`}
                onClick={() => setPage('my-ot')}
              >
                My OT Records
              </button>
            </>
          )}

          {session.role === 'admin' && (
            <>
              <button
                className={`nav-btn ${
                  page === 'staff-management' ? 'active' : ''
                }`}
                onClick={() => setPage('staff-management')}
              >
                Staff Management
              </button>

              <button
                className={`nav-btn ${page === 'ot-records' ? 'active' : ''}`}
                onClick={() => setPage('ot-records')}
              >
                OT Records
              </button>

              <button
                className={`nav-btn ${
                  page === 'admin-management' ? 'active' : ''
                }`}
                onClick={() => setPage('admin-management')}
              >
                Admin Management
              </button>

              <button
                className={`nav-btn ${
                  page === 'change-password' ? 'active' : ''
                }`}
                onClick={() => setPage('change-password')}
              >
                Change Password
              </button>
            </>
          )}

          <button className="logout" onClick={logout}>
            Logout
          </button>
        </aside>

        <main className="main">
          <div className="topbar">
            <div>
              <h1>
                {page === 'dashboard'
                  ? 'Dashboard'
                  : page === 'add-ot'
                  ? 'Add OT'
                  : page === 'my-ot'
                  ? 'My OT Records'
                  : page === 'staff-management'
                  ? 'Staff Management'
                  : page === 'ot-records'
                  ? 'OT Records'
                  : page === 'admin-management'
                  ? 'Admin Management'
                  : 'Change Password'}
              </h1>

              <p>
                {session.role === 'admin'
                  ? 'Manage staff, OT and Comp-Off records'
                  : 'Manage your OT and Comp-Off records'}
              </p>
            </div>

            <div className="user-pill">
              <div className="avatar">
                {(session.name || 'U').charAt(0).toUpperCase()}
              </div>

              <div>
                <strong>{session.name || 'User'}</strong>
                <div className="muted" style={{ fontSize: 11 }}>
                  {session.role === 'admin'
                    ? session.admin_id
                    : session.employee_id}
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="alert">
              {message}
            </div>
          )}

          {page === 'dashboard' && session.role === 'admin' && (
            <>
              <div className="cards">
                <div className="card">
                  <div className="card-label">Total Staff</div>
                  <div className="card-value">{staff.length}</div>
                </div>

                <div className="card">
                  <div className="card-label">Total OT Records</div>
                  <div className="card-value">{otRows.length}</div>
                </div>

                <div className="card">
                  <div className="card-label">Total OT Hours</div>
                  <div className="card-value">
                    {formatHours(adminTotalHours)}
                  </div>
                </div>

                <div className="card">
                  <div className="card-label">Comp-Off Taken</div>
                  <div className="card-value">
                    {otRows.filter((r) => r.comp_off_date).length}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h2>Recent OT Records</h2>

                  <button
                    className="btn btn-light"
                    onClick={() => setPage('ot-records')}
                  >
                    View All
                  </button>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Date</th>
                        <th>Hours</th>
                        <th>Reason</th>
                        <th>Comp-Off</th>
                      </tr>
                    </thead>

                    <tbody>
                      {otRows.slice(0, 8).map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.name || '-'}</strong>
                            <div className="muted">
                              {r.employee_id || '-'}
                            </div>
                          </td>

                          <td>{r.ot_date || '-'}</td>

                          <td>{formatHours(r.ot_hours)}</td>

                          <td>{r.reason || '-'}</td>

                          <td>
                            {r.comp_off_date ? (
                              <>
                                <strong>{r.comp_off_date}</strong>
                                <div className="status">
                                  {r.comp_off_status || 'Comp-Off Taken'}
                                </div>
                              </>
                            ) : (
                              <button
                                className="btn btn-light"
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

                      {otRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="empty">
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

          {page === 'dashboard' && session.role === 'staff' && (
            <>
              <div className="cards">
                <div className="card">
                  <div className="card-label">My OT Records</div>
                  <div className="card-value">
                    {staffOTRows.length}
                  </div>
                </div>

                <div className="card">
                  <div className="card-label">Total OT Hours</div>
                  <div className="card-value">
                    {formatHours(staffTotalHours)}
                  </div>
                </div>

                <div className="card">
                  <div className="card-label">Comp-Off Taken</div>
                  <div className="card-value">
                    {
                      staffOTRows.filter(
                        (r) => r.comp_off_date
                      ).length
                    }
                  </div>
                </div>

                <div className="card">
                  <div className="card-label">Pending Comp-Off</div>
                  <div className="card-value">
                    {
                      staffOTRows.filter(
                        (r) => !r.comp_off_date
                      ).length
                    }
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h2>My Recent OT</h2>

                  <button
                    className="btn btn-primary"
                    onClick={() => setPage('add-ot')}
                  >
                    + Add OT
                  </button>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Hours</th>
                        <th>Reason</th>
                        <th>Comp-Off</th>
                      </tr>
                    </thead>

                    <tbody>
                      {staffOTRows.slice(0, 8).map((r) => (
                        <tr key={r.id}>
                          <td>{r.ot_date}</td>

                          <td>
                            {r.start_time} - {r.end_time}
                          </td>

                          <td>{formatHours(r.ot_hours)}</td>

                          <td>{r.reason || '-'}</td>

                          <td>
                            {r.comp_off_date ? (
                              <>
                                <strong>{r.comp_off_date}</strong>
                                <div className="status">
                                  {r.comp_off_status ||
                                    'Comp-Off Taken'}
                                </div>
                              </>
                            ) : (
                              <button
                                className="btn btn-light"
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

                      {staffOTRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="empty">
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

          {page === 'add-ot' && session.role === 'staff' && (
            <div className="panel">
              <div className="panel-head">
                <h2>Add New OT</h2>
              </div>

              <div className="form-grid">
                <div className="form-item">
                  <label>OT Date</label>
                  <input
                    type="date"
                    value={staffOTDate}
                    onChange={(e) =>
                      setStaffOTDate(e.target.value)
                    }
                  />
                </div>

                <div className="form-item">
                  <label>Reason</label>
                  <input
                    value={staffOTReason}
                    onChange={(e) =>
                      setStaffOTReason(e.target.value)
                    }
                    placeholder="HOLIDAY WORK / SATURDAY / OTHER"
                  />
                </div>

                <div className="form-item">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={staffOTStart}
                    onChange={(e) =>
                      setStaffOTStart(e.target.value)
                    }
                  />
                </div>

                <div className="form-item">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={staffOTEnd}
                    onChange={(e) =>
                      setStaffOTEnd(e.target.value)
                    }
                  />
                </div>

                <div className="form-item form-full">
                  <label>Calculated OT Hours</label>
                  <input
                    readOnly
                    value={
                      staffOTStart && staffOTEnd
                        ? formatHours(
                            calculateHours(
                              staffOTStart,
                              staffOTEnd
                            )
                          )
                        : '0.00 hrs'
                    }
                  />
                </div>

                <div className="form-item form-full">
                  <button
                    className="btn btn-primary"
                    onClick={saveStaffOT}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save OT Entry'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {page === 'my-ot' && session.role === 'staff' && (
            <div className="panel">
              <div className="panel-head">
                <h2>My OT Records</h2>

                <div className="toolbar">
                  <input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                  />

                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) =>
                      setDateFilter(e.target.value)
                    }
                  />

                  <button
                    className="btn btn-light"
                    onClick={() =>
                      downloadCSV(
                        filteredStaffOT,
                        'My_OT_Records.csv'
                      )
                    }
                  >
                    Export CSV
                  </button>
                </div>
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
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStaffOT.map((r) => (
                      <tr key={r.id}>
                        <td>{r.ot_date}</td>
                        <td>{r.start_time}</td>
                        <td>{r.end_time}</td>
                        <td>{formatHours(r.ot_hours)}</td>
                        <td>{r.reason || '-'}</td>

                        <td>
                          {r.comp_off_date ? (
                            <>
                              <strong>{r.comp_off_date}</strong>
                              <div className="status">
                                {r.comp_off_status ||
                                  'Comp-Off Taken'}
                              </div>
                            </>
                          ) : (
                            <button
                              className="btn btn-light"
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

                    {filteredStaffOT.length === 0 && (
                      <tr>
                        <td colSpan={6} className="empty">
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {page === 'staff-management' &&
            session.role === 'admin' && (
              <>
                <div className="panel">
                  <div className="panel-head">
                    <h2>Add Staff</h2>
                  </div>

                  <div className="form-grid">
                    <div className="form-item">
                      <label>Employee ID</label>
                      <input
                        value={newStaffId}
                        onChange={(e) =>
                          setNewStaffId(e.target.value)
                        }
                      />
                    </div>

                    <div className="form-item">
                      <label>Name</label>
                      <input
                        value={newStaffName}
                        onChange={(e) =>
                          setNewStaffName(e.target.value)
                        }
                      />
                    </div>

                    <div className="form-item">
                      <label>Role</label>
                      <input
                        value={newStaffRole}
                        onChange={(e) =>
                          setNewStaffRole(e.target.value)
                        }
                      />
                    </div>

                    <div className="form-item">
                      <label>Department</label>
                      <input
                        value={newStaffDepartment}
                        onChange={(e) =>
                          setNewStaffDepartment(e.target.value)
                        }
                      />
                    </div>

                    <div className="form-item">
                      <label>Password</label>
                      <input
                        type="password"
                        value={newStaffPassword}
                        onChange={(e) =>
                          setNewStaffPassword(e.target.value)
                        }
                      />
                    </div>

                    <div className="form-item">
                      <label>&nbsp;</label>
                      <button
                        className="btn btn-primary"
                        onClick={addStaff}
                      >
                        Add Staff
                      </button>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h2>Staff List</h2>

                    <input
                      placeholder="Search staff..."
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                    />
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Employee ID</th>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {staff
                          .filter((s) =>
                            [
                              s.employee_id,
                              s.name,
                              s.role,
                              s.department,
                            ]
                              .join(' ')
                              .toLowerCase()
                              .includes(search.toLowerCase())
                          )
                          .map((s) => (
                            <tr key={s.id}>
                              <td>{s.employee_id}</td>
                              <td>{s.name}</td>
                              <td>{s.role || '-'}</td>
                              <td>{s.department || '-'}</td>
                              <td>
                                <span className="status">
                                  {s.active === false
                                    ? 'Inactive'
                                    : 'Active'}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-danger"
                                  onClick={() =>
                                    removeStaff(s.id)
                                  }
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}

                        {staff.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
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

          {page === 'ot-records' &&
            session.role === 'admin' && (
              <div className="panel">
                <div className="panel-head">
                  <h2>All Staff OT Records</h2>

                  <div className="toolbar">
                    <input
                      placeholder="Search employee, name, reason..."
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                    />

                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) =>
                        setDateFilter(e.target.value)
                      }
                    />

                    <button
                      className="btn btn-light"
                      onClick={() =>
                        downloadCSV(
                          filteredOT,
                          'All_Staff_OT_Records.csv'
                        )
                      }
                    >
                      Export CSV
                    </button>

                    <button
                      className="btn btn-dark"
                      onClick={loadOT}
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>OT Date</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Hours</th>
                        <th>Reason</th>
                        <th>Comp-Off</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOT.map((r) => (
                        <tr key={r.id}>
                          <td>{r.employee_id || '-'}</td>
                          <td>{r.name || '-'}</td>
                          <td>{r.ot_date || '-'}</td>
                          <td>{r.start_time || '-'}</td>
                          <td>{r.end_time || '-'}</td>
                          <td>{formatHours(r.ot_hours)}</td>
                          <td>{r.reason || '-'}</td>

                          <td>
                            {r.comp_off_date ? (
                              <>
                                <strong>{r.comp_off_date}</strong>
                                <div className="status">
                                  {r.comp_off_status ||
                                    'Comp-Off Taken'}
                                </div>
                              </>
                            ) : (
                              <button
                                className="btn btn-light"
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
                          <td colSpan={8} className="empty">
                            No OT records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {page === 'admin-management' &&
            session.role === 'admin' && (
              <>
                <div className="panel">
                  <div className="panel-head">
                    <h2>Add Admin</h2>
                  </div>

                  <div className="form-grid">
                    <div className="form-item">
                      <label>Admin ID / Employee ID</label>
                      <input
                        value={newAdminId}
                        onChange={(e) =>
                          setNewAdminId(e.target.value)
                        }
                        placeholder="Example: SAS102"
                      />
                    </div>

                    <div className="form-item">
                      <label>Name</label>
                      <input
                        value={newAdminName}
                        onChange={(e) =>
                          setNewAdminName(e.target.value)
                        }
                      />
                    </div>

                    <div className="form-item">
                      <button
                        className="btn btn-primary"
                        onClick={addAdmin}
                      >
                        Make Admin
                      </button>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h2>Admin List</h2>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Admin ID</th>
                          <th>Name</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {admins.map((a) => (
                          <tr key={a.id}>
                            <td>{a.admin_id}</td>
                            <td>{a.name || '-'}</td>
                            <td>
                              <span className="status">
                                {a.active === false
                                  ? 'Inactive'
                                  : 'Active'}
                              </span>
                            </td>
                            <td>
                              {a.admin_id !== 'SAS102' && (
                                <button
                                  className="btn btn-danger"
                                  onClick={() =>
                                    removeAdmin(a.id)
                                  }
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}

                        {admins.length === 0 && (
                          <tr>
                            <td colSpan={4} className="empty">
                              No admins found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <h2>Reset Another Admin Password</h2>
                  </div>

                  <div className="form-grid">
                    <div className="form-item">
                      <label>Admin ID</label>
                      <input
                        value={resetAdminId}
                        onChange={(e) =>
                          setResetAdminId(e.target.value)
                        }
                      />
                    </div>

                    <div className="form-item">
                      <label>New Password</label>
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(e) =>
                          setResetPassword(e.target.value)
                        }
                      />
                    </div>

                    <div className="form-item">
                      <button
                        className="btn btn-primary"
                        onClick={resetAdminPassword}
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

          {page === 'change-password' &&
            session.role === 'admin' && (
              <div className="panel">
                <div className="panel-head">
                  <h2>Change Password</h2>
                </div>

                <div className="form-grid">
                  <div className="form-item form-full">
                    <label>Old Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) =>
                        setOldPassword(e.target.value)
                      }
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="form-item">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(e.target.value)
                      }
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="form-item">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="form-item form-full">
                    <button
                      className="btn btn-primary"
                      onClick={changePassword}
                      disabled={loading}
                    >
                      {loading
                        ? 'Changing...'
                        : 'Change Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}
        </main>
      </div>

      {compOffRow && (
        <div className="modal-bg">
          <div className="modal">
            <h3>Assign Comp-Off</h3>

            <p>
              {compOffRow.name ||
                compOffRow.employee_id ||
                'OT Record'}
              {' — '}
              OT Date: {compOffRow.ot_date || '-'}
            </p>

            <div className="field">
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
                className="btn btn-light"
                onClick={() => {
                  setCompOffRow(null);
                  setCompOffDate('');
                }}
              >
                Cancel
              </button>

              <button
                className="btn btn-primary"
                onClick={saveCompOff}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Comp-Off'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
