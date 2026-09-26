```tsx
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
  id: number;
  employee_id: string;
  employee_name?: string;
  ot_date: string;
  ot_hours: number;
  remarks?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const MAIN_ADMIN_ID = 'SAS102';
const SESSION_KEY = 'ot_details_session';

type Page =
  | 'login'
  | 'admin-dashboard'
  | 'staff-dashboard'
  | 'staff-details'
  | 'add-employee'
  | 'ot-records'
  | 'admin-management'
  | 'change-password';

type LoginMode = 'staff' | 'admin';

export default function Home() {
  const [page, setPage] = useState<Page>('login');
  const [loginMode, setLoginMode] = useState<LoginMode>('staff');

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');

  const [session, setSession] = useState<{
    id: number;
    employee_id: string;
    name: string;
    role: string;
  } | null>(null);

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [otList, setOtList] = useState<OTEntry[]>([]);
  const [admins, setAdmins] = useState<Staff[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');

  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed?.employee_id) {
          setSession(parsed);

          if (parsed.role === 'admin') {
            setPage('admin-dashboard');
          } else {
            setPage('staff-dashboard');
          }
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const activeStaff = useMemo(
    () =>
      staffList.filter(
        (item) => item.access_enabled && item.role !== 'admin'
      ),
    [staffList]
  );

  const totalOTHours = useMemo(
    () =>
      otList.reduce(
        (sum, item) => sum + Number(item.ot_hours || 0),
        0
      ),
    [otList]
  );

  const filteredOT = useMemo(() => {
    return otList.filter((item) => {
      if (fromDate && item.ot_date < fromDate) return false;
      if (toDate && item.ot_date > toDate) return false;
      return true;
    });
  }, [otList, fromDate, toDate]);

  function clearMessage() {
    setMessage('');
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);

    setSession(null);
    setEmployeeId('');
    setPassword('');
    setLoginMessage('');
    setLoginMode('staff');
    setPage('login');

    setStaffList([]);
    setOtList([]);
    setAdmins([]);
  }

  function saveSession(data: {
    id: number;
    employee_id: string;
    name: string;
    role: string;
  }) {
    setSession(data);
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));

    if (data.role === 'admin') {
      setPage('admin-dashboard');
    } else {
      setPage('staff-dashboard');
    }
  }

  async function handleLogin() {
    setLoginMessage('');

    const id = employeeId.trim();

    if (!id) {
      setLoginMessage('Employee ID is required');
      return;
    }

    if (loginMode === 'admin' && !password) {
      setLoginMessage('Admin password is required');
      return;
    }

    setLoginLoading(true);

    try {
      if (loginMode === 'admin') {
        const { data, error } = await supabase.rpc('admin_login', {
          p_employee_id: id,
          p_password: password,
        });

        if (error) {
          setLoginMessage(error.message);
          return;
        }

        if (!data?.success) {
          setLoginMessage(data?.message || 'Admin login failed');
          return;
        }

        saveSession({
          id: Number(data.staff_id),
          employee_id: data.employee_id,
          name: data.name,
          role: 'admin',
        });

        setEmployeeId('');
        setPassword('');
        return;
      }

      const { data, error } = await supabase
        .from('STAFF')
        .select(
          'id, employee_id, name, access_enabled, role'
        )
        .eq('employee_id', id)
        .eq('access_enabled', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        setLoginMessage(error.message);
        return;
      }

      if (!data) {
        setLoginMessage('Employee ID not authorized');
        return;
      }

      if (data.role === 'admin') {
        setLoginMessage(
          'This is an Admin account. Please use Admin Login.'
        );
        return;
      }

      saveSession({
        id: data.id,
        employee_id: data.employee_id,
        name: data.name,
        role: data.role,
      });

      setEmployeeId('');
      setPassword('');
    } catch (err) {
      setLoginMessage(
        err instanceof Error ? err.message : 'Login failed'
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadStaff() {
    if (!session?.employee_id) return;

    setLoading(true);
    clearMessage();

    try {
      const { data, error } = await supabase.rpc(
        'admin_get_staff',
        {
          p_admin_employee_id: session.employee_id,
        }
      );

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data?.success) {
        setMessage(data?.message || 'Unable to load staff');
        return;
      }

      setStaffList(data.staff || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadOT() {
    if (!session?.employee_id) return;

    setLoading(true);
    clearMessage();

    try {
      const { data, error } = await supabase.rpc(
        'admin_get_all_ot',
        {
          p_admin_employee_id: session.employee_id,
        }
      );

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data?.success) {
        setMessage(data?.message || 'Unable to load OT records');
        return;
      }

      setOtList(data.records || data.ot_records || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadAdmins() {
    if (!session?.employee_id) return;

    setLoading(true);
    clearMessage();

    try {
      const { data, error } = await supabase.rpc(
        'admin_get_admins',
        {
          p_admin_employee_id: session.employee_id,
        }
      );

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data?.success) {
        setMessage(data?.message || 'Unable to load admins');
        return;
      }

      setAdmins(data.admins || []);
    } finally {
      setLoading(false);
    }
  }

  async function addEmployee() {
    if (!session?.employee_id) return;

    clearMessage();

    if (!newEmployeeId.trim() || !newEmployeeName.trim()) {
      setMessage('Employee ID and Name are required');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc(
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
        setMessage(data?.message || 'Unable to add employee');
        return;
      }

      setMessage('Employee added successfully');

      setNewEmployeeId('');
      setNewEmployeeName('');

      await loadStaff();
    } finally {
      setLoading(false);
    }
  }

  async function removeStaff() {
    if (!session?.employee_id) return;

    if (!selectedEmployee) {
      setMessage('Please select a staff member');
      return;
    }

    const selected = staffList.find(
      (item) => String(item.id) === selectedEmployee
    );

    if (!selected) {
      setMessage('Staff member not found');
      return;
    }

    if (!confirm(`Remove ${selected.name} (${selected.employee_id})?`)) {
      return;
    }

    setLoading(true);
    clearMessage();

    try {
      const { data, error } = await supabase.rpc(
        'admin_remove_staff',
        {
          p_admin_employee_id: session.employee_id,
          p_staff_id: Number(selectedEmployee),
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
      setSelectedEmployee('');

      await loadStaff();
    } finally {
      setLoading(false);
    }
  }

  async function makeAdmin() {
    if (!session?.employee_id) return;

    if (!selectedEmployee) {
      setMessage('Please select an employee');
      return;
    }

    if (!newAdminPassword || !confirmAdminPassword) {
      setMessage('New admin password and confirm password are required');
      return;
    }

    setLoading(true);
    clearMessage();

    try {
      const { data, error } = await supabase.rpc(
        'admin_make_admin',
        {
          p_admin_employee_id: session.employee_id,
          p_staff_id: Number(selectedEmployee),
          p_new_password: newAdminPassword,
          p_confirm_password: confirmAdminPassword,
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

      setMessage('Employee is now an admin');

      setSelectedEmployee('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');

      await loadStaff();
      await loadAdmins();
    } finally {
      setLoading(false);
    }
  }

  async function removeAdmin() {
    if (!session?.employee_id) return;

    if (!selectedAdminId) {
      setMessage('Please select an admin');
      return;
    }

    const selected = admins.find(
      (item) => String(item.id) === selectedAdminId
    );

    if (!selected) {
      setMessage('Admin not found');
      return;
    }

    if (
      selected.employee_id.toUpperCase() === MAIN_ADMIN_ID
    ) {
      setMessage('Main Admin cannot be removed');
      return;
    }

    if (!confirm(`Remove admin access from ${selected.name}?`)) {
      return;
    }

    setLoading(true);
    clearMessage();

    try {
      const { data, error } = await supabase.rpc(
        'admin_remove_admin',
        {
          p_admin_employee_id: session.employee_id,
          p_target_admin_id: Number(selectedAdminId),
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
      setSelectedAdminId('');

      await loadAdmins();
      await loadStaff();
    } finally {
      setLoading(false);
    }
  }

  async function resetAdminPassword() {
    if (!session?.employee_id) return;

    if (!selectedAdminId) {
      setMessage('Please select an admin');
      return;
    }

    if (!newAdminPassword || !confirmAdminPassword) {
      setMessage('New password and confirm password are required');
      return;
    }

    setLoading(true);
    clearMessage();

    try {
      const { data, error } = await supabase.rpc(
        'admin_reset_admin_password',
        {
          p_admin_employee_id: session.employee_id,
          p_target_admin_id: Number(selectedAdminId),
          p_new_password: newAdminPassword,
          p_confirm_password: confirmAdminPassword,
        }
      );

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data?.success) {
        setMessage(
          data?.message || 'Unable to reset admin password'
        );
        return;
      }

      setMessage('Admin password reset successfully');

      setSelectedAdminId('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } finally {
      setLoading(false);
    }
  }

  async function changeMyPassword() {
    if (!session?.employee_id) return;

    setLoading(true);
    clearMessage();

    try {
      const { data, error } = await supabase.rpc(
        'admin_change_password',
        {
          p_admin_employee_id: session.employee_id,
          p_old_password: oldPassword,
          p_new_password: newPassword,
          p_confirm_password: confirmPassword,
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

      setMessage('Password changed successfully');

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!filteredOT.length) {
      setMessage('No OT records available to download');
      return;
    }

    const header = [
      'Employee ID',
      'Employee Name',
      'OT Date',
      'OT Hours',
      'Remarks',
    ];

    const rows = filteredOT.map((item) => [
      item.employee_id,
      item.employee_name || '',
      item.ot_date,
      item.ot_hours,
      item.remarks || '',
    ]);

    const csv = [
      header,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? '').replaceAll('"', '""')}"`
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
    a.download = `OT_DETAILS_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  function openAdminDashboard() {
    setPage('admin-dashboard');
    clearMessage();
  }

  function openStaffDetails() {
    setPage('staff-details');
    loadStaff();
  }

  function openAddEmployee() {
    setPage('add-employee');
    clearMessage();
  }

  function openOTRecords() {
    setPage('ot-records');
    loadOT();
  }

  function openAdminManagement() {
    setPage('admin-management');
    loadAdmins();
    loadStaff();
  }

  function openChangePassword() {
    setPage('change-password');
    clearMessage();
  }

  function backToDashboard() {
    if (session?.role === 'admin') {
      setPage('admin-dashboard');
    } else {
      setPage('staff-dashboard');
    }

    clearMessage();
  }

  if (page === 'login') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
              <div className="text-xs font-bold tracking-[0.25em] text-blue-700 mb-3">
                OT DETAILS
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                {loginMode === 'staff'
                  ? 'Staff Login'
                  : 'Admin Login'}
              </h1>

              <p className="text-sm text-slate-500 mt-2">
                {loginMode === 'staff'
                  ? 'Enter your Employee ID to continue'
                  : 'Authorized administrators only'}
              </p>
            </div>

            <div className="p-8">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Employee ID
              </label>

              <input
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLogin();
                }}
                placeholder="Enter Employee ID"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

              {loginMode === 'admin' && (
                <>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 mt-5">
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLogin();
                    }}
                    placeholder="Enter Admin Password"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </>
              )}

              {loginMessage && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                  {loginMessage}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full mt-6 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3.5 transition"
              >
                {loginLoading
                  ? 'Please wait...'
                  : loginMode === 'staff'
                  ? 'Staff Login'
                  : 'Admin Login'}
              </button>

              {loginMode === 'staff' ? (
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('admin');
                    setLoginMessage('');
                    setPassword('');
                  }}
                  className="w-full mt-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3.5 transition"
                >
                  Admin Login
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('staff');
                    setLoginMessage('');
                    setPassword('');
                  }}
                  className="w-full mt-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3.5 transition"
                >
                  ← Back to Staff Login
                </button>
              )}

              <div className="text-center text-xs text-slate-400 mt-7">
                OT DETAILS • Secure Management Portal
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (page === 'staff-dashboard') {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold tracking-[0.2em] text-blue-700">
                OT DETAILS
              </div>
              <div className="font-bold text-slate-900">
                Staff Portal
              </div>
            </div>

            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-sm"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="mb-8">
            <p className="text-sm text-slate-500">
              Welcome
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              {session?.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Employee ID: {session?.employee_id}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <DashboardCard
              title="Add OT"
              description="Submit your overtime details."
              onClick={() => setMessage('Add OT module coming next.')}
            />

            <DashboardCard
              title="My OT Records"
              description="View your submitted OT records."
              onClick={() =>
                setMessage(
                  'My OT Records module will be connected next.'
                )
              }
            />

            <DashboardCard
              title="Logout"
              description="Securely logout from the portal."
              onClick={logout}
            />
          </div>

          {message && (
            <div className="mt-6 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3">
              {message}
            </div>
          )}
        </div>
      </main>
    );
  }

  if (page === 'admin-dashboard') {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold tracking-[0.2em] text-blue-700">
                OT DETAILS
              </div>
              <div className="font-bold text-slate-900">
                Admin Portal
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-semibold text-slate-900">
                  {session?.name}
                </div>
                <div className="text-xs text-slate-500">
                  {session?.employee_id}
                </div>
              </div>

              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="mb-8">
            <div className="text-sm font-semibold text-blue-700">
              OT DETAILS
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              Admin Dashboard
            </h1>
            <p className="text-slate-500 mt-2">
              Manage employees, administrators and OT records.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            <OverviewCard
              title="Active Staff"
              value={activeStaff.length}
            />

            <OverviewCard
              title="OT Records"
              value={otList.length}
            />

            <OverviewCard
              title="OT Hours"
              value={totalOTHours}
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard
              title="Staff Details"
              description="View saved staff and access status."
              onClick={openStaffDetails}
            />

            <DashboardCard
              title="Add Employee"
              description="Add a new employee to the portal."
              onClick={openAddEmployee}
            />

            <DashboardCard
              title="OT Records"
              description="View, filter and download OT records."
              onClick={openOTRecords}
            />

            <DashboardCard
              title="Admin Management"
              description="Make admin, remove admin and manage staff access."
              onClick={openAdminManagement}
            />

            <DashboardCard
              title="Change Password"
              description="Change your own admin password."
              onClick={openChangePassword}
            />

            <DashboardCard
              title="Logout"
              description="Securely logout from the portal."
              onClick={logout}
            />
          </div>
        </div>

        <footer className="text-center text-xs text-slate-400 py-8">
          OT DETAILS • Management Portal
        </footer>
      </main>
    );
  }

  if (page === 'staff-details') {
    return (
      <AdminPageShell
        title="Staff Details"
        onBack={backToDashboard}
        onLogout={logout}
      >
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Saved Staff
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Active and inactive employee accounts
              </p>
            </div>

            <button
              onClick={loadStaff}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-3">Employee ID</th>
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-left px-5 py-3">Access</th>
                </tr>
              </thead>

              <tbody>
                {staffList.map((staff) => (
                  <tr
                    key={staff.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-4 font-semibold">
                      {staff.employee_id}
                    </td>
                    <td className="px-5 py-4">
                      {staff.name}
                    </td>
                    <td className="px-5 py-4 capitalize">
                      {staff.role}
                    </td>
                    <td className="px-5 py-4">
                      {staff.access_enabled ? (
                        <span className="text-green-700 font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="text-red-600 font-semibold">
                          Disabled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {!staffList.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      No staff records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminPageShell>
    );
  }

  if (page === 'add-employee') {
    return (
      <AdminPageShell
        title="Add Employee"
        onBack={backToDashboard}
        onLogout={logout}
      >
        <div className="max-w-xl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Employee ID
            </label>

            <input
              value={newEmployeeId}
              onChange={(e) =>
                setNewEmployeeId(e.target.value)
              }
              placeholder="Enter Employee ID"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <label className="block text-sm font-semibold text-slate-700 mb-2 mt-5">
              Employee Name
            </label>

            <input
              value={newEmployeeName}
              onChange={(e) =>
                setNewEmployeeName(e.target.value)
              }
              placeholder="Enter Employee Name"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <button
              onClick={addEmployee}
              disabled={loading}
              className="w-full mt-6 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3.5"
            >
              {loading ? 'Adding...' : 'Add Employee'}
            </button>

            {message && (
              <div className="mt-5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 text-sm">
                {message}
              </div>
            )}
          </div>
        </div>
      </AdminPageShell>
    );
  }

  if (page === 'ot-records') {
    return (
      <AdminPageShell
        title="OT Records"
        onBack={backToDashboard}
        onLogout={logout}
      >
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  From Date
                </label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  To Date
                </label>

                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              <button
                onClick={loadOT}
                disabled={loading}
                className="px-5 py-3 rounded-xl bg-blue-700 text-white font-semibold"
              >
                View Records
              </button>

              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="px-5 py-3 rounded-xl border border-slate-300 font-semibold"
              >
                Clear
              </button>

              <button
                onClick={downloadCSV}
                className="px-5 py-3 rounded-xl border border-slate-300 font-semibold hover:bg-slate-50"
              >
                Download CSV
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <OverviewCard
              title="Records"
              value={filteredOT.length}
            />

            <OverviewCard
              title="Total OT Hours"
              value={filteredOT.reduce(
                (sum, item) =>
                  sum + Number(item.ot_hours || 0),
                0
              )}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-5 py-3">
                      Employee ID
                    </th>
                    <th className="text-left px-5 py-3">
                      Employee Name
                    </th>
                    <th className="text-left px-5 py-3">
                      OT Date
                    </th>
                    <th className="text-left px-5 py-3">
                      OT Hours
                    </th>
                    <th className="text-left px-5 py-3">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOT.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-5 py-4 font-semibold">
                        {item.employee_id}
                      </td>
                      <td className="px-5 py-4">
                        {item.employee_name || '-'}
                      </td>
                      <td className="px-5 py-4">
                        {item.ot_date}
                      </td>
                      <td className="px-5 py-4">
                        {item.ot_hours}
                      </td>
                      <td className="px-5 py-4">
                        {item.remarks || '-'}
                      </td>
                    </tr>
                  ))}

                  {!filteredOT.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-slate-500"
                      >
                        No OT records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminPageShell>
    );
  }

  if (page === 'admin-management') {
    const normalStaff = staffList.filter(
      (item) =>
        item.role !== 'admin' &&
        item.access_enabled
    );

    return (
      <AdminPageShell
        title="Admin Management"
        onBack={backToDashboard}
        onLogout={logout}
      >
        <div className="grid lg:grid-cols-2 gap-6">
          <ManagementCard title="Make Admin">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Employee
            </label>

            <select
              value={selectedEmployee}
              onChange={(e) =>
                setSelectedEmployee(e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">Select Employee</option>

              {normalStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.employee_id} - {staff.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-slate-700 mb-2 mt-5">
              New Admin Password
            </label>

            <input
              type="password"
              value={newAdminPassword}
              onChange={(e) =>
                setNewAdminPassword(e.target.value)
              }
              placeholder="Minimum 6 characters"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />

            <label className="block text-sm font-semibold text-slate-700 mb-2 mt-5">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmAdminPassword}
              onChange={(e) =>
                setConfirmAdminPassword(e.target.value)
              }
              placeholder="Confirm password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />

            <button
              onClick={makeAdmin}
              disabled={loading}
              className="w-full mt-5 rounded-xl bg-blue-700 text-white font-semibold py-3.5"
            >
              Make Admin
            </button>
          </ManagementCard>

          <ManagementCard title="Remove Staff">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Staff
            </label>

            <select
              value={selectedEmployee}
              onChange={(e) =>
                setSelectedEmployee(e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">Select Staff</option>

              {normalStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.employee_id} - {staff.name}
                </option>
              ))}
            </select>

            <button
              onClick={removeStaff}
              disabled={loading}
              className="w-full mt-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5"
            >
              Remove Staff
            </button>

            <p className="text-xs text-slate-500 mt-3">
              Removing staff disables login access but keeps
              previous OT/Comp-Off history.
            </p>
          </ManagementCard>

          <ManagementCard title="Remove Admin">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Admin
            </label>

            <select
              value={selectedAdminId}
              onChange={(e) =>
                setSelectedAdminId(e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">Select Admin</option>

              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.employee_id} - {admin.name}
                  {admin.employee_id === MAIN_ADMIN_ID
                    ? ' (Main Admin)'
                    : ''}
                </option>
              ))}
            </select>

            <button
              onClick={removeAdmin}
              disabled={loading}
              className="w-full mt-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5"
            >
              Remove Admin
            </button>

            <p className="text-xs text-slate-500 mt-3">
              Main Admin SAS102 is permanently protected.
            </p>
          </ManagementCard>

          <ManagementCard title="Reset Admin Password">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Admin
            </label>

            <select
              value={selectedAdminId}
              onChange={(e) =>
                setSelectedAdminId(e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">Select Admin</option>

              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.employee_id} - {admin.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-slate-700 mb-2 mt-5">
              New Password
            </label>

            <input
              type="password"
              value={newAdminPassword}
              onChange={(e) =>
                setNewAdminPassword(e.target.value)
              }
              placeholder="Minimum 6 characters"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />

            <label className="block text-sm font-semibold text-slate-700 mb-2 mt-5">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmAdminPassword}
              onChange={(e) =>
                setConfirmAdminPassword(e.target.value)
              }
              placeholder="Confirm password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />

            <button
              onClick={resetAdminPassword}
              disabled={loading}
              className="w-full mt-5 rounded-xl bg-blue-700 text-white font-semibold py-3.5"
            >
              Reset Admin Password
            </button>
          </ManagementCard>
        </div>

        {message && (
          <div className="mt-6 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3">
            {message}
          </div>
        )}
      </AdminPageShell>
    );
  }

  if (page === 'change-password') {
    return (
      <AdminPageShell
        title="Change My Password"
        onBack={backToDashboard}
        onLogout={logout}
      >
        <div className="max-w-xl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Old Password
            </label>

            <input
              type="password"
              value={oldPassword}
              onChange={(e) =>
                setOldPassword(e.target.value)
              }
              placeholder="Enter old password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />

            <label className="block text-sm font-semibold text-slate-700 mb-2 mt-5">
              New Password
            </label>

            <input
              type="password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              placeholder="Minimum 6 characters"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />

            <label className="block text-sm font-semibold text-slate-700 mb-2 mt-5">
              Confirm New Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />

            <button
              onClick={changeMyPassword}
              disabled={loading}
              className="w-full mt-6 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3.5"
            >
              {loading
                ? 'Changing...'
                : 'Change Password'}
            </button>

            {message && (
              <div className="mt-5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 text-sm">
                {message}
              </div>
            )}
          </div>
        </div>
      </AdminPageShell>
    );
  }

  return null;
}

function DashboardCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition"
    >
      <h3 className="text-lg font-bold text-slate-900">
        {title}
      </h3>

      <p className="text-sm text-slate-500 mt-2">
        {description}
      </p>

      <div className="mt-5 text-sm font-semibold text-blue-700">
        Open →
      </div>
    </button>
  );
}

function OverviewCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="text-sm text-slate-500">
        {title}
      </div>

      <div className="text-3xl font-bold text-slate-900 mt-2">
        {value}
      </div>
    </div>
  );
}

function ManagementCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-5">
        {title}
      </h2>

      {children}
    </div>
  );
}

function AdminPageShell({
  title,
  children,
  onBack,
  onLogout,
}: {
  title: string;
  children: React.ReactNode;
  onBack: () => void;
  onLogout: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-[0.2em] text-blue-700">
              OT DETAILS
            </div>

            <div className="font-bold text-slate-900">
              Admin Portal
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {title}
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              OT DETAILS Management Portal
            </p>
          </div>

          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>

        {children}
      </div>
    </main>
  );
}
```
