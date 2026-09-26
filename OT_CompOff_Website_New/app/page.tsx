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

function formatHours(value: number | undefined) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '0.00';
  }

  return Number(value).toFixed(2);
}

function downloadCSV(rows: OTEntry[]) {
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

  const data = rows.map((r) => [
    r.employee_id ?? '',
    r.name ?? '',
    r.ot_date ?? '',
    r.start_time ?? '',
    r.end_time ?? '',
    r.ot_hours ?? '',
    r.reason ?? '',
    r.comp_off_date ?? '',
    r.comp_off_status ?? '',
  ]);

  const csv = [
    headers,
    ...data,
  ]
    .map((row) =>
      row
        .map((cell) =>
          `"${String(cell).replace(/"/g, '""')}"`
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
  a.download = `OT_Records_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  a.click();

  URL.revokeObjectURL(url);
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);

  const [loginMode, setLoginMode] = useState<'staff' | 'admin'>('staff');
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [activePage, setActivePage] = useState('dashboard');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [staff, setStaff] = useState<Staff[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [otRecords, setOtRecords] = useState<OTEntry[]>([]);
  const [staffOTRecords, setStaffOTRecords] = useState<OTEntry[]>([]);

  const [searchText, setSearchText] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  /* STAFF ADD OT */

  const [staffOTDate, setStaffOTDate] = useState('');
  const [staffOTStart, setStaffOTStart] = useState('');
  const [staffOTEnd, setStaffOTEnd] = useState('');
  const [staffOTReason, setStaffOTReason] = useState('');

  /* STAFF ADD */

  const [newStaffEmployeeId, setNewStaffEmployeeId] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffDepartment, setNewStaffDepartment] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');

  /* ADMIN */

  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  /* CHANGE PASSWORD */

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /* RESET ADMIN PASSWORD */

  const [resetAdminId, setResetAdminId] = useState('');
  const [resetAdminPassword, setResetAdminPassword] = useState('');

  /* COMPOFF */

  const [compOffRow, setCompOffRow] = useState<OTEntry | null>(null);
  const [compOffDate, setCompOffDate] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('ot_details_session');

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);

        if (parsed.role === 'admin') {
          setActivePage('dashboard');
        } else {
          setActivePage('dashboard');
        }
      } catch {
        localStorage.removeItem('ot_details_session');
      }
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
    setErrorMessage('');

    try {
      if (!loginId.trim() || !loginPassword.trim()) {
        setErrorMessage('Please enter ID and password.');
        return;
      }

      if (loginMode === 'admin') {
        const { data, error } = await supabase.rpc(
          'admin_login',
          {
            p_admin_id: loginId.trim(),
            p_password: loginPassword,
          }
        );

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;

        if (!row) {
          setErrorMessage('Invalid Admin ID or password.');
          return;
        }

        const newSession: Session = {
          role: 'admin',
          id: row.id,
          admin_id: row.admin_id ?? loginId.trim(),
          name: row.name ?? loginId.trim(),
        };

        localStorage.setItem(
          'ot_details_session',
          JSON.stringify(newSession)
        );

        setSession(newSession);
        setActivePage('dashboard');
        setLoginId('');
        setLoginPassword('');
      } else {
        const { data, error } = await supabase.rpc(
          'staff_login',
          {
            p_employee_id: loginId.trim(),
            p_password: loginPassword,
          }
        );

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;

        if (!row) {
          setErrorMessage('Invalid Employee ID or password.');
          return;
        }

        const newSession: Session = {
          role: 'staff',
          id: row.id,
          employee_id: row.employee_id ?? loginId.trim(),
          name: row.name ?? '',
        };

        localStorage.setItem(
          'ot_details_session',
          JSON.stringify(newSession)
        );

        setSession(newSession);
        setActivePage('dashboard');
        setLoginId('');
        setLoginPassword('');
      }
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('ot_details_session');
    setSession(null);
    setActivePage('dashboard');
    setLoginId('');
    setLoginPassword('');
  }

  async function loadStaff() {
    const { data, error } = await supabase.rpc('admin_get_staff');

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStaff(Array.isArray(data) ? data : []);
  }

  async function loadAdmins() {
    const { data, error } = await supabase.rpc('admin_get_admins');

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAdmins(Array.isArray(data) ? data : []);
  }

  async function loadOT() {
    setLoading(true);

    const { data, error } = await supabase.rpc('admin_get_all_ot');

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const rows = Array.isArray(data) ? data : [];

    const mapped: OTEntry[] = rows.map((row: any) => ({
      id: row.id,
      staff_id: row.staff_id,
      employee_id:
        row.employee_id ??
        row.emp_id ??
        row.employeeId ??
        '',
      name: row.name ?? row.staff_name ?? '',
      ot_date: row.ot_date ?? '',
      start_time: row.start_time ?? '',
      end_time: row.end_time ?? '',
      ot_hours: Number(row.ot_hours ?? 0),
      reason: row.reason ?? row.ot_reason ?? '',
      comp_off_date: row.comp_off_date ?? null,
      comp_off_status: row.comp_off_status ?? null,
    }));

    setOtRecords(mapped);
  }

  async function loadStaffOT() {
    if (!session?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('ot_entries')
      .select('*')
      .eq('staff_id', session.id)
      .order('ot_date', { ascending: false })
      .order('id', { ascending: false });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStaffOTRecords((data ?? []) as OTEntry[]);
  }

  async function saveStaffOT() {
    if (!session?.id) return;

    setLoading(true);
    setMessage('');
    setErrorMessage('');

    try {
      if (!staffOTDate) {
        setErrorMessage('Please select OT Date.');
        return;
      }

      if (!staffOTStart || !staffOTEnd) {
        setErrorMessage('Please select Start Time and End Time.');
        return;
      }

      if (!staffOTReason.trim()) {
        setErrorMessage('Please enter OT Reason.');
        return;
      }

      const hours = calculateHours(
        staffOTStart,
        staffOTEnd
      );

      if (hours <= 0) {
        setErrorMessage('OT Hours must be greater than 0.');
        return;
      }

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

      if (error) throw error;

      setStaffOTDate('');
      setStaffOTStart('');
      setStaffOTEnd('');
      setStaffOTReason('');

      await loadStaffOT();

      setMessage('OT entry saved successfully.');
      setActivePage('my-ot');
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Unable to save OT entry.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveCompOff() {
    if (!compOffRow?.id) {
      setErrorMessage('Invalid OT record.');
      return;
    }

    if (!compOffDate) {
      setErrorMessage('Please select Comp-Off date.');
      return;
    }

    setLoading(true);
    setMessage('');
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('ot_entries')
        .update({
          comp_off_date: compOffDate,
          comp_off_status: 'Comp-Off Taken',
        })
        .eq('id', compOffRow.id);

      if (error) throw error;

      setCompOffRow(null);
      setCompOffDate('');

      if (session?.role === 'admin') {
        await loadOT();
      } else {
        await loadStaffOT();
      }

      setMessage('Comp-Off saved successfully.');
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Unable to save Comp-Off. Please check database permission/RLS.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function addStaff() {
    setLoading(true);
    setMessage('');
    setErrorMessage('');

    try {
      if (
        !newStaffEmployeeId.trim() ||
        !newStaffName.trim() ||
        !newStaffPassword.trim()
      ) {
        setErrorMessage(
          'Employee ID, Name and Password are required.'
        );
        return;
      }

      const { error } = await supabase.rpc(
        'admin_add_staff',
        {
          p_employee_id: newStaffEmployeeId.trim(),
          p_name: newStaffName.trim(),
          p_role: newStaffRole.trim(),
          p_department: newStaffDepartment.trim(),
          p_password: newStaffPassword,
        }
      );

      if (error) throw error;

      setNewStaffEmployeeId('');
      setNewStaffName('');
      setNewStaffRole('');
      setNewStaffDepartment('');
      setNewStaffPassword('');

      await loadStaff();

      setMessage('Staff added successfully.');
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Unable to add staff.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function removeStaff(id: number | undefined) {
    if (!id) return;

    const ok = window.confirm(
      'Are you sure you want to remove this staff?'
    );

    if (!ok) return;

    setLoading(true);
    setMessage('');
    setErrorMessage('');

    try {
      const { error } = await supabase.rpc(
        'admin_remove_staff',
        {
          p_staff_id: id,
        }
      );

      if (error) throw error;

      await loadStaff();

      setMessage('Staff removed successfully.');
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Unable to remove staff.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function makeAdmin(staffRow: Staff) {
    setLoading(true);
    setMessage('');
    setErrorMessage('');

    try {
      const { error } = await supabase.rpc(
        'admin_make_admin',
        {
          p_employee_id: staffRow.employee_id,
        }
      );

      if (error) throw error;

      await loadAdmins();

      setMessage('Staff promoted to Admin successfully.');
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Unable to make admin.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function removeAdmin(adminId: string | undefined) {
    if (!adminId) return;

    if (adminId === 'SAS102') {
      setErrorMessage(
        'Main Admin SAS102 cannot be removed.'
      );
      return;
    }

    const ok = window.confirm(
      `Remove admin ${adminId}?`
    );

    if (!ok) return;

    setLoading(true);
    setMessage('');
    setErrorMessage('');

    try {
      const { error } = await supabase.rpc(
        'admin_remove_admin',
        {
          p_admin_id: adminId,
        }
      );

      if (error) throw error;

      await loadAdmins();

      setMessage('Admin removed successfully.');
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Unable to remove admin.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function resetAdminPassword() {
    setLoading(true);
    setMessage('');
    setErrorMessage('');

    try {
      if (!resetAdminId.trim() || !resetAdminPassword) {
        setErrorMessage(
          'Admin ID and new password are required.'
        );
        return;
      }

      const { error } = await supabase.rpc(
        'admin_reset_admin_password',
        {
          p_admin_id: resetAdminId.trim(),
          p_new_password: resetAdminPassword,
        }
      );

      if (error) throw error;

      setResetAdminId('');
      setResetAdminPassword('');

      setMessage(
        'Admin password reset successfully.'
      );
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Unable to reset admin password.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function addAdmin() {
    setLoading(true);
    setMessage('');
    setErrorMessage('');

    try {
      if (
        !newAdminId.trim() ||
        !newAdminPassword.trim()
      ) {
        setErrorMessage(
          'Admin ID and password are required.'
        );
        return;
      }

      const { error } = await supabase.rpc(
        'admin_make_admin',
        {
          p_employee_id: newAdminId.trim(),
        }
      );

      if (error) throw error;

      await loadAdmins();

      setNewAdminId('');
      setNewAdminName('');
      setNewAdminPassword('');

      setMessage('Admin added successfully.');
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Unable to add admin.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    setLoading(true);
    setMessage('');
    setErrorMessage('');

    try {
      if (!oldPassword) {
        setErrorMessage(
          'Please enter your old password.'
        );
        return;
      }

      if (!newPassword) {
        setErrorMessage(
          'Please enter new password.'
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        setErrorMessage(
          'New password and confirm password do not match.'
        );
        return;
      }

      if (!session?.admin_id) {
        setErrorMessage(
          'Admin session not found.'
        );
        return;
      }

      const { error } = await supabase.rpc(
        'admin_change_password',
        {
          p_admin_id: session.admin_id,
          p_old_password: oldPassword,
          p_new_password: newPassword,
        }
      );

      if (error) throw error;

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setMessage(
        'Password changed successfully.'
      );
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Unable to change password.'
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredOT = useMemo(() => {
    return otRecords.filter((r) => {
      const search = searchText.trim().toLowerCase();

      const matchesSearch =
        !search ||
        String(r.employee_id ?? '')
          .toLowerCase()
          .includes(search) ||
        String(r.name ?? '')
          .toLowerCase()
          .includes(search) ||
        String(r.reason ?? '')
          .toLowerCase()
          .includes(search);

      const matchesFrom =
        !filterFrom ||
        !r.ot_date ||
        r.ot_date >= filterFrom;

      const matchesTo =
        !filterTo ||
        !r.ot_date ||
        r.ot_date <= filterTo;

      return (
        matchesSearch &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    otRecords,
    searchText,
    filterFrom,
    filterTo,
  ]);

  const totalOTHours = useMemo(() => {
    return otRecords.reduce(
      (sum, r) => sum + Number(r.ot_hours ?? 0),
      0
    );
  }, [otRecords]);

  const staffTotalHours = useMemo(() => {
    return staffOTRecords.reduce(
      (sum, r) => sum + Number(r.ot_hours ?? 0),
      0
    );
  }, [staffOTRecords]);

  const staffCompOffCount = useMemo(() => {
    return staffOTRecords.filter(
      (r) => r.comp_off_date
    ).length;
  }, [staffOTRecords]);

  const adminCompOffCount = useMemo(() => {
    return otRecords.filter(
      (r) => r.comp_off_date
    ).length;
  }, [otRecords]);

  if (!session) {
    return (
      <>
        <style>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Inter, Arial, sans-serif;
            background: #f4f7fb;
            color: #172033;
          }

          .login-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 25px;
            background:
              radial-gradient(circle at top left, #dfeaff 0, transparent 35%),
              radial-gradient(circle at bottom right, #e7f7f1 0, transparent 35%),
              #f4f7fb;
          }

          .login-card {
            width: 420px;
            max-width: 100%;
            background: #fff;
            border-radius: 20px;
            padding: 34px;
            box-shadow: 0 20px 60px rgba(25, 42, 70, .12);
          }

          .brand {
            text-align: center;
            margin-bottom: 28px;
          }

          .brand-icon {
            width: 62px;
            height: 62px;
            margin: auto;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #172a4d;
            color: white;
            font-size: 25px;
            font-weight: 800;
          }

          .brand h1 {
            margin: 16px 0 4px;
            font-size: 25px;
          }

          .brand p {
            margin: 0;
            color: #7b8799;
            font-size: 13px;
          }

          .login-tabs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 5px;
            background: #f1f4f8;
            border-radius: 10px;
            margin-bottom: 22px;
          }

          .login-tabs button {
            border: 0;
            background: transparent;
            padding: 11px;
            border-radius: 7px;
            cursor: pointer;
            font-weight: 600;
            color: #697586;
          }

          .login-tabs button.active {
            background: white;
            color: #172a4d;
            box-shadow: 0 2px 8px rgba(0,0,0,.06);
          }

          .field {
            margin-bottom: 15px;
          }

          .field label {
            display: block;
            margin-bottom: 7px;
            font-size: 13px;
            font-weight: 700;
            color: #465267;
          }

          .field input,
          .field select {
            width: 100%;
            border: 1px solid #dce2ea;
            border-radius: 9px;
            padding: 12px 13px;
            outline: none;
            background: white;
            font-size: 14px;
          }

          .field input:focus,
          .field select:focus {
            border-color: #536dfe;
            box-shadow: 0 0 0 3px rgba(83,109,254,.08);
          }

          .primary-btn {
            width: 100%;
            border: 0;
            border-radius: 9px;
            padding: 13px;
            background: #172a4d;
            color: white;
            cursor: pointer;
            font-weight: 700;
          }

          .primary-btn:disabled {
            opacity: .6;
            cursor: not-allowed;
          }

          .alert {
            padding: 11px 13px;
            border-radius: 8px;
            margin-bottom: 15px;
            font-size: 13px;
          }

          .alert.error {
            background: #fff0f0;
            color: #bd3333;
            border: 1px solid #ffd4d4;
          }

          .alert.success {
            background: #edfff5;
            color: #137a49;
            border: 1px solid #c9f0db;
          }

          .app {
            min-height: 100vh;
            display: flex;
            background: #f5f7fb;
          }

          .sidebar {
            width: 250px;
            background: #14233f;
            color: white;
            padding: 22px 15px;
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            overflow-y: auto;
          }

          .side-brand {
            display: flex;
            align-items: center;
            gap: 11px;
            padding: 5px 10px 25px;
          }

          .side-brand-icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: #fff;
            color: #14233f;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
          }

          .side-brand strong {
            display: block;
            font-size: 15px;
          }

          .side-brand span {
            font-size: 11px;
            color: #9eacc5;
          }

          .nav-title {
            color: #73829c;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 18px 10px 7px;
            font-weight: 700;
          }

          .nav-btn {
            width: 100%;
            border: 0;
            background: transparent;
            color: #c6d0e0;
            padding: 11px 12px;
            text-align: left;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 3px;
            font-size: 13px;
            font-weight: 600;
          }

          .nav-btn:hover,
          .nav-btn.active {
            background: rgba(255,255,255,.10);
            color: white;
          }

          .logout-btn {
            margin-top: 20px;
            color: #ffb7b7;
          }

          .main {
            margin-left: 250px;
            width: calc(100% - 250px);
            min-height: 100vh;
          }

          .topbar {
            height: 72px;
            background: white;
            border-bottom: 1px solid #e8edf3;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 30px;
          }

          .topbar h2 {
            margin: 0;
            font-size: 20px;
          }

          .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .avatar {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: #e7edff;
            color: #3449a8;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
          }

          .user-info strong {
            display: block;
            font-size: 13px;
          }

          .user-info span {
            display: block;
            font-size: 11px;
            color: #8993a3;
          }

          .content {
            padding: 28px;
          }

          .welcome {
            margin-bottom: 24px;
          }

          .welcome h1 {
            margin: 0 0 5px;
            font-size: 26px;
          }

          .welcome p {
            margin: 0;
            color: #7c8797;
            font-size: 13px;
          }

          .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 22px;
          }

          .stat-card {
            background: white;
            border: 1px solid #e9edf3;
            border-radius: 13px;
            padding: 19px;
            box-shadow: 0 5px 18px rgba(30,45,70,.03);
          }

          .stat-card .label {
            color: #8792a2;
            font-size: 12px;
            margin-bottom: 9px;
          }

          .stat-card .value {
            font-size: 25px;
            font-weight: 800;
            color: #17233b;
          }

          .card {
            background: white;
            border: 1px solid #e7ebf0;
            border-radius: 13px;
            padding: 20px;
            box-shadow: 0 5px 18px rgba(30,45,70,.03);
            margin-bottom: 20px;
          }

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 15px;
            margin-bottom: 17px;
          }

          .card-header h3 {
            margin: 0;
            font-size: 16px;
          }

          .card-header p {
            margin: 4px 0 0;
            color: #8993a2;
            font-size: 12px;
          }

          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }

          .grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
          }

          .grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 8px;
          }

          .btn {
            border: 0;
            border-radius: 8px;
            padding: 10px 15px;
            cursor: pointer;
            font-weight: 700;
            font-size: 12px;
          }

          .btn-primary {
            background: #172a4d;
            color: white;
          }

          .btn-secondary {
            background: #eef2f6;
            color: #3f4a5a;
          }

          .btn-danger {
            background: #fff0f0;
            color: #c73737;
          }

          .btn-green {
            background: #e8faf1;
            color: #13784b;
          }

          .table-wrap {
            overflow-x: auto;
            border: 1px solid #e9edf2;
            border-radius: 10px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            min-width: 850px;
          }

          th {
            background: #f7f9fb;
            color: #697586;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: .3px;
            font-weight: 800;
            padding: 12px;
            text-align: left;
            white-space: nowrap;
          }

          td {
            padding: 12px;
            border-top: 1px solid #edf0f4;
            color: #364152;
            font-size: 12px;
            white-space: nowrap;
          }

          tr:hover td {
            background: #fbfcfe;
          }

          .empty {
            text-align: center;
            padding: 35px;
            color: #8993a2;
            font-size: 13px;
          }

          .filter-row {
            display: grid;
            grid-template-columns: 1.5fr 1fr 1fr auto;
            gap: 10px;
            margin-bottom: 15px;
          }

          .filter-row input {
            border: 1px solid #dce2ea;
            border-radius: 8px;
            padding: 10px 11px;
            outline: none;
          }

          .comp-off-btn {
            border: 0;
            border-radius: 7px;
            background: #e9f0ff;
            color: #3158bd;
            padding: 7px 11px;
            cursor: pointer;
            font-weight: 700;
            font-size: 11px;
          }

          .comp-off-btn:hover {
            background: #dbe7ff;
          }

          .comp-off-date {
            display: inline-block;
            padding: 5px 8px;
            border-radius: 6px;
            background: #e8faf1;
            color: #13784b;
            font-weight: 700;
            font-size: 11px;
          }

          .status {
            display: inline-block;
            padding: 5px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
          }

          .status.pending {
            background: #fff5df;
            color: #a16c0a;
          }

          .status.done {
            background: #e8faf1;
            color: #13784b;
          }

          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(12, 24, 43, .50);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 9999;
          }

          .modal-card {
            width: 390px;
            max-width: 100%;
            background: white;
            border-radius: 15px;
            padding: 23px;
            box-shadow: 0 25px 70px rgba(0,0,0,.22);
          }

          .modal-card h3 {
            margin: 0 0 6px;
            font-size: 18px;
          }

          .modal-subtitle {
            margin: 0 0 20px;
            color: #8993a2;
            font-size: 12px;
          }

          .modal-card input {
            width: 100%;
            padding: 11px;
            border: 1px solid #dce2ea;
            border-radius: 8px;
            outline: none;
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 9px;
            margin-top: 20px;
          }

          @media(max-width: 1000px) {
            .stats {
              grid-template-columns: repeat(2, 1fr);
            }

            .grid-4 {
              grid-template-columns: repeat(2, 1fr);
            }

            .sidebar {
              width: 220px;
            }

            .main {
              margin-left: 220px;
              width: calc(100% - 220px);
            }
          }

          @media(max-width: 700px) {
            .sidebar {
              position: relative;
              width: 100%;
              min-height: auto;
            }

            .app {
              display: block;
            }

            .main {
              margin-left: 0;
              width: 100%;
            }

            .stats,
            .grid-2,
            .grid-3,
            .grid-4,
            .filter-row {
              grid-template-columns: 1fr;
            }

            .content {
              padding: 18px;
            }

            .topbar {
              padding: 0 18px;
            }
          }
        `}</style>

        <div className="login-page">
          <div className="login-card">
            <div className="brand">
              <div className="brand-icon">OT</div>
              <h1>OT & Comp-Off</h1>
              <p>Staff & Administration Portal</p>
            </div>

            <div className="login-tabs">
              <button
                className={
                  loginMode === 'staff'
                    ? 'active'
                    : ''
                }
                onClick={() => {
                  setLoginMode('staff');
                  setErrorMessage('');
                }}
              >
                Staff Login
              </button>

              <button
                className={
                  loginMode === 'admin'
                    ? 'active'
                    : ''
                }
                onClick={() => {
                  setLoginMode('admin');
                  setErrorMessage('');
                }}
              >
                Admin Login
              </button>
            </div>

            {errorMessage && (
              <div className="alert error">
                {errorMessage}
              </div>
            )}

            <div className="field">
              <label>
                {loginMode === 'admin'
                  ? 'Admin ID'
                  : 'Employee ID'}
              </label>

              <input
                value={loginId}
                onChange={(e) =>
                  setLoginId(e.target.value)
                }
                placeholder={
                  loginMode === 'admin'
                    ? 'Enter Admin ID'
                    : 'Enter Employee ID'
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
                onChange={(e) =>
                  setLoginPassword(e.target.value)
                }
                placeholder="Enter password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') login();
                }}
              />
            </div>

            <button
              className="primary-btn"
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

  const pageTitle =
    activePage === 'dashboard'
      ? 'Dashboard'
      : activePage === 'add-ot'
      ? 'Add OT'
      : activePage === 'my-ot'
      ? 'My OT Records'
      : activePage === 'staff'
      ? 'Staff Management'
      : activePage === 'ot-records'
      ? 'OT Records'
      : activePage === 'admins'
      ? 'Admin Management'
      : activePage === 'password'
      ? 'Change Password'
      : 'Dashboard';

  return (
    <>
      <style>{`
        /* Main application styling is included above.
           These additional styles keep buttons and form elements consistent. */
      `}</style>

      <div className="app">
        <aside className="sidebar">
          <div className="side-brand">
            <div className="side-brand-icon">OT</div>

            <div>
              <strong>OT & Comp-Off</strong>
              <span>
                {session.role === 'admin'
                  ? 'Administration'
                  : 'Staff Portal'}
              </span>
            </div>
          </div>

          <div className="nav-title">
            Main
          </div>

          <button
            className={`nav-btn ${
              activePage === 'dashboard'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActivePage('dashboard')
            }
          >
            Dashboard
          </button>

          {session.role === 'staff' && (
            <>
              <button
                className={`nav-btn ${
                  activePage === 'add-ot'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setActivePage('add-ot')
                }
              >
                Add OT
              </button>

              <button
                className={`nav-btn ${
                  activePage === 'my-ot'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setActivePage('my-ot')
                }
              >
                My OT Records
              </button>
            </>
          )}

          {session.role === 'admin' && (
            <>
              <div className="nav-title">
                Management
              </div>

              <button
                className={`nav-btn ${
                  activePage === 'staff'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setActivePage('staff')
                }
              >
                Staff Management
              </button>

              <button
                className={`nav-btn ${
                  activePage === 'ot-records'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setActivePage('ot-records')
                }
              >
                OT Records
              </button>

              <button
                className={`nav-btn ${
                  activePage === 'admins'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setActivePage('admins')
                }
              >
                Admin Management
              </button>

              <div className="nav-title">
                Security
              </div>

              <button
                className={`nav-btn ${
                  activePage === 'password'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setActivePage('password')
                }
              >
                Change Password
              </button>
            </>
          )}

          <button
            className="nav-btn logout-btn"
            onClick={logout}
          >
            Logout
          </button>
        </aside>

        <main className="main">
          <header className="topbar">
            <h2>{pageTitle}</h2>

            <div className="user-info">
              <div className="avatar">
                {(session.name ||
                  session.employee_id ||
                  session.admin_id ||
                  'U')
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {session.name ||
                    session.employee_id ||
                    session.admin_id}
                </strong>

                <span>
                  {session.role === 'admin'
                    ? `Admin ${
                        session.admin_id || ''
                      }`
                    : `Employee ${
                        session.employee_id || ''
                      }`}
                </span>
              </div>
            </div>
          </header>

          <section className="content">
            {message && (
              <div className="alert success">
                {message}
              </div>
            )}

            {errorMessage && (
              <div className="alert error">
                {errorMessage}
              </div>
            )}

            {/* DASHBOARD */}

            {activePage === 'dashboard' && (
              <>
                <div className="welcome">
                  <h1>
                    Welcome,{' '}
                    {session.name ||
                      session.employee_id ||
                      session.admin_id}
                  </h1>

                  <p>
                    Manage overtime and Comp-Off
                    records from one place.
                  </p>
                </div>

                {session.role === 'admin' ? (
                  <>
                    <div className="stats">
                      <div className="stat-card">
                        <div className="label">
                          Total Staff
                        </div>
                        <div className="value">
                          {staff.length}
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="label">
                          Total OT Records
                        </div>
                        <div className="value">
                          {otRecords.length}
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="label">
                          Total OT Hours
                        </div>
                        <div className="value">
                          {formatHours(
                            totalOTHours
                          )}
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="label">
                          Comp-Off Taken
                        </div>
                        <div className="value">
                          {adminCompOffCount}
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-header">
                        <div>
                          <h3>
                            Recent OT Records
                          </h3>
                          <p>
                            Latest overtime entries
                          </p>
                        </div>

                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            setActivePage(
                              'ot-records'
                            )
                          }
                        >
                          View All
                        </button>
                      </div>

                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Employee ID</th>
                              <th>Name</th>
                              <th>OT Date</th>
                              <th>Hours</th>
                              <th>Reason</th>
                              <th>Comp-Off</th>
                            </tr>
                          </thead>

                          <tbody>
                            {otRecords
                              .slice(0, 5)
                              .map((r) => (
                                <tr key={r.id}>
                                  <td>
                                    {r.employee_id ||
                                      '-'}
                                  </td>

                                  <td>
                                    {r.name || '-'}
                                  </td>

                                  <td>
                                    {r.ot_date || '-'}
                                  </td>

                                  <td>
                                    {formatHours(
                                      r.ot_hours
                                    )}
                                  </td>

                                  <td>
                                    {r.reason || '-'}
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
                                          setCompOffRow(
                                            r
                                          );
                                          setCompOffDate(
                                            ''
                                          );
                                        }}
                                      >
                                        Comp-Off
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}

                            {otRecords.length ===
                              0 && (
                              <tr>
                                <td
                                  colSpan={6}
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
                ) : (
                  <>
                    <div className="stats">
                      <div className="stat-card">
                        <div className="label">
                          My OT Records
                        </div>
                        <div className="value">
                          {
                            staffOTRecords.length
                          }
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="label">
                          Total OT Hours
                        </div>
                        <div className="value">
                          {formatHours(
                            staffTotalHours
                          )}
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="label">
                          Comp-Off Taken
                        </div>
                        <div className="value">
                          {staffCompOffCount}
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="label">
                          Pending Comp-Off
                        </div>
                        <div className="value">
                          {staffOTRecords.filter(
                            (r) =>
                              !r.comp_off_date
                          ).length}
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-header">
                        <div>
                          <h3>
                            My Recent OT
                          </h3>
                          <p>
                            Your latest OT entries
                          </p>
                        </div>

                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            setActivePage(
                              'add-ot'
                            )
                          }
                        >
                          Add OT
                        </button>
                      </div>

                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>OT Date</th>
                              <th>Start</th>
                              <th>End</th>
                              <th>Hours</th>
                              <th>Reason</th>
                              <th>Comp-Off</th>
                            </tr>
                          </thead>

                          <tbody>
                            {staffOTRecords
                              .slice(0, 5)
                              .map((r) => (
                                <tr key={r.id}>
                                  <td>
                                    {r.ot_date}
                                  </td>

                                  <td>
                                    {r.start_time}
                                  </td>

                                  <td>
                                    {r.end_time}
                                  </td>

                                  <td>
                                    {formatHours(
                                      r.ot_hours
                                    )}
                                  </td>

                                  <td>
                                    {r.reason ||
                                      '-'}
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
                                          setCompOffRow(
                                            r
                                          );
                                          setCompOffDate(
                                            ''
                                          );
                                        }}
                                      >
                                        Comp-Off
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}

                            {staffOTRecords.length ===
                              0 && (
                              <tr>
                                <td
                                  colSpan={6}
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
              </>
            )}

            {/* STAFF ADD OT */}

            {activePage === 'add-ot' &&
              session.role === 'staff' && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h3>Add OT Entry</h3>
                      <p>
                        Enter your overtime details.
                      </p>
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="field">
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

                    <div className="field">
                      <label>OT Reason</label>

                      <input
                        value={staffOTReason}
                        onChange={(e) =>
                          setStaffOTReason(
                            e.target.value
                          )
                        }
                        placeholder="HOLIDAY WORK / SATURDAY / etc."
                      />
                    </div>

                    <div className="field">
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

                    <div className="field">
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
                  </div>

                  <div
                    className="card"
                    style={{
                      background: '#f7f9fc',
                      marginTop: 10,
                    }}
                  >
                    <div
                      style={{
                        color: '#7b8798',
                        fontSize: 12,
                      }}
                    >
                      Calculated OT Hours
                    </div>

                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        marginTop: 4,
                      }}
                    >
                      {formatHours(
                        calculateHours(
                          staffOTStart,
                          staffOTEnd
                        )
                      )}{' '}
                      hrs
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setStaffOTDate('');
                        setStaffOTStart('');
                        setStaffOTEnd('');
                        setStaffOTReason('');
                      }}
                    >
                      Clear
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={saveStaffOT}
                      disabled={loading}
                    >
                      {loading
                        ? 'Saving...'
                        : 'Save OT'}
                    </button>
                  </div>
                </div>
              )}

            {/* STAFF MY OT */}

            {activePage === 'my-ot' &&
              session.role === 'staff' && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h3>My OT Records</h3>
                      <p>
                        Every OT entry has its own
                        Comp-Off option.
                      </p>
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        setActivePage('add-ot')
                      }
                    >
                      + Add OT
                    </button>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>OT Date</th>
                          <th>Start Time</th>
                          <th>End Time</th>
                          <th>OT Hours</th>
                          <th>Reason</th>
                          <th>Comp-Off Date</th>
                          <th>Status</th>
                          <th>Comp-Off</th>
                        </tr>
                      </thead>

                      <tbody>
                        {staffOTRecords.map(
                          (r) => (
                            <tr key={r.id}>
                              <td>
                                {r.ot_date || '-'}
                              </td>

                              <td>
                                {r.start_time || '-'}
                              </td>

                              <td>
                                {r.end_time || '-'}
                              </td>

                              <td>
                                {formatHours(
                                  r.ot_hours
                                )}
                              </td>

                              <td>
                                {r.reason || '-'}
                              </td>

                              <td>
                                {r.comp_off_date ||
                                  '-'}
                              </td>

                              <td>
                                {r.comp_off_date ? (
                                  <span className="status done">
                                    Comp-Off Taken
                                  </span>
                                ) : (
                                  <span className="status pending">
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
                                      setCompOffRow(
                                        r
                                      );
                                      setCompOffDate(
                                        ''
                                      );
                                      setMessage('');
                                      setErrorMessage(
                                        ''
                                      );
                                    }}
                                  >
                                    Comp-Off
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        )}

                        {staffOTRecords.length ===
                          0 && (
                          <tr>
                            <td
                              colSpan={8}
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
              )}

            {/* ADMIN STAFF MANAGEMENT */}

            {activePage === 'staff' &&
              session.role === 'admin' && (
                <>
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h3>Add New Staff</h3>
                        <p>
                          Create staff login details.
                        </p>
                      </div>
                    </div>

                    <div className="grid-4">
                      <div className="field">
                        <label>
                          Employee ID
                        </label>

                        <input
                          value={
                            newStaffEmployeeId
                          }
                          onChange={(e) =>
                            setNewStaffEmployeeId(
                              e.target.value
                            )
                          }
                          placeholder="Employee ID"
                        />
                      </div>

                      <div className="field">
                        <label>Name</label>

                        <input
                          value={newStaffName}
                          onChange={(e) =>
                            setNewStaffName(
                              e.target.value
                            )
                          }
                          placeholder="Staff Name"
                        />
                      </div>

                      <div className="field">
                        <label>Role</label>

                        <input
                          value={newStaffRole}
                          onChange={(e) =>
                            setNewStaffRole(
                              e.target.value
                            )
                          }
                          placeholder="Role"
                        />
                      </div>

                      <div className="field">
                        <label>
                          Department
                        </label>

                        <input
                          value={
                            newStaffDepartment
                          }
                          onChange={(e) =>
                            setNewStaffDepartment(
                              e.target.value
                            )
                          }
                          placeholder="Department"
                        />
                      </div>
                    </div>

                    <div className="grid-2">
                      <div className="field">
                        <label>Password</label>

                        <input
                          type="password"
                          value={
                            newStaffPassword
                          }
                          onChange={(e) =>
                            setNewStaffPassword(
                              e.target.value
                            )
                          }
                          placeholder="Initial password"
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        className="btn btn-primary"
                        onClick={addStaff}
                        disabled={loading}
                      >
                        Add Staff
                      </button>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h3>Staff List</h3>
                        <p>
                          Manage registered staff.
                        </p>
                      </div>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Employee ID</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Department</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {staff.map((s) => (
                            <tr key={s.id}>
                              <td>
                                {s.employee_id ||
                                  '-'}
                              </td>

                              <td>
                                {s.name || '-'}
                              </td>

                              <td>
                                {s.role || '-'}
                              </td>

                              <td>
                                {s.department ||
                                  '-'}
                              </td>

                              <td>
                                <button
                                  className="btn btn-green"
                                  onClick={() =>
                                    makeAdmin(s)
                                  }
                                >
                                  Make Admin
                                </button>

                                <button
                                  className="btn btn-danger"
                                  style={{
                                    marginLeft: 7,
                                  }}
                                  onClick={() =>
                                    removeStaff(
                                      s.id
                                    )
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

            {/* ADMIN OT RECORDS */}

            {activePage === 'ot-records' &&
              session.role === 'admin' && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h3>OT Records</h3>
                      <p>
                        All staff overtime records.
                      </p>
                    </div>

                    <button
                      className="btn btn-green"
                      onClick={() =>
                        downloadCSV(filteredOT)
                      }
                    >
                      Export CSV
                    </button>
                  </div>

                  <div className="filter-row">
                    <input
                      value={searchText}
                      onChange={(e) =>
                        setSearchText(
                          e.target.value
                        )
                      }
                      placeholder="Search employee, name or reason..."
                    />

                    <input
                      type="date"
                      value={filterFrom}
                      onChange={(e) =>
                        setFilterFrom(
                          e.target.value
                        )
                      }
                    />

                    <input
                      type="date"
                      value={filterTo}
                      onChange={(e) =>
                        setFilterTo(
                          e.target.value
                        )
                      }
                    />

                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setSearchText('');
                        setFilterFrom('');
                        setFilterTo('');
                      }}
                    >
                      Clear
                    </button>
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
                          <th>Comp-Off Date</th>
                          <th>Status</th>
                          <th>Comp-Off</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredOT.map((r) => (
                          <tr key={r.id}>
                            <td>
                              {r.employee_id ||
                                '-'}
                            </td>

                            <td>
                              {r.name || '-'}
                            </td>

                            <td>
                              {r.ot_date || '-'}
                            </td>

                            <td>
                              {r.start_time || '-'}
                            </td>

                            <td>
                              {r.end_time || '-'}
                            </td>

                            <td>
                              {formatHours(
                                r.ot_hours
                              )}
                            </td>

                            <td>
                              {r.reason || '-'}
                            </td>

                            <td>
                              {r.comp_off_date ||
                                '-'}
                            </td>

                            <td>
                              {r.comp_off_date ? (
                                <span className="status done">
                                  Comp-Off Taken
                                </span>
                              ) : (
                                <span className="status pending">
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
                                    setCompOffRow(
                                      r
                                    );
                                    setCompOffDate(
                                      ''
                                    );
                                    setMessage('');
                                    setErrorMessage(
                                      ''
                                    );
                                  }}
                                >
                                  Comp-Off
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}

                        {filteredOT.length ===
                          0 && (
                          <tr>
                            <td
                              colSpan={10}
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
              )}

            {/* ADMIN MANAGEMENT */}

            {activePage === 'admins' &&
              session.role === 'admin' && (
                <>
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h3>
                          Admin Management
                        </h3>
                        <p>
                          Manage administrator
                          accounts.
                        </p>
                      </div>
                    </div>

                    <div className="grid-3">
                      <div className="field">
                        <label>Admin ID</label>

                        <input
                          value={newAdminId}
                          onChange={(e) =>
                            setNewAdminId(
                              e.target.value
                            )
                          }
                          placeholder="Admin ID"
                        />
                      </div>

                      <div className="field">
                        <label>Name</label>

                        <input
                          value={newAdminName}
                          onChange={(e) =>
                            setNewAdminName(
                              e.target.value
                            )
                          }
                          placeholder="Name"
                        />
                      </div>

                      <div className="field">
                        <label>
                          Initial Password
                        </label>

                        <input
                          type="password"
                          value={
                            newAdminPassword
                          }
                          onChange={(e) =>
                            setNewAdminPassword(
                              e.target.value
                            )
                          }
                          placeholder="Password"
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        className="btn btn-primary"
                        onClick={addAdmin}
                        disabled={loading}
                      >
                        Add Admin
                      </button>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h3>Admin List</h3>
                        <p>
                          Existing administrator
                          accounts.
                        </p>
                      </div>
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
                            <tr
                              key={
                                a.id ??
                                a.admin_id
                              }
                            >
                              <td>
                                {a.admin_id ||
                                  '-'}
                              </td>

                              <td>
                                {a.name || '-'}
                              </td>

                              <td>
                                {a.active ===
                                false
                                  ? 'Inactive'
                                  : 'Active'}
                              </td>

                              <td>
                                {a.admin_id ===
                                'SAS102' ? (
                                  <span
                                    style={{
                                      color:
                                        '#8993a2',
                                      fontSize:
                                        11,
                                    }}
                                  >
                                    Main Admin
                                  </span>
                                ) : (
                                  <button
                                    className="btn btn-danger"
                                    onClick={() =>
                                      removeAdmin(
                                        a.admin_id
                                      )
                                    }
                                  >
                                    Remove Admin
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}

                          {admins.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
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

                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h3>
                          Reset Admin Password
                        </h3>
                        <p>
                          Reset another admin's
                          password.
                        </p>
                      </div>
                    </div>

                    <div className="grid-2">
                      <div className="field">
                        <label>Admin ID</label>

                        <input
                          value={resetAdminId}
                          onChange={(e) =>
                            setResetAdminId(
                              e.target.value
                            )
                          }
                          placeholder="Admin ID"
                        />
                      </div>

                      <div className="field">
                        <label>
                          New Password
                        </label>

                        <input
                          type="password"
                          value={
                            resetAdminPassword
                          }
                          onChange={(e) =>
                            setResetAdminPassword(
                              e.target.value
                            )
                          }
                          placeholder="New password"
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        className="btn btn-primary"
                        onClick={
                          resetAdminPassword
                        }
                        disabled={loading}
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                </>
              )}

            {/* CHANGE PASSWORD */}

            {activePage === 'password' &&
              session.role === 'admin' && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h3>
                        Change Password
                      </h3>
                      <p>
                        Old password is required
                        before changing the
                        password.
                      </p>
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="field">
                      <label>
                        Old Password
                      </label>

                      <input
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

                    <div />

                    <div className="field">
                      <label>
                        New Password
                      </label>

                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) =>
                          setNewPassword(
                            e.target.value
                          )
                        }
                        placeholder="Enter new password"
                      />
                    </div>

                    <div className="field">
                      <label>
                        Confirm New Password
                      </label>

                      <input
                        type="password"
                        value={
                          confirmPassword
                        }
                        onChange={(e) =>
                          setConfirmPassword(
                            e.target.value
                          )
                        }
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
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
              )}
          </section>
        </main>
      </div>

      {/* COMPOFF MODAL - STAFF + ADMIN */}

      {compOffRow && (
        <div
          className="modal-overlay"
          onClick={() => {
            setCompOffRow(null);
            setCompOffDate('');
          }}
        >
          <div
            className="modal-card"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h3>Assign Comp-Off</h3>

            <p className="modal-subtitle">
              Select the Comp-Off date for this
              OT entry.
            </p>

            <div
              style={{
                background: '#f6f8fb',
                borderRadius: 9,
                padding: 12,
                marginBottom: 16,
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              <div>
                <strong>OT Date:</strong>{' '}
                {compOffRow.ot_date || '-'}
              </div>

              <div>
                <strong>OT Hours:</strong>{' '}
                {formatHours(
                  compOffRow.ot_hours
                )}
              </div>

              <div>
                <strong>Reason:</strong>{' '}
                {compOffRow.reason || '-'}
              </div>
            </div>

            <div className="field">
              <label>
                Comp-Off Date
              </label>

              <input
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
                className="btn btn-secondary"
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
                disabled={
                  loading || !compOffDate
                }
              >
                {loading
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
