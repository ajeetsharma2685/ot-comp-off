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

type Page =
  | 'login'
  | 'staff-dashboard'
  | 'admin-dashboard'
  | 'staff-details'
  | 'add-employee'
  | 'ot-records'
  | 'admin-management'
  | 'change-password';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

const MAIN_ADMIN_ID = 'SAS102';
const SESSION_KEY = 'ot_details_session';

export default function Home() {
  const [page, setPage] = useState<Page>('login');
  const [adminLogin, setAdminLogin] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');

  const [session, setSession] = useState<{
    id: number;
    employee_id: string;
    name: string;
    role: string;
  } | null>(null);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [admins, setAdmins] = useState<Staff[]>([]);
  const [otList, setOtList] = useState<OTEntry[]>([]);

  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const [selectedEmployee, setSelectedEmployee] =
    useState('');

  const [selectedAdminId, setSelectedAdminId] =
    useState('');

  const [newAdminPassword, setNewAdminPassword] =
    useState('');

  const [confirmAdminPassword, setConfirmAdminPassword] =
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
      const saved = localStorage.getItem(SESSION_KEY);

      if (!saved) {
        return;
      }

      const data = JSON.parse(saved);

      if (!data || !data.employee_id) {
        return;
      }

      setSession(data);

      if (data.role === 'admin') {
        setPage('admin-dashboard');
      } else {
        setPage('staff-dashboard');
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const activeStaff = useMemo(() => {
    return staffList.filter(function (staff) {
      return (
        staff.access_enabled &&
        staff.role !== 'admin'
      );
    });
  }, [staffList]);

  const totalOTHours = useMemo(() => {
    return otList.reduce(function (total, record) {
      return total + Number(record.ot_hours || 0);
    }, 0);
  }, [otList]);

  const filteredOT = useMemo(() => {
    return otList.filter(function (record) {
      if (
        fromDate &&
        record.ot_date < fromDate
      ) {
        return false;
      }

      if (
        toDate &&
        record.ot_date > toDate
      ) {
        return false;
      }

      return true;
    });
  }, [otList, fromDate, toDate]);

  function logout() {
    localStorage.removeItem(SESSION_KEY);

    setSession(null);
    setPage('login');
    setAdminLogin(false);

    setEmployeeId('');
    setPassword('');
    setMessage('');

    setStaffList([]);
    setAdmins([]);
    setOtList([]);
  }

  function saveSession(data: {
    id: number;
    employee_id: string;
    name: string;
    role: string;
  }) {
    setSession(data);

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(data)
    );

    if (data.role === 'admin') {
      setPage('admin-dashboard');
    } else {
      setPage('staff-dashboard');
    }
  }

  async function login() {
    setMessage('');

    const id = employeeId.trim();

    if (!id) {
      setMessage('Employee ID is required');
      return;
    }

    if (adminLogin && !password) {
      setMessage('Admin password is required');
      return;
    }

    setLoading(true);

    try {
      if (adminLogin) {
        const result = await supabase.rpc(
          'admin_login',
          {
            p_employee_id: id,
            p_password: password,
          }
        );

        if (result.error) {
          setMessage(result.error.message);
          return;
        }

        if (!result.data?.success) {
          setMessage(
            result.data?.message ||
              'Admin login failed'
          );
          return;
        }

        saveSession({
          id: Number(result.data.staff_id),
          employee_id: result.data.employee_id,
          name: result.data.name,
          role: 'admin',
        });

        setEmployeeId('');
        setPassword('');

        return;
      }

      const result = await supabase
        .from('STAFF')
        .select(
          'id, employee_id, name, access_enabled, role'
        )
        .eq('employee_id', id)
        .eq('access_enabled', true)
        .limit(1)
        .maybeSingle();

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (!result.data) {
        setMessage('Employee ID not authorized');
        return;
      }

      if (result.data.role === 'admin') {
        setMessage(
          'This is an Admin account. Please use Admin Login.'
        );
        return;
      }

      saveSession({
        id: result.data.id,
        employee_id: result.data.employee_id,
        name: result.data.name,
        role: result.data.role,
      });

      setEmployeeId('');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Login failed'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadStaff() {
    if (!session?.employee_id) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await supabase.rpc(
        'admin_get_staff',
        {
          p_admin_employee_id:
            session.employee_id,
        },
      );

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (!result.data?.success) {
        setMessage(
          result.data?.message ||
            'Unable to load staff'
        );
        return;
      }

      setStaffList(result.data.staff || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadAdmins() {
    if (!session?.employee_id) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await supabase.rpc(
        'admin_get_admins',
        {
          p_admin_employee_id:
            session.employee_id,
        },
      );

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (!result.data?.success) {
        setMessage(
          result.data?.message ||
            'Unable to load admins'
        );
        return;
      }

      setAdmins(result.data.admins || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadOT() {
    if (!session?.employee_id) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await supabase.rpc(
        'admin_get_all_ot',
        {
          p_admin_employee_id:
            session.employee_id,
        },
      );

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (!result.data?.success) {
        setMessage(
          result.data?.message ||
            'Unable to load OT records'
        );
        return;
      }

      setOtList(
        result.data.records ||
          result.data.ot_records ||
          result.data.data ||
          []
      );
    } finally {
      setLoading(false);
    }
  }

  async function addEmployee() {
    if (!session?.employee_id) {
      return;
    }

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
    setMessage('');

    try {
      const result = await supabase.rpc(
        'admin_add_staff',
        {
          p_admin_employee_id:
            session.employee_id,
          p_employee_id:
            newEmployeeId.trim(),
          p_name:
            newEmployeeName.trim(),
        },
      );

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (!result.data?.success) {
        setMessage(
          result.data?.message ||
            'Unable to add employee'
        );
        return;
      }

      setMessage(
        'Employee added successfully'
      );

      setNewEmployeeId('');
      setNewEmployeeName('');

      await loadStaff();
    } finally {
      setLoading(false);
    }
  }

  async function removeStaff() {
    if (!session?.employee_id) {
      return;
    }

    if (!selectedEmployee) {
      setMessage(
        'Please select a staff member'
      );
      return;
    }

    const selected = staffList.find(
      function (staff) {
        return (
          String(staff.id) ===
          selectedEmployee
        );
      }
    );

    if (!selected) {
      setMessage('Staff member not found');
      return;
    }

    const confirmed = window.confirm(
      'Remove ' +
        selected.name +
        ' (' +
        selected.employee_id +
        ')?'
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await supabase.rpc(
        'admin_remove_staff',
        {
          p_admin_employee_id:
            session.employee_id,
          p_staff_id:
            Number(selectedEmployee),
        },
      );

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (!result.data?.success) {
        setMessage(
          result.data?.message ||
            'Unable to remove staff'
        );
        return;
      }

      setMessage(
        'Staff removed successfully'
      );

      setSelectedEmployee('');

      await loadStaff();
    } finally {
      setLoading(false);
    }
  }

  async function makeAdmin() {
    if (!session?.employee_id) {
      return;
    }

    if (!selectedEmployee) {
      setMessage(
        'Please select an employee'
      );
      return;
    }

    if (
      !newAdminPassword ||
      !confirmAdminPassword
    ) {
      setMessage(
        'New admin password and confirm password are required'
      );
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await supabase.rpc(
        'admin_make_admin',
        {
          p_admin_employee_id:
            session.employee_id,
          p_staff_id:
            Number(selectedEmployee),
          p_new_password:
            newAdminPassword,
          p_confirm_password:
            confirmAdminPassword,
        },
      );

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (!result.data?.success) {
        setMessage(
          result.data?.message ||
            'Unable to make admin'
        );
        return;
      }

      setMessage(
        'Employee is now an admin'
      );

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
    if (!session?.employee_id) {
      return;
    }

    if (!selectedAdminId) {
      setMessage(
        'Please select an admin'
      );
      return;
    }

    const selected = admins.find(
      function (admin) {
        return (
          String(admin.id) ===
          selectedAdminId
        );
      }
    );

    if (!selected) {
      setMessage('Admin not found');
      return;
    }

    if (
      selected.employee_id.toUpperCase() ===
      MAIN_ADMIN_ID
    ) {
      setMessage(
        'Main Admin cannot be removed'
      );
      return;
    }

    const confirmed = window.confirm(
      'Remove admin access from ' +
        selected.name +
        '?'
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await supabase.rpc(
        'admin_remove_admin',
        {
          p_admin_employee_id:
            session.employee_id,
          p_target_admin_id:
            Number(selectedAdminId),
        },
      );

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (!result.data?.success) {
        setMessage(
          result.data?.message ||
            'Unable to remove admin'
        );
        return;
      }

      setMessage(
        'Admin removed successfully'
      );

      setSelectedAdminId('');

      await loadAdmins();
      await loadStaff();
    } finally {
      setLoading(false);
    }
  }

  async function resetAdminPassword() {
    if (!session?.employee_id) {
      return;
    }

    if (!selectedAdminId) {
      setMessage(
        'Please select an admin'
      );
      return;
    }

    if (
      !newAdminPassword ||
      !confirmAdminPassword
    ) {
      setMessage(
        'New password and confirm password are required'
      );
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await supabase.rpc(
        'admin_reset_admin_password',
        {
          p_admin_employee_id:
            session.employee_id,
          p_target_admin_id:
            Number(selectedAdminId),
          p_new_password:
            newAdminPassword,
          p_confirm_password:
            confirmAdminPassword,
        },
      );

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (!result.data?.success) {
        setMessage(
          result.data?.message ||
            'Unable to reset password'
        );
        return;
      }

      setMessage(
        'Admin password reset successfully'
      );

      setSelectedAdminId('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (!session?.employee_id) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await supabase.rpc(
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
        },
      );

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (!result.data?.success) {
        setMessage(
          result.data?.message ||
            'Unable to change password'
        );
        return;
      }

      setMessage(
        'Password changed successfully'
      );

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!filteredOT.length) {
      setMessage(
        'No OT records available'
      );
      return;
    }

    const header = [
      'Employee ID',
      'Employee Name',
      'OT Date',
      'OT Hours',
      'Remarks',
    ];

    const rows = filteredOT.map(
      function (record) {
        return [
          record.employee_id,
          record.employee_name || '',
          record.ot_date,
          record.ot_hours,
          record.remarks || '',
        ];
      }
    );

    const csv = [header, ...rows]
      .map(function (row) {
        return row
          .map(function (value) {
            return (
              '"' +
              String(value ?? '').replaceAll(
                '"',
                '""'
              ) +
              '"'
            );
          })
          .join(',');
      })
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;
    link.download =
      'OT_DETAILS_' +
      new Date()
        .toISOString()
        .slice(0, 10) +
      '.csv';

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function backDashboard() {
    setMessage('');

    if (session?.role === 'admin') {
      setPage('admin-dashboard');
    } else {
      setPage('staff-dashboard');
    }
  }

  if (page === 'login') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 text-center border-b border-slate-100">
              <div className="text-sm font-bold tracking-[0.25em] text-blue-700">
                OT DETAILS
              </div>

              <h1 className="text-3xl font-bold text-slate-900 mt-3">
                {adminLogin
                  ? 'Admin Login'
                  : 'Staff Login'}
              </h1>

              <p className="text-sm text-slate-500 mt-2">
                {adminLogin
                  ? 'Authorized administrators only'
                  : 'Enter your Employee ID to continue'}
              </p>
            </div>

            <div className="p-8">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Employee ID
              </label>

              <input
                value={employeeId}
                onChange={function (event) {
                  setEmployeeId(
                    event.target.value
                  );
                }}
                placeholder="Enter Employee ID"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-600"
              />

              {adminLogin && (
                <>
                  <label className="block text-sm font-semibold text-slate-700 mt-5 mb-2">
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={function (event) {
                      setPassword(
                        event.target.value
                      );
                    }}
                    placeholder="Enter Admin Password"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-600"
                  />
                </>
              )}

              {message && (
                <div className="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {message}
                </div>
              )}

              <button
                onClick={login}
                disabled={loading}
                className="w-full mt-6 bg-blue-700 hover:bg-blue-800 text-white rounded-xl py-3.5 font-semibold disabled:opacity-60"
              >
                {loading
                  ? 'Please wait...'
                  : adminLogin
                  ? 'Admin Login'
                  : 'Staff Login'}
              </button>

              {!adminLogin ? (
                <button
                  onClick={function () {
                    setAdminLogin(true);
                    setMessage('');
                  }}
                  className="w-full mt-4 border border-slate-300 rounded-xl py-3.5 font-semibold hover:bg-slate-50"
                >
                  Admin Login
                </button>
              ) : (
                <button
                  onClick={function () {
                    setAdminLogin(false);
                    setPassword('');
                    setMessage('');
                  }}
                  className="w-full mt-4 border border-slate-300 rounded-xl py-3.5 font-semibold hover:bg-slate-50"
                >
                  Back to Staff Login
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
        <Header
          title="Staff Portal"
          onLogout={logout}
        />

        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <p className="text-sm text-slate-500">
            Welcome
          </p>

          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            {session?.name}
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Employee ID: {session?.employee_id}
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <Card
              title="Add OT"
              description="Submit your overtime details."
              onClick={function () {
                setMessage(
                  'Add OT module will be connected next.'
                );
              }}
            />

            <Card
              title="My OT Records"
              description="View your submitted OT records."
              onClick={function () {
                setMessage(
                  'My OT Records module will be connected next.'
                );
              }}
            />

            <Card
              title="Logout"
              description="Securely logout from the portal."
              onClick={logout}
            />
          </div>

          {message && (
            <Message text={message} />
          )}
        </div>
      </main>
    );
  }

  if (page === 'admin-dashboard') {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header
          title="Admin Portal"
          onLogout={logout}
        />

        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <p className="text-sm font-semibold text-blue-700">
            OT DETAILS
          </p>

          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            Admin Dashboard
          </h1>

          <p className="text-slate-500 mt-2">
            Manage employees, administrators and OT records.
          </p>

          <div className="grid sm:grid-cols-3 gap-5 mt-8">
            <Overview
              title="Active Staff"
              value={activeStaff.length}
            />

            <Overview
              title="OT Records"
              value={otList.length}
            />

            <Overview
              title="OT Hours"
              value={totalOTHours}
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            <Card
              title="Staff Details"
              description="View saved staff and access status."
              onClick={function () {
                setPage('staff-details');
                loadStaff();
              }}
            />

            <Card
              title="Add Employee"
              description="Add a new employee."
              onClick={function () {
                setPage('add-employee');
                setMessage('');
              }}
            />

            <Card
              title="OT Records"
              description="View and download OT records."
              onClick={function () {
                setPage('ot-records');
                loadOT();
              }}
            />

            <Card
              title="Admin Management"
              description="Manage admin and staff access."
              onClick={function () {
                setPage('admin-management');
                loadAdmins();
                loadStaff();
              }}
            />

            <Card
              title="Change Password"
              description="Change your admin password."
              onClick={function () {
                setPage('change-password');
                setMessage('');
              }}
            />

            <Card
              title="Logout"
              description="Securely logout."
              onClick={logout}
            />
          </div>
        </div>
      </main>
    );
  }

  if (page === 'staff-details') {
    return (
      <Shell
        title="Staff Details"
        back={backDashboard}
        logout={logout}
      >
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-5 flex justify-between border-b border-slate-200">
            <div>
              <h2 className="font-bold text-lg">
                Saved Staff
              </h2>

              <p className="text-sm text-slate-500">
                Active and inactive employees
              </p>
            </div>

            <button
              onClick={loadStaff}
              className="px-4 py-2 bg-blue-700 text-white rounded-lg"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4">
                    Employee ID
                  </th>
                  <th className="text-left p-4">
                    Name
                  </th>
                  <th className="text-left p-4">
                    Role
                  </th>
                  <th className="text-left p-4">
                    Access
                  </th>
                </tr>
              </thead>

              <tbody>
                {staffList.map(
                  function (staff) {
                    return (
                      <tr
                        key={staff.id}
                        className="border-t border-slate-100"
                      >
                        <td className="p-4 font-semibold">
                          {staff.employee_id}
                        </td>

                        <td className="p-4">
                          {staff.name}
                        </td>

                        <td className="p-4 capitalize">
                          {staff.role}
                        </td>

                        <td className="p-4">
                          {staff.access_enabled
                            ? 'Active'
                            : 'Disabled'}
                        </td>
                      </tr>
                    );
                  }
                )}

                {!staffList.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-10 text-center text-slate-500"
                    >
                      No staff records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Shell>
    );
  }

  if (page === 'add-employee') {
    return (
      <Shell
        title="Add Employee"
        back={backDashboard}
        logout={logout}
      >
        <div className="max-w-xl bg-white p-6 rounded-2xl border border-slate-200">
          <label className="block font-semibold text-sm mb-2">
            Employee ID
          </label>

          <input
            value={newEmployeeId}
            onChange={function (event) {
              setNewEmployeeId(
                event.target.value
              );
            }}
            className="w-full border border-slate-300 rounded-xl px-4 py-3"
            placeholder="Enter Employee ID"
          />

          <label className="block font-semibold text-sm mt-5 mb-2">
            Employee Name
          </label>

          <input
            value={newEmployeeName}
            onChange={function (event) {
              setNewEmployeeName(
                event.target.value
              );
            }}
            className="w-full border border-slate-300 rounded-xl px-4 py-3"
            placeholder="Enter Employee Name"
          />

          <button
            onClick={addEmployee}
            disabled={loading}
            className="w-full mt-6 bg-blue-700 text-white rounded-xl py-3.5 font-semibold"
          >
            {loading
              ? 'Adding...'
              : 'Add Employee'}
          </button>

          {message && (
            <Message text={message} />
          )}
        </div>
      </Shell>
    );
  }

  if (page === 'ot-records') {
    return (
      <Shell
        title="OT Records"
        back={backDashboard}
        logout={logout}
      >
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block font-semibold text-sm mb-2">
                  From Date
                </label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={function (event) {
                    setFromDate(
                      event.target.value
                    );
                  }}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                />
              </div>

              <div>
                <label className="block font-semibold text-sm mb-2">
                  To Date
                </label>

                <input
                  type="date"
                  value={toDate}
                  onChange={function (event) {
                    setToDate(
                      event.target.value
                    );
                  }}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              <button
                onClick={loadOT}
                className="bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold"
              >
                View Records
              </button>

              <button
                onClick={function () {
                  setFromDate('');
                  setToDate('');
                }}
                className="border border-slate-300 px-5 py-3 rounded-xl font-semibold"
              >
                Clear
              </button>

              <button
                onClick={downloadCSV}
                className="border border-slate-300 px-5 py-3 rounded-xl font-semibold"
              >
                Download CSV
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Overview
              title="Records"
              value={filteredOT.length}
            />

            <Overview
              title="Total OT Hours"
              value={filteredOT.reduce(
                function (sum, record) {
                  return (
                    sum +
                    Number(
                      record.ot_hours || 0
                    )
                  );
                },
                0
              )}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4">
                      Employee ID
                    </th>
                    <th className="text-left p-4">
                      Name
                    </th>
                    <th className="text-left p-4">
                      OT Date
                    </th>
                    <th className="text-left p-4">
                      OT Hours
                    </th>
                    <th className="text-left p-4">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOT.map(
                    function (record) {
                      return (
                        <tr
                          key={record.id}
                          className="border-t border-slate-100"
                        >
                          <td className="p-4">
                            {record.employee_id}
                          </td>
                          <td className="p-4">
                            {record.employee_name ||
                              '-'}
                          </td>
                          <td className="p-4">
                            {record.ot_date}
                          </td>
                          <td className="p-4">
                            {record.ot_hours}
                          </td>
                          <td className="p-4">
                            {record.remarks || '-'}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (page === 'admin-management') {
    const normalStaff =
      staffList.filter(function (staff) {
        return (
          staff.role !== 'admin' &&
          staff.access_enabled
        );
      });

    return (
      <Shell
        title="Admin Management"
        back={backDashboard}
        logout={logout}
      >
        <div className="grid lg:grid-cols-2 gap-6">
          <Manage title="Make Admin">
            <Select
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              label="Select Employee"
              items={normalStaff}
            />

            <PasswordInput
              label="New Admin Password"
              value={newAdminPassword}
              onChange={setNewAdminPassword}
            />

            <PasswordInput
              label="Confirm Password"
              value={confirmAdminPassword}
              onChange={setConfirmAdminPassword}
            />

            <button
              onClick={makeAdmin}
              className="w-full mt-5 bg-blue-700 text-white rounded-xl py-3.5 font-semibold"
            >
              Make Admin
            </button>
          </Manage>

          <Manage title="Remove Staff">
            <Select
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              label="Select Staff"
              items={normalStaff}
            />

            <button
              onClick={removeStaff}
              className="w-full mt-5 bg-red-600 text-white rounded-xl py-3.5 font-semibold"
            >
              Remove Staff
            </button>

            <p className="text-xs text-slate-500 mt-3">
              Login access will be disabled.
              Previous OT/Comp-Off history remains saved.
            </p>
          </Manage>

          <Manage title="Remove Admin">
            <Select
              value={selectedAdminId}
              onChange={setSelectedAdminId}
              label="Select Admin"
              items={admins}
            />

            <button
              onClick={removeAdmin}
              className="w-full mt-5 bg-red-600 text-white rounded-xl py-3.5 font-semibold"
            >
              Remove Admin
            </button>

            <p className="text-xs text-slate-500 mt-3">
              Main Admin SAS102 cannot be removed.
            </p>
          </Manage>

          <Manage title="Reset Admin Password">
            <Select
              value={selectedAdminId}
              onChange={setSelectedAdminId}
              label="Select Admin"
              items={admins}
            />

            <PasswordInput
              label="New Password"
              value={newAdminPassword}
              onChange={setNewAdminPassword}
            />

            <PasswordInput
              label="Confirm Password"
              value={confirmAdminPassword}
              onChange={setConfirmAdminPassword}
            />

            <button
              onClick={resetAdminPassword}
              className="w-full mt-5 bg-blue-700 text-white rounded-xl py-3.5 font-semibold"
            >
              Reset Admin Password
            </button>
          </Manage>
        </div>

        {message && (
          <Message text={message} />
        )}
      </Shell>
    );
  }

  if (page === 'change-password') {
    return (
      <Shell
        title="Change My Password"
        back={backDashboard}
        logout={logout}
      >
        <div className="max-w-xl bg-white p-6 rounded-2xl border border-slate-200">
          <PasswordInput
            label="Old Password"
            value={oldPassword}
            onChange={setOldPassword}
          />

          <PasswordInput
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
          />

          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />

          <button
            onClick={changePassword}
            className="w-full mt-6 bg-blue-700 text-white rounded-xl py-3.5 font-semibold"
          >
            Change Password
          </button>

          {message && (
            <Message text={message} />
          )}
        </div>
      </Shell>
    );
  }

  return null;
}

function Header({
  title,
  onLogout,
}: {
  title: string;
  onLogout: () => void;
}) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div>
          <div className="text-xs font-bold tracking-[0.2em] text-blue-700">
            OT DETAILS
          </div>

          <div className="font-bold text-slate-900">
            {title}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="border border-slate-300 px-4 py-2 rounded-lg font-semibold text-sm"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

function Shell({
  title,
  children,
  back,
  logout,
}: {
  title: string;
  children: React.ReactNode;
  back: () => void;
  logout: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header
        title="Admin Portal"
        onLogout={logout}
      />

      <div className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="flex justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {title}
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              OT DETAILS Management Portal
            </p>
          </div>

          <button
            onClick={back}
            className="border border-slate-300 bg-white px-5 py-2.5 rounded-xl font-semibold"
          >
            Back to Dashboard
          </button>
        </div>

        {children}
      </div>
    </main>
  );
}

function Card({
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

      <div className="text-sm font-semibold text-blue-700 mt-5">
        Open →
      </div>
    </button>
  );
}

function Overview({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="text-sm text-slate-500">
        {title}
      </div>

      <div className="text-3xl font-bold text-slate-900 mt-2">
        {value}
      </div>
    </div>
  );
}

function Message({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm">
      {text}
    </div>
  );
}

function Manage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-5">
        {title}
      </h2>

      {children}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: Staff[];
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>

      <select
        value={value}
        onChange={function (event) {
          onChange(event.target.value);
        }}
        className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white"
      >
        <option value="">
          {label}
        </option>

        {items.map(function (item) {
          return (
            <option
              key={item.id}
              value={String(item.id)}
            >
              {item.employee_id} - {item.name}
              {item.employee_id === MAIN_ADMIN_ID
                ? ' (Main Admin)'
                : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-5">
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>

      <input
        type="password"
        value={value}
        onChange={function (event) {
          onChange(event.target.value);
        }}
        placeholder="Minimum 6 characters"
        className="w-full border border-slate-300 rounded-xl px-4 py-3"
      />
    </div>
  );
}
