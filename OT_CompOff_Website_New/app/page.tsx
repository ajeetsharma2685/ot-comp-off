'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Staff = {
  id: number;
  employee_id: string;
  name: string;
  access_enabled: boolean;
  device_id?: string | null;
  auth_user_id?: string | null;
  role?: string | null;
};

type AdminStaff = Staff;

type Entry = {
  id: number;
  employee_id: string;
  name?: string;
  ot_date: string;
  ot_hours?: number | string;
  comp_off?: string | number;
  status?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const MAIN_ADMIN_ID = 'SAS102';

type Page =
  | 'dashboard'
  | 'staff'
  | 'add'
  | 'ot'
  | 'management'
  | 'password';

function DashboardCard({
  icon,
  title,
  text,
  onClick,
  danger = false,
}: {
  icon: string;
  title: string;
  text: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`dashboardCard ${danger ? 'dangerCard' : ''}`}
      onClick={onClick}
    >
      <div className="cardIcon">{icon}</div>

      <div className="cardContent">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>

      <div className="cardArrow">→</div>
    </button>
  );
}

function PageTitle({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="pageTitle">
      <div className="eyebrow">OT DETAILS</div>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}

export default function Home() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');

  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [currentEmployee, setCurrentEmployee] = useState('');
  const [currentName, setCurrentName] = useState('');

  const [page, setPage] = useState<Page>('dashboard');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [staff, setStaff] = useState<Staff[]>([]);
  const [admins, setAdmins] = useState<AdminStaff[]>([]);
  const [otRecords, setOtRecords] = useState<Entry[]>([]);

  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const [selectedStaffId, setSelectedStaffId] = useState<number | ''>('');

  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] =
    useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const savedSession =
      localStorage.getItem('ot_details_session');

    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);

        if (session?.employee_id) {
          setLoggedIn(true);
          setCurrentEmployee(session.employee_id);
          setCurrentName(session.name || '');
          setIsAdmin(session.role === 'admin');
        }
      } catch {}
    }
  }, []);

  const clearAlerts = () => {
    setMessage('');
    setError('');
  };

  const showError = (text: string) => {
    setMessage('');
    setError(text);
  };

  const showMessage = (text: string) => {
    setError('');
    setMessage(text);
  };

  const login = async () => {
    clearAlerts();

    if (!employeeId.trim()) {
      showError('Employee ID is required');
      return;
    }

    setLoading(true);

    try {
      /*
       * Password entered = Admin login
       * Password blank = Staff login
       */

      if (password.trim()) {
        const { data, error: rpcError } =
          await supabase.rpc('admin_login', {
            p_employee_id: employeeId.trim(),
            p_password: password,
          });

        if (rpcError) {
          showError(rpcError.message);
          return;
        }

        if (!data?.success) {
          showError(data?.message || 'Admin login failed');
          return;
        }

        setLoggedIn(true);
        setIsAdmin(true);
        setCurrentEmployee(data.employee_id);
        setCurrentName(data.name || '');
        setPage('dashboard');

        localStorage.setItem(
          'ot_details_session',
          JSON.stringify({
            employee_id: data.employee_id,
            name: data.name || '',
            role: 'admin',
          })
        );

        showMessage('Admin login successful');
      } else {
        const { data, error: rpcError } =
          await supabase.rpc('login_staff', {
            p_employee_id: employeeId.trim(),
          });

        if (rpcError) {
          showError(rpcError.message);
          return;
        }

        if (!data?.success) {
          showError(
            data?.message || 'Employee is not authorized'
          );
          return;
        }

        setLoggedIn(true);
        setIsAdmin(false);
        setCurrentEmployee(data.employee_id);
        setCurrentName(data.name || '');
        setPage('dashboard');

        localStorage.setItem(
          'ot_details_session',
          JSON.stringify({
            employee_id: data.employee_id,
            name: data.name || '',
            role: 'staff',
          })
        );

        showMessage('Login successful');
      }
    } catch (err: any) {
      showError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ot_details_session');

    setLoggedIn(false);
    setIsAdmin(false);

    setCurrentEmployee('');
    setCurrentName('');

    setEmployeeId('');
    setPassword('');

    setPage('dashboard');

    clearAlerts();
  };

  const getStaff = async () => {
    clearAlerts();
    setLoading(true);

    try {
      const { data, error: rpcError } =
        await supabase.rpc('admin_get_staff', {
          p_admin_employee_id: currentEmployee,
        });

      if (rpcError) {
        showError(rpcError.message);
        return;
      }

      if (!data?.success) {
        showError(
          data?.message || 'Unable to load staff'
        );
        return;
      }

      setStaff(
        Array.isArray(data.staff)
          ? data.staff
          : []
      );
    } catch (err: any) {
      showError(err?.message || 'Unable to load staff');
    } finally {
      setLoading(false);
    }
  };

  const addEmployee = async () => {
    clearAlerts();

    if (!newEmployeeId.trim()) {
      showError('Employee ID is required');
      return;
    }

    if (!newEmployeeName.trim()) {
      showError('Employee Name is required');
      return;
    }

    setLoading(true);

    try {
      const { data, error: rpcError } =
        await supabase.rpc('admin_add_staff', {
          p_admin_employee_id: currentEmployee,
          p_employee_id: newEmployeeId.trim(),
          p_name: newEmployeeName.trim(),
        });

      if (rpcError) {
        showError(rpcError.message);
        return;
      }

      if (!data?.success) {
        showError(
          data?.message || 'Unable to add employee'
        );
        return;
      }

      setNewEmployeeId('');
      setNewEmployeeName('');

      showMessage('Employee added successfully');

      await getStaff();
    } catch (err: any) {
      showError(err?.message || 'Unable to add employee');
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    clearAlerts();
    setLoading(true);

    try {
      const { data, error: rpcError } =
        await supabase.rpc('admin_get_admins', {
          p_admin_employee_id: currentEmployee,
        });

      if (rpcError) {
        showError(rpcError.message);
        return;
      }

      if (!data?.success) {
        showError(
          data?.message || 'Unable to load admins'
        );
        return;
      }

      setAdmins(
        Array.isArray(data.admins)
          ? data.admins
          : []
      );
    } catch (err: any) {
      showError(err?.message || 'Unable to load admins');
    } finally {
      setLoading(false);
    }
  };

  const removeStaff = async () => {
    clearAlerts();

    if (selectedStaffId === '') {
      showError('Please select a staff member');
      return;
    }

    const selected = staff.find(
      (item) => item.id === Number(selectedStaffId)
    );

    if (!selected) {
      showError('Staff not found');
      return;
    }

    if (
      selected.employee_id.toUpperCase() ===
      MAIN_ADMIN_ID
    ) {
      showError('Main Admin cannot be removed');
      return;
    }

    if (selected.role === 'admin') {
      showError(
        'This is an admin account. Use Remove Admin.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Remove ${selected.name} (${selected.employee_id})?`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const { data, error: rpcError } =
        await supabase.rpc('admin_remove_staff', {
          p_admin_employee_id: currentEmployee,
          p_staff_id: Number(selectedStaffId),
        });

      if (rpcError) {
        showError(rpcError.message);
        return;
      }

      if (!data?.success) {
        showError(
          data?.message || 'Unable to remove staff'
        );
        return;
      }

      setSelectedStaffId('');

      showMessage('Staff removed successfully');

      await getStaff();
    } catch (err: any) {
      showError(err?.message || 'Unable to remove staff');
    } finally {
      setLoading(false);
    }
  };

  const makeAdmin = async () => {
    clearAlerts();

    if (selectedStaffId === '') {
      showError('Please select an employee');
      return;
    }

    if (!adminPassword) {
      showError('New admin password is required');
      return;
    }

    if (!adminConfirmPassword) {
      showError(
        'Confirm admin password is required'
      );
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      showError(
        'Password and Confirm Password do not match'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error: rpcError } =
        await supabase.rpc('admin_make_admin', {
          p_admin_employee_id: currentEmployee,
          p_staff_id: Number(selectedStaffId),
          p_new_password: adminPassword,
          p_confirm_password: adminConfirmPassword,
        });

      if (rpcError) {
        showError(rpcError.message);
        return;
      }

      if (!data?.success) {
        showError(
          data?.message || 'Unable to make admin'
        );
        return;
      }

      setAdminPassword('');
      setAdminConfirmPassword('');
      setSelectedStaffId('');

      showMessage('Employee is now an admin');

      await getStaff();
      await loadAdmins();
    } catch (err: any) {
      showError(err?.message || 'Unable to make admin');
    } finally {
      setLoading(false);
    }
  };

  const removeAdmin = async () => {
    clearAlerts();

    if (selectedStaffId === '') {
      showError('Please select an admin');
      return;
    }

    const selected = admins.find(
      (item) => item.id === Number(selectedStaffId)
    );

    if (!selected) {
      showError('Admin not found');
      return;
    }

    if (
      selected.employee_id.toUpperCase() ===
      MAIN_ADMIN_ID
    ) {
      showError('Main Admin cannot be removed');
      return;
    }

    const confirmed = window.confirm(
      `Remove admin access from ${selected.name} (${selected.employee_id})?`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const { data, error: rpcError } =
        await supabase.rpc('admin_remove_admin', {
          p_admin_employee_id: currentEmployee,
          p_target_admin_id: Number(selectedStaffId),
        });

      if (rpcError) {
        showError(rpcError.message);
        return;
      }

      if (!data?.success) {
        showError(
          data?.message || 'Unable to remove admin'
        );
        return;
      }

      setSelectedStaffId('');

      showMessage('Admin removed successfully');

      await loadAdmins();
      await getStaff();
    } catch (err: any) {
      showError(err?.message || 'Unable to remove admin');
    } finally {
      setLoading(false);
    }
  };

  const resetAdminPassword = async () => {
    clearAlerts();

    if (selectedStaffId === '') {
      showError('Please select an admin');
      return;
    }

    if (!adminPassword) {
      showError('New password is required');
      return;
    }

    if (!adminConfirmPassword) {
      showError('Confirm password is required');
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      showError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { data, error: rpcError } =
        await supabase.rpc(
          'admin_reset_admin_password',
          {
            p_admin_employee_id: currentEmployee,
            p_target_admin_id:
              Number(selectedStaffId),
            p_new_password: adminPassword,
            p_confirm_password:
              adminConfirmPassword,
          }
        );

      if (rpcError) {
        showError(rpcError.message);
        return;
      }

      if (!data?.success) {
        showError(
          data?.message ||
            'Unable to reset admin password'
        );
        return;
      }

      setAdminPassword('');
      setAdminConfirmPassword('');
      setSelectedStaffId('');

      showMessage(
        'Admin password reset successfully'
      );
    } catch (err: any) {
      showError(
        err?.message ||
          'Unable to reset admin password'
      );
    } finally {
      setLoading(false);
    }
  };

  const changeMyPassword = async () => {
    clearAlerts();

    if (!oldPassword.trim()) {
      showError('Old password is required');
      return;
    }

    if (!newPassword.trim()) {
      showError('New password is required');
      return;
    }

    if (!confirmPassword.trim()) {
      showError('Confirm password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError(
        'New password and Confirm Password do not match'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error: rpcError } =
        await supabase.rpc('admin_change_password', {
          p_admin_employee_id: currentEmployee,
          p_old_password: oldPassword,
          p_new_password: newPassword,
          p_confirm_password: confirmPassword,
        });

      if (rpcError) {
        showError(rpcError.message);
        return;
      }

      if (!data?.success) {
        showError(
          data?.message || 'Unable to change password'
        );
        return;
      }

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      showMessage('Password changed successfully');
    } catch (err: any) {
      showError(
        err?.message || 'Unable to change password'
      );
    } finally {
      setLoading(false);
    }
  };

  const getOTRecords = async () => {
    clearAlerts();
    setLoading(true);

    try {
      const { data, error: rpcError } =
        await supabase.rpc('admin_get_all_ot', {
          p_admin_employee_id: currentEmployee,
        });

      if (rpcError) {
        showError(rpcError.message);
        return;
      }

      if (!data?.success) {
        showError(
          data?.message || 'Unable to load OT records'
        );
        return;
      }

      const records =
        Array.isArray(data.records)
          ? data.records
          : Array.isArray(data.ot_records)
          ? data.ot_records
          : [];

      setOtRecords(records);
    } catch (err: any) {
      showError(
        err?.message || 'Unable to load OT records'
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredOT = useMemo(() => {
    return otRecords.filter((record) => {
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
  }, [otRecords, fromDate, toDate]);

  const totalHours = useMemo(() => {
    return filteredOT.reduce((total, record) => {
      const hours = Number(record.ot_hours || 0);

      return (
        total +
        (Number.isFinite(hours) ? hours : 0)
      );
    }, 0);
  }, [filteredOT]);

  const downloadCSV = () => {
    clearAlerts();

    if (!filteredOT.length) {
      showError(
        'No OT records available for download'
      );
      return;
    }

    const header = [
      'Employee ID',
      'Name',
      'OT Date',
      'OT Hours',
      'Comp Off',
      'Status',
    ];

    const rows = filteredOT.map((record) => [
      record.employee_id,
      record.name || '',
      record.ot_date,
      record.ot_hours ?? '',
      record.comp_off ?? '',
      record.status || '',
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(',')
      )
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
      `OT-DETAILS-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showMessage('OT file downloaded successfully');
  };

  const activeStaffCount = staff.filter(
    (item) =>
      item.access_enabled &&
      item.role !== 'admin'
  ).length;

  const activeAdminCount = admins.filter(
    (item) => item.access_enabled
  ).length;

  const go = (target: Page) => {
    clearAlerts();
    setPage(target);

    if (target === 'staff') {
      getStaff();
    }

    if (target === 'management') {
      loadAdmins();
      getStaff();
    }

    if (target === 'ot') {
      getOTRecords();
    }
  };

  /*
   * LOGIN SCREEN
   */

  if (!loggedIn) {
    return (
      <>
        <style jsx global>
          {globalStyles}
        </style>

        <main className="loginPage">
          <div className="loginCard">
            <div className="logoCircle">
              OT
            </div>

            <div className="brandName loginBrand">
              OT DETAILS
            </div>

            <div className="brandSub">
              OT & Comp-Off Management Portal
            </div>

            <div className="loginDivider" />

            <h1>Login</h1>

            <p className="loginText">
              Enter your Employee ID to continue.
            </p>

            <label>Employee ID</label>

            <input
              value={employeeId}
              onChange={(e) =>
                setEmployeeId(e.target.value)
              }
              placeholder="Enter Employee ID"
              autoComplete="username"
            />

            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Admin password only"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  login();
                }
              }}
            />

            <button
              className="primaryButton fullButton"
              onClick={login}
              disabled={loading}
            >
              {loading ? 'Please wait...' : 'Login'}
            </button>

            {error && (
              <div className="alert error">
                {error}
              </div>
            )}

            {message && (
              <div className="alert success">
                {message}
              </div>
            )}

            <div className="loginFooter">
              OT DETAILS
            </div>
          </div>
        </main>
      </>
    );
  }

  /*
   * APPLICATION
   */

  return (
    <>
      <style jsx global>
        {globalStyles}
      </style>

      <div className="app">
        <header className="topHeader">
          <div className="headerBrand">
            <div className="brandMark">
              OT
            </div>

            <div>
              <div className="brandName">
                OT DETAILS
              </div>

              <div className="brandSub">
                OT & Comp-Off Management Portal
              </div>
            </div>
          </div>

          <div className="headerRight">
            <div className="userInfo">
              <strong>
                {currentName ||
                  currentEmployee}
              </strong>

              <span>
                {currentEmployee} ·{' '}
                {isAdmin
                  ? 'Administrator'
                  : 'Staff'}
              </span>
            </div>

            <button
              className="logoutButton"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="mainContainer">
          {message && (
            <div className="alert success globalAlert">
              {message}
            </div>
          )}

          {error && (
            <div className="alert error globalAlert">
              {error}
            </div>
          )}

          {page !== 'dashboard' && (
            <button
              className="backButton"
              onClick={() =>
                go('dashboard')
              }
            >
              ← Back to Dashboard
            </button>
          )}

          {/*
           * ADMIN DASHBOARD
           */}

          {page === 'dashboard' &&
            isAdmin && (
              <>
                <section className="welcomeSection">
                  <div>
                    <div className="eyebrow">
                      ADMIN DASHBOARD
                    </div>

                    <h1>
                      Welcome,{' '}
                      {currentName ||
                        currentEmployee}
                    </h1>

                    <p>
                      Manage employees, OT
                      records and administrator
                      access from one place.
                    </p>
                  </div>

                  <div className="welcomeBadge">
                    <span className="onlineDot" />
                    Admin Access Active
                  </div>
                </section>

                <section className="overviewGrid">
                  <div className="overviewCard">
                    <div className="overviewIcon">
                      👥
                    </div>

                    <div>
                      <span>
                        Active Staff
                      </span>

                      <strong>
                        {activeStaffCount}
                      </strong>
                    </div>
                  </div>

                  <div className="overviewCard">
                    <div className="overviewIcon">
                      🕐
                    </div>

                    <div>
                      <span>
                        OT Records
                      </span>

                      <strong>
                        {otRecords.length}
                      </strong>
                    </div>
                  </div>

                  <div className="overviewCard">
                    <div className="overviewIcon">
                      ⏱
                    </div>

                    <div>
                      <span>
                        OT Hours
                      </span>

                      <strong>
                        {totalHours}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="sectionHeading">
                  <div>
                    <h2>
                      Management
                    </h2>

                    <p>
                      Select an option below.
                    </p>
                  </div>
                </section>

                <section className="cardGrid">
                  <DashboardCard
                    icon="👥"
                    title="Staff Details"
                    text="View active and inactive employee details."
                    onClick={() =>
                      go('staff')
                    }
                  />

                  <DashboardCard
                    icon="＋"
                    title="Add Employee"
                    text="Create access for a new employee."
                    onClick={() =>
                      go('add')
                    }
                  />

                  <DashboardCard
                    icon="🕐"
                    title="OT Records"
                    text="View, filter and download OT records."
                    onClick={() =>
                      go('ot')
                    }
                  />

                  <DashboardCard
                    icon="⚙"
                    title="Admin Management"
                    text="Manage admins, staff access and passwords."
                    onClick={() =>
                      go('management')
                    }
                  />

                  <DashboardCard
                    icon="🔐"
                    title="Change Password"
                    text="Change your administrator password securely."
                    onClick={() =>
                      go('password')
                    }
                  />

                  <DashboardCard
                    icon="↪"
                    title="Logout"
                    text="Sign out from OT DETAILS."
                    onClick={logout}
                    danger
                  />
                </section>
              </>
            )}

          {/*
           * STAFF DASHBOARD
           */}

          {page === 'dashboard' &&
            !isAdmin && (
              <>
                <section className="welcomeSection">
                  <div>
                    <div className="eyebrow">
                      STAFF DASHBOARD
                    </div>

                    <h1>
                      Welcome,{' '}
                      {currentName ||
                        currentEmployee}
                    </h1>

                    <p>
                      Access your OT and
                      Comp-Off details.
                    </p>
                  </div>

                  <div className="welcomeBadge">
                    <span className="onlineDot" />
                    Staff Access Active
                  </div>
                </section>

                <section className="cardGrid">
                  <DashboardCard
                    icon="＋"
                    title="Add OT"
                    text="Add your overtime details."
                    onClick={() =>
                      showMessage(
                        'Add OT module is ready to be connected.'
                      )
                    }
                  />

                  <DashboardCard
                    icon="🕐"
                    title="My OT Records"
                    text="View your submitted OT records."
                    onClick={() =>
                      showMessage(
                        'My OT Records module is ready to be connected.'
                      )
                    }
                  />

                  <DashboardCard
                    icon="↪"
                    title="Logout"
                    text="Sign out from OT DETAILS."
                    onClick={logout}
                    danger
                  />
                </section>
              </>
            )}

          {/*
           * STAFF DETAILS
           */}

          {page === 'staff' &&
            isAdmin && (
              <section>
                <PageTitle
                  title="Staff Details"
                  text="View all employees and their current access status."
                />

                <div className="toolbar">
                  <button
                    className="primaryButton"
                    onClick={getStaff}
                    disabled={loading}
                  >
                    {loading
                      ? 'Loading...'
                      : '↻ Refresh Staff'}
                  </button>
                </div>

                <div className="tableCard">
                  <div className="tableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            Employee ID
                          </th>

                          <th>Name</th>

                          <th>Role</th>

                          <th>
                            Access
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {staff.length ===
                        0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="emptyCell"
                            >
                              No staff records
                              found.
                            </td>
                          </tr>
                        ) : (
                          staff.map(
                            (item) => (
                              <tr
                                key={
                                  item.id
                                }
                              >
                                <td>
                                  <strong>
                                    {
                                      item.employee_id
                                    }
                                  </strong>
                                </td>

                                <td>
                                  {item.name}
                                </td>

                                <td>
                                  <span className="roleBadge">
                                    {item.role ||
                                      'staff'}
                                  </span>
                                </td>

                                <td>
                                  <span
                                    className={
                                      item.access_enabled
                                        ? 'status active'
                                        : 'status inactive'
                                    }
                                  >
                                    {item.access_enabled
                                      ? 'Active'
                                      : 'Disabled'}
                                  </span>
                                </td>
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

          {/*
           * ADD EMPLOYEE
           */}

          {page === 'add' &&
            isAdmin && (
              <section className="formSection">
                <PageTitle
                  title="Add Employee"
                  text="Create access for a new employee."
                />

                <div className="formCard">
                  <div className="formGrid">
                    <div className="inputGroup">
                      <label>
                        Employee ID
                      </label>

                      <input
                        value={
                          newEmployeeId
                        }
                        onChange={(e) =>
                          setNewEmployeeId(
                            e.target.value
                          )
                        }
                        placeholder="Example: EMP1001"
                      />
                    </div>

                    <div className="inputGroup">
                      <label>
                        Employee Name
                      </label>

                      <input
                        value={
                          newEmployeeName
                        }
                        onChange={(e) =>
                          setNewEmployeeName(
                            e.target.value
                          )
                        }
                        placeholder="Enter employee name"
                      />
                    </div>
                  </div>

                  <button
                    className="primaryButton"
                    onClick={addEmployee}
                    disabled={loading}
                  >
                    {loading
                      ? 'Adding...'
                      : '＋ Add Employee'}
                  </button>
                </div>
              </section>
            )}

          {/*
           * OT RECORDS
           */}

          {page === 'ot' &&
            isAdmin && (
              <section>
                <PageTitle
                  title="OT Records"
                  text="View, filter and download overtime records."
                />

                <div className="filterCard">
                  <div className="dateField">
                    <label>
                      From Date
                    </label>

                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) =>
                        setFromDate(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="dateField">
                    <label>
                      To Date
                    </label>

                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) =>
                        setToDate(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <button
                    className="primaryButton"
                    onClick={getOTRecords}
                    disabled={loading}
                  >
                    {loading
                      ? 'Loading...'
                      : 'View Records'}
                  </button>

                  <button
                    className="secondaryButton"
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                    }}
                  >
                    Clear
                  </button>

                  <button
                    className="downloadButton"
                    onClick={downloadCSV}
                  >
                    ↓ Download CSV
                  </button>
                </div>

                <div className="otSummaryGrid">
                  <div className="smallStat">
                    <span>
                      Records
                    </span>

                    <strong>
                      {filteredOT.length}
                    </strong>
                  </div>

                  <div className="smallStat">
                    <span>
                      Total OT Hours
                    </span>

                    <strong>
                      {totalHours}
                    </strong>
                  </div>
                </div>

                <div className="tableCard">
                  <div className="tableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            Employee ID
                          </th>

                          <th>Name</th>

                          <th>
                            OT Date
                          </th>

                          <th>
                            OT Hours
                          </th>

                          <th>
                            Comp Off
                          </th>

                          <th>
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredOT.length ===
                        0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="emptyCell"
                            >
                              No OT records
                              found for the
                              selected period.
                            </td>
                          </tr>
                        ) : (
                          filteredOT.map(
                            (record) => (
                              <tr
                                key={
                                  record.id
                                }
                              >
                                <td>
                                  <strong>
                                    {
                                      record.employee_id
                                    }
                                  </strong>
                                </td>

                                <td>
                                  {record.name ||
                                    '-'}
                                </td>

                                <td>
                                  {
                                    record.ot_date
                                  }
                                </td>

                                <td>
                                  {
                                    record.ot_hours ??
                                    0
                                  }
                                </td>

                                <td>
                                  {
                                    record.comp_off ??
                                    '-'
                                  }
                                </td>

                                <td>
                                  {
                                    record.status ||
                                    '-'
                                  }
                                </td>
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

          {/*
           * ADMIN MANAGEMENT
           */}

          {page === 'management' &&
            isAdmin && (
              <section>
                <PageTitle
                  title="Admin Management"
                  text="Manage administrator access and staff accounts."
                />

                <div className="managementGrid">
                  <div className="managementCard">
                    <div className="managementHeader">
                      <div className="managementIcon">
                        👑
                      </div>

                      <div>
                        <h2>
                          Make Admin
                        </h2>

                        <p>
                          Give an employee
                          administrator
                          access.
                        </p>
                      </div>
                    </div>

                    <label>
                      Select Employee
                    </label>

                    <select
                      value={
                        selectedStaffId
                      }
                      onChange={(e) =>
                        setSelectedStaffId(
                          e.target.value
                            ? Number(
                                e.target
                                  .value
                              )
                            : ''
                        )
                      }
                    >
                      <option value="">
                        Select employee
                      </option>

                      {staff
                        .filter(
                          (item) =>
                            item.role !==
                              'admin' &&
                            item.access_enabled
                        )
                        .map((item) => (
                          <option
                            key={item.id}
                            value={
                              item.id
                            }
                          >
                            {item.employee_id}{' '}
                            - {item.name}
                          </option>
                        ))}
                    </select>

                    <label>
                      New Admin Password
                    </label>

                    <input
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

                    <label>
                      Confirm Password
                    </label>

                    <input
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

                    <button
                      className="primaryButton fullButton"
                      onClick={
                        makeAdmin
                      }
                      disabled={loading}
                    >
                      {loading
                        ? 'Processing...'
                        : 'Make Admin'}
                    </button>
                  </div>

                  <div className="managementCard">
                    <div className="managementHeader">
                      <div className="managementIcon">
                        🚫
                      </div>

                      <div>
                        <h2>
                          Remove Admin
                        </h2>

                        <p>
                          Remove administrator
                          access.
                        </p>
                      </div>
                    </div>

                    <label>
                      Select Admin
                    </label>

                    <select
                      value={
                        selectedStaffId
                      }
                      onChange={(e) =>
                        setSelectedStaffId(
                          e.target.value
                            ? Number(
                                e.target
                                  .value
                              )
                            : ''
                        )
                      }
                    >
                      <option value="">
                        Select admin
                      </option>

                      {admins.map(
                        (item) => (
                          <option
                            key={item.id}
                            value={
                              item.id
                            }
                          >
                            {item.employee_id}{' '}
                            - {item.name}
                            {item.employee_id.toUpperCase() ===
                            MAIN_ADMIN_ID
                              ? ' (Main Admin)'
                              : ''}
                          </option>
                        )
                      )}
                    </select>

                    <div className="protectedNote">
                      🔒 SAS102 is the protected
                      Main Admin and cannot
                      be removed.
                    </div>

                    <button
                      className="dangerButton fullButton"
                      onClick={
                        removeAdmin
                      }
                      disabled={loading}
                    >
                      {loading
                        ? 'Processing...'
                        : 'Remove Admin'}
                    </button>
                  </div>

                  <div className="managementCard">
                    <div className="managementHeader">
                      <div className="managementIcon">
                        👤
                      </div>

                      <div>
                        <h2>
                          Remove Staff
                        </h2>

                        <p>
                          Disable staff login
                          without deleting
                          their history.
                        </p>
                      </div>
                    </div>

                    <label>
                      Select Staff
                    </label>

                    <select
                      value={
                        selectedStaffId
                      }
                      onChange={(e) =>
                        setSelectedStaffId(
                          e.target.value
                            ? Number(
                                e.target
                                  .value
                              )
                            : ''
                        )
                      }
                    >
                      <option value="">
                        Select staff
                      </option>

                      {staff
                        .filter(
                          (item) =>
                            item.role !==
                              'admin' &&
                            item.access_enabled
                        )
                        .map((item) => (
                          <option
                            key={item.id}
                            value={
                              item.id
                            }
                          >
                            {item.employee_id}{' '}
                            - {item.name}
                          </option>
                        ))}
                    </select>

                    <div className="protectedNote">
                      ℹ Staff history will be
                      preserved. Only login
                      access will be disabled.
                    </div>

                    <button
                      className="dangerButton fullButton"
                      onClick={
                        removeStaff
                      }
                      disabled={loading}
                    >
                      {loading
                        ? 'Processing...'
                        : 'Remove Staff'}
                    </button>
                  </div>

                  <div className="managementCard">
                    <div className="managementHeader">
                      <div className="managementIcon">
                        🔑
                      </div>

                      <div>
                        <h2>
                          Reset Admin Password
                        </h2>

                        <p>
                          Set a new password for
                          an active admin.
                        </p>
                      </div>
                    </div>

                    <label>
                      Select Admin
                    </label>

                    <select
                      value={
                        selectedStaffId
                      }
                      onChange={(e) =>
                        setSelectedStaffId(
                          e.target.value
                            ? Number(
                                e.target
                                  .value
                              )
                            : ''
                        )
                      }
                    >
                      <option value="">
                        Select admin
                      </option>

                      {admins
                        .filter(
                          (item) =>
                            item.access_enabled
                        )
                        .map(
                          (item) => (
                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                            >
                              {
                                item.employee_id
                              }{' '}
                              - {item.name}
                            </option>
                          )
                        )}
                    </select>

                    <label>
                      New Password
                    </label>

                    <input
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

                    <label>
                      Confirm Password
                    </label>

                    <input
                      type="password"
                      value={
                        adminConfirmPassword
                      }
                      onChange={(e) =>
                        setAdminConfirmPassword(
                          e.target.value
                        )
                      }
                      placeholder="Confirm new password"
                    />

                    <button
                      className="primaryButton fullButton"
                      onClick={
                        resetAdminPassword
                      }
                      disabled={loading}
                    >
                      {loading
                        ? 'Processing...'
                        : 'Reset Password'}
                    </button>
                  </div>
                </div>

                <div className="adminListCard">
                  <div className="listHeader">
                    <div>
                      <h2>
                        Saved Admins
                      </h2>

                      <p>
                        Active administrator
                        accounts.
                      </p>
                    </div>

                    <span className="countBadge">
                      {activeAdminCount}
                    </span>
                  </div>

                  <div className="adminList">
                    {admins.length ===
                    0 ? (
                      <div className="emptyState">
                        No admin accounts
                        found.
                      </div>
                    ) : (
                      admins.map(
                        (item) => (
                          <div
                            className="adminRow"
                            key={item.id}
                          >
                            <div className="adminAvatar">
                              {item.name
                                ?.charAt(
                                  0
                                )
                                .toUpperCase() ||
                                'A'}
                            </div>

                            <div className="adminDetails">
                              <strong>
                                {item.name}
                              </strong>

                              <span>
                                {
                                  item.employee_id
                                }
                              </span>
                            </div>

                            <div>
                              {item.employee_id.toUpperCase() ===
                              MAIN_ADMIN_ID ? (
                                <span className="protectedBadge">
                                  Main Admin
                                </span>
                              ) : (
                                <span
                                  className={
                                    item.access_enabled
                                      ? 'status active'
                                      : 'status inactive'
                                  }
                                >
                                  {item.access_enabled
                                    ? 'Active'
                                    : 'Disabled'}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              </section>
            )}

          {/*
           * CHANGE PASSWORD
           */}

          {page === 'password' &&
            isAdmin && (
              <section className="formSection">
                <PageTitle
                  title="Change My Password"
                  text="Update your administrator login password."
                />

                <div className="formCard passwordCard">
                  <div className="securityBanner">
                    <div className="securityIcon">
                      🔐
                    </div>

                    <div>
                      <strong>
                        Password Security
                      </strong>

                      <p>
                        Your old password is
                        required before a new
                        password can be saved.
                      </p>
                    </div>
                  </div>

                  <div className="formGrid singleColumn">
                    <div className="inputGroup">
                      <label>
                        Old Password
                      </label>

                      <input
                        type="password"
                        value={
                          oldPassword
                        }
                        onChange={(e) =>
                          setOldPassword(
                            e.target.value
                          )
                        }
                        placeholder="Enter old password"
                      />
                    </div>

                    <div className="inputGroup">
                      <label>
                        New Password
                      </label>

                      <input
                        type="password"
                        value={
                          newPassword
                        }
                        onChange={(e) =>
                          setNewPassword(
                            e.target.value
                          )
                        }
                        placeholder="Minimum 6 characters"
                      />
                    </div>

                    <div className="inputGroup">
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

                  <button
                    className="primaryButton"
                    onClick={
                      changeMyPassword
                    }
                    disabled={loading}
                  >
                    {loading
                      ? 'Saving...'
                      : 'Save New Password'}
                  </button>
                </div>
              </section>
            )}
        </main>

        <footer className="footer">
          <span>
            OT DETAILS
          </span>

          <span>
            OT & Comp-Off Management Portal
          </span>
        </footer>
      </div>
    </>
  );
}

const globalStyles = `
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #f4f7fb;
  color: #172033;
}

body {
  min-height: 100vh;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* LOGIN */

.loginPage {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 18px;
  background:
    radial-gradient(
      circle at top left,
      #eaf1ff 0,
      transparent 34%
    ),
    #f4f7fb;
}

.loginCard {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border: 1px solid #dfe6f0;
  border-radius: 22px;
  padding: 38px;
  box-shadow:
    0 22px 60px rgba(31, 55, 88, 0.12);
}

.logoCircle {
  width: 70px;
  height: 70px;
  border-radius: 18px;
  background: #173b7a;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 21px;
  margin-bottom: 20px;
}

.brandName {
  color: #173b7a;
  font-size: 22px;
  font-weight: 850;
  letter-spacing: -0.4px;
}

.loginBrand {
  font-size: 28px;
}

.brandSub {
  color: #728097;
  font-size: 13px;
  margin-top: 5px;
}

.loginDivider {
  height: 1px;
  background: #e6ebf2;
  margin: 28px 0;
}

.loginCard h1 {
  margin: 0;
  font-size: 29px;
  color: #172033;
}

.loginText {
  color: #748197;
  margin: 8px 0 25px;
  font-size: 14px;
}

.loginCard label,
.formCard label,
.managementCard label,
.filterCard label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #33415a;
  margin-bottom: 8px;
}

.loginCard input,
.formCard input,
.managementCard input,
.managementCard select,
.filterCard input {
  width: 100%;
  height: 46px;
  border: 1px solid #d6deea;
  border-radius: 10px;
  background: #ffffff;
  padding: 0 13px;
  outline: none;
  color: #172033;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  margin-bottom: 18px;
}

.loginCard input:focus,
.formCard input:focus,
.managementCard input:focus,
.managementCard select:focus,
.filterCard input:focus {
  border-color: #315ca8;
  box-shadow:
    0 0 0 3px rgba(49, 92, 168, 0.1);
}

.primaryButton,
.secondaryButton,
.downloadButton,
.dangerButton {
  min-height: 44px;
  border-radius: 10px;
  padding: 0 17px;
  border: 1px solid transparent;
  font-weight: 750;
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    background 0.15s;
}

.primaryButton {
  background: #173b7a;
  color: white;
  border-color: #173b7a;
}

.primaryButton:hover {
  background: #102f66;
  transform: translateY(-1px);
  box-shadow:
    0 8px 20px rgba(23, 59, 122, 0.2);
}

.secondaryButton {
  background: white;
  color: #31415b;
  border-color: #d5deea;
}

.secondaryButton:hover {
  background: #f5f7fa;
}

.downloadButton {
  background: #eaf1ff;
  color: #173b7a;
  border-color: #cddbf5;
}

.downloadButton:hover {
  background: #dfeaff;
}

.dangerButton {
  background: #b42318;
  color: white;
  border-color: #b42318;
}

.dangerButton:hover {
  background: #921c13;
}

.fullButton {
  width: 100%;
}

.loginCard .fullButton {
  margin-top: 5px;
}

.alert {
  padding: 12px 14px;
  border-radius: 10px;
  margin-top: 16px;
  font-size: 13px;
  font-weight: 650;
}

.alert.success {
  background: #ecfdf3;
  color: #087443;
  border: 1px solid #b7ebcc;
}

.alert.error {
  background: #fff1f0;
  color: #b42318;
  border: 1px solid #ffd0cc;
}

.loginFooter {
  text-align: center;
  color: #9aa6b8;
  font-size: 12px;
  margin-top: 25px;
}

/* APP */

.app {
  min-height: 100vh;
  background: #f4f7fb;
}

.topHeader {
  min-height: 76px;
  background: #ffffff;
  border-bottom: 1px solid #e0e6ef;
  padding: 14px 5%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  position: sticky;
  top: 0;
  z-index: 20;
}

.headerBrand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brandMark {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #173b7a;
  color: white;
  font-size: 13px;
  font-weight: 850;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 20px;
}

.userInfo {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.userInfo strong {
  color: #202b3e;
  font-size: 14px;
}

.userInfo span {
  color: #7b8799;
  font-size: 12px;
}

.logoutButton {
  border: 1px solid #d8e0eb;
  background: white;
  color: #26364e;
  min-height: 40px;
  padding: 0 15px;
  border-radius: 9px;
  font-weight: 700;
}

.logoutButton:hover {
  background: #f4f7fb;
}

.mainContainer {
  width: min(1180px, 90%);
  margin: 0 auto;
  padding: 42px 0 70px;
}

.globalAlert {
  margin: 0 0 20px;
}

.welcomeSection {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 25px;
  margin-bottom: 28px;
}

.eyebrow {
  font-size: 11px;
  letter-spacing: 1.3px;
  color: #315ca8;
  font-weight: 850;
  margin-bottom: 7px;
}

.welcomeSection h1,
.pageTitle h1 {
  margin: 0;
  color: #172033;
  font-size: clamp(27px, 4vw, 37px);
  letter-spacing: -0.8px;
}

.welcomeSection p,
.pageTitle p {
  margin: 8px 0 0;
  color: #738096;
  font-size: 14px;
}

.welcomeBadge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 13px;
  border: 1px solid #d9e2ee;
  border-radius: 999px;
  background: #ffffff;
  color: #44536a;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.onlineDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1aa260;
}

.overviewGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 34px;
}

.overviewCard {
  background: white;
  border: 1px solid #e0e6ef;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow:
    0 8px 25px rgba(32, 55, 84, 0.05);
}

.overviewIcon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #edf3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
}

.overviewCard span {
  display: block;
  color: #7a879b;
  font-size: 12px;
  margin-bottom: 4px;
}

.overviewCard strong {
  display: block;
  font-size: 25px;
  color: #172033;
}

.sectionHeading {
  margin-bottom: 15px;
}

.sectionHeading h2 {
  margin: 0;
  font-size: 20px;
}

.sectionHeading p {
  margin: 4px 0 0;
  color: #7b8799;
  font-size: 13px;
}

.cardGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 17px;
}

.dashboardCard {
  min-height: 160px;
  text-align: left;
  position: relative;
  background: white;
  border: 1px solid #e0e6ef;
  border-radius: 17px;
  padding: 22px;
  color: #172033;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    border-color 0.2s;
}

.dashboardCard:hover {
  transform: translateY(-3px);
  border-color: #c8d5e8;
  box-shadow:
    0 14px 35px rgba(31, 55, 88, 0.09);
}

.cardIcon {
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #edf3ff;
  border-radius: 12px;
  color: #173b7a;
  font-size: 21px;
  margin-bottom: 18px;
}

.cardContent h3 {
  margin: 0;
  font-size: 16px;
  color: #1b2739;
}

.cardContent p {
  margin: 6px 0 0;
  color: #78859a;
  line-height: 1.5;
  font-size: 12px;
}

.cardArrow {
  position: absolute;
  right: 20px;
  bottom: 18px;
  color: #9aa7b9;
  font-size: 18px;
}

.dangerCard .cardIcon {
  background: #fff0ee;
  color: #b42318;
}

.dangerCard:hover {
  border-color: #f1c6c1;
}

.backButton {
  border: 0;
  background: transparent;
  color: #315ca8;
  font-weight: 750;
  padding: 0;
  margin-bottom: 25px;
}

.pageTitle {
  margin-bottom: 28px;
}

/* FORMS */

.formCard,
.filterCard,
.tableCard,
.adminListCard {
  background: #ffffff;
  border: 1px solid #e0e6ef;
  border-radius: 17px;
  box-shadow:
    0 8px 25px rgba(32, 55, 84, 0.05);
}

.formCard {
  padding: 27px;
  max-width: 760px;
}

.formGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 18px;
  margin-bottom: 8px;
}

.formGrid.singleColumn {
  grid-template-columns: 1fr;
}

.inputGroup {
  margin-bottom: 3px;
}

/* TABLE */

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 15px;
}

.tableCard {
  overflow: hidden;
}

.tableWrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}

th {
  background: #f7f9fc;
  color: #526176;
  font-size: 12px;
  text-align: left;
  padding: 14px 16px;
  border-bottom: 1px solid #e3e8ef;
  white-space: nowrap;
}

td {
  padding: 15px 16px;
  border-bottom: 1px solid #edf0f4;
  color: #344158;
  font-size: 13px;
}

tbody tr:hover {
  background: #fbfcfe;
}

.emptyCell {
  text-align: center;
  color: #8a96a8;
  padding: 35px !important;
}

.roleBadge,
.status,
.protectedBadge,
.countBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 750;
}

.roleBadge {
  padding: 5px 9px;
  background: #eef2f7;
  color: #526176;
}

.status {
  padding: 5px 10px;
}

.status.active {
  background: #e9f8ef;
  color: #087443;
}

.status.inactive {
  background: #fff0ee;
  color: #b42318;
}

/* OT */

.filterCard {
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr auto auto auto;
  align-items: end;
  gap: 13px;
  margin-bottom: 18px;
}

.filterCard input {
  margin-bottom: 0;
}

.otSummaryGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 18px;
}

.smallStat {
  background: white;
  border: 1px solid #e0e6ef;
  border-radius: 14px;
  padding: 16px 18px;
}

.smallStat span {
  display: block;
  color: #7a879b;
  font-size: 12px;
}

.smallStat strong {
  display: block;
  color: #173b7a;
  font-size: 24px;
  margin-top: 4px;
}

/* ADMIN MANAGEMENT */

.managementGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 17px;
  margin-bottom: 20px;
}

.managementCard {
  background: white;
  border: 1px solid #e0e6ef;
  border-radius: 17px;
  padding: 23px;
  box-shadow:
    0 8px 25px rgba(32, 55, 84, 0.05);
}

.managementHeader {
  display: flex;
  gap: 13px;
  margin-bottom: 21px;
}

.managementIcon {
  width: 45px;
  height: 45px;
  flex-shrink: 0;
  border-radius: 12px;
  background: #edf3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
}

.managementHeader h2 {
  margin: 0;
  font-size: 17px;
  color: #1b2739;
}

.managementHeader p {
  margin: 4px 0 0;
  color: #7a879b;
  font-size: 12px;
  line-height: 1.4;
}

.managementCard select {
  appearance: auto;
}

.protectedNote {
  background: #f7f9fc;
  border: 1px solid #e4e9f0;
  color: #66748a;
  border-radius: 10px;
  padding: 11px 12px;
  font-size: 11px;
  line-height: 1.5;
  margin-bottom: 17px;
}

.adminListCard {
  padding: 22px;
}

.listHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.listHeader h2 {
  margin: 0;
  font-size: 18px;
}

.listHeader p {
  margin: 4px 0 0;
  color: #7b8799;
  font-size: 12px;
}

.countBadge {
  width: 30px;
  height: 30px;
  background: #edf3ff;
  color: #173b7a;
}

.adminList {
  border-top: 1px solid #edf0f4;
}

.adminRow {
  min-height: 70px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #edf0f4;
}

.adminAvatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #173b7a;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.adminDetails {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.adminDetails strong {
  font-size: 13px;
}

.adminDetails span {
  color: #7a879b;
  font-size: 11px;
}

.protectedBadge {
  padding: 6px 10px;
  background: #edf3ff;
  color: #173b7a;
}

/* PASSWORD */

.passwordCard {
  max-width: 650px;
}

.securityBanner {
  display: flex;
  gap: 13px;
  padding: 14px;
  border: 1px solid #dbe5f3;
  background: #f6f9ff;
  border-radius: 12px;
  margin-bottom: 23px;
}

.securityIcon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.securityBanner strong {
  font-size: 13px;
}

.securityBanner p {
  margin: 3px 0 0;
  color: #718096;
  font-size: 11px;
  line-height: 1.4;
}

/* FOOTER */

.footer {
  border-top: 1px solid #e0e6ef;
  background: white;
  min-height: 60px;
  padding: 18px 5%;
  display: flex;
  justify-content: space-between;
  gap: 15px;
  color: #8a96a8;
  font-size: 11px;
}

.footer span:first-child {
  color: #173b7a;
  font-weight: 800;
}

/* RESPONSIVE */

@media (max-width: 1000px) {
  .cardGrid {
    grid-template-columns: repeat(2, 1fr);
  }

  .overviewGrid {
    grid-template-columns: 1fr;
  }

  .filterCard {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 780px) {
  .topHeader {
    align-items: flex-start;
  }

  .headerRight {
    gap: 10px;
  }

  .userInfo {
    display: none;
  }

  .managementGrid {
    grid-template-columns: 1fr;
  }

  .formGrid {
    grid-template-columns: 1fr;
  }

  .filterCard {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .mainContainer {
    width: 92%;
    padding-top: 28px;
  }

  .loginCard {
    padding: 27px 22px;
  }

  .topHeader {
    padding: 12px 4%;
  }

  .brandSub {
    font-size: 11px;
  }

  .brandName {
    font-size: 18px;
  }

  .cardGrid {
    grid-template-columns: 1fr;
  }

  .welcomeSection {
    flex-direction: column;
    align-items: flex-start;
  }

  .welcomeBadge {
    white-space: normal;
  }

  .footer {
    flex-direction: column;
  }

  .otSummaryGrid {
    grid-template-columns: 1fr;
  }
}
`;
