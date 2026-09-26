'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Staff = {
  id: number;
  employee_id: string;
  name: string;
  access_enabled: boolean;
  role?: string;
};

type Entry = {
  id: number;
  employee_id: string;
  name: string;
  ot_date: string;
  ot_hours: number;
  comp_off: boolean;
  created_at?: string;
};

type AdminStaff = Staff & {
  role: 'admin';
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const MAIN_ADMIN_ID = 'SAS102';
const STORAGE_KEY = 'ot_staff';

export default function Home() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [adminSection, setAdminSection] = useState<
    'dashboard' | 'staff' | 'add' | 'ot' | 'management' | 'password'
  >('dashboard');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [adminList, setAdminList] = useState<AdminStaff[]>([]);
  const [otRecords, setOtRecords] = useState<Entry[]>([]);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newName, setNewName] = useState('');

  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('');

  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [myNewPassword, setMyNewPassword] = useState('');
  const [confirmMyNewPassword, setConfirmMyNewPassword] = useState('');

  const isAdmin = staff?.role === 'admin';

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        setStaff(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const saveSession = (data: Staff) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setStaff(data);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStaff(null);
    setAdminSection('dashboard');
    setMessage('');
    setPassword('');
  };

  async function login() {
    if (!employeeId.trim()) {
      setMessage('Employee ID required');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      if (password.trim()) {
        const { data, error } = await supabase.rpc('admin_login', {
          p_employee_id: employeeId.trim(),
          p_password: password,
        });

        if (error) throw error;

        if (!data?.success) {
          setMessage(data?.message || 'Admin login failed');
          return;
        }

        const adminData: Staff = {
          id: data.staff_id,
          employee_id: data.employee_id,
          name: data.name,
          access_enabled: true,
          role: 'admin',
        };

        saveSession(adminData);
        setPassword('');
        return;
      }

      const { data, error } = await supabase.rpc('login_staff', {
        p_employee_id: employeeId.trim(),
      });

      if (error) throw error;

      if (!data?.success) {
        setMessage(data?.message || 'Employee not authorized');
        return;
      }

      const staffData: Staff = {
        id: data.staff_id,
        employee_id: data.employee_id,
        name: data.name,
        access_enabled: data.access_enabled ?? true,
        role: data.role ?? 'staff',
      };

      saveSession(staffData);
    } catch (err: any) {
      setMessage(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function loadStaff() {
    if (!staff?.employee_id) return;

    const { data, error } = await supabase.rpc('admin_get_staff', {
      p_admin_employee_id: staff.employee_id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.success) {
      setStaffList(data.staff || []);
    } else {
      setMessage(data?.message || 'Unable to load staff');
    }
  }

  async function loadAdmins() {
    if (!staff?.employee_id) return;

    const { data, error } = await supabase.rpc('admin_get_admins', {
      p_admin_employee_id: staff.employee_id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.success) {
      setAdminList(data.admins || []);
    } else {
      setMessage(data?.message || 'Unable to load admins');
    }
  }

  async function loadOT() {
    if (!staff?.employee_id) return;

    const { data, error } = await supabase.rpc('admin_get_all_ot', {
      p_admin_employee_id: staff.employee_id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.success) {
      setOtRecords(data.records || []);
    } else {
      setMessage(data?.message || 'Unable to load OT records');
    }
  }

  async function addEmployee() {
    if (!newEmployeeId.trim() || !newName.trim()) {
      setMessage('Employee ID and Name required');
      return;
    }

    if (!staff?.employee_id) return;

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.rpc('admin_add_staff', {
        p_admin_employee_id: staff.employee_id,
        p_employee_id: newEmployeeId.trim(),
        p_name: newName.trim(),
      });

      if (error) throw error;

      setMessage(data?.message || 'Employee added successfully');

      if (data?.success) {
        setNewEmployeeId('');
        setNewName('');
        await loadStaff();
      }
    } catch (err: any) {
      setMessage(err?.message || 'Unable to add employee');
    } finally {
      setLoading(false);
    }
  }

  async function removeStaff() {
    if (!selectedStaff || !staff?.employee_id) {
      setMessage('Select a staff member');
      return;
    }

    const selected = staffList.find(
      x => String(x.id) === String(selectedStaff)
    );

    if (!selected) return;

    if (!confirm(`Remove ${selected.name} (${selected.employee_id})?`)) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('admin_remove_staff', {
        p_admin_employee_id: staff.employee_id,
        p_staff_id: Number(selectedStaff),
      });

      if (error) throw error;

      setMessage(data?.message || 'Staff removed');

      if (data?.success) {
        setSelectedStaff('');
        await loadStaff();
      }
    } catch (err: any) {
      setMessage(err?.message || 'Unable to remove staff');
    } finally {
      setLoading(false);
    }
  }

  async function makeAdmin() {
    if (!selectedStaff) {
      setMessage('Select an employee');
      return;
    }

    if (!newAdminPassword || !confirmAdminPassword) {
      setMessage('New admin password and confirm password are required');
      return;
    }

    if (newAdminPassword !== confirmAdminPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (newAdminPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    if (!staff?.employee_id) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('admin_make_admin', {
        p_admin_employee_id: staff.employee_id,
        p_staff_id: Number(selectedStaff),
        p_new_password: newAdminPassword,
        p_confirm_password: confirmAdminPassword,
      });

      if (error) throw error;

      setMessage(data?.message || 'Employee is now admin');

      if (data?.success) {
        setSelectedStaff('');
        setNewAdminPassword('');
        setConfirmAdminPassword('');
        await loadStaff();
        await loadAdmins();
      }
    } catch (err: any) {
      setMessage(err?.message || 'Unable to make admin');
    } finally {
      setLoading(false);
    }
  }

  async function removeAdmin() {
    if (!selectedAdmin || !staff?.employee_id) {
      setMessage('Select an admin');
      return;
    }

    const target = adminList.find(
      x => String(x.id) === String(selectedAdmin)
    );

    if (!target) return;

    if (target.employee_id.toUpperCase() === MAIN_ADMIN_ID) {
      setMessage('Main Admin cannot be removed');
      return;
    }

    if (!confirm(`Remove admin access from ${target.name}?`)) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('admin_remove_admin', {
        p_admin_employee_id: staff.employee_id,
        p_target_admin_id: Number(selectedAdmin),
      });

      if (error) throw error;

      setMessage(data?.message || 'Admin removed');

      if (data?.success) {
        setSelectedAdmin('');
        await loadAdmins();
        await loadStaff();
      }
    } catch (err: any) {
      setMessage(err?.message || 'Unable to remove admin');
    } finally {
      setLoading(false);
    }
  }

  async function resetAdminPassword() {
    if (!selectedAdmin) {
      setMessage('Select an admin');
      return;
    }

    if (!newAdminPassword || !confirmAdminPassword) {
      setMessage('New password and confirm password are required');
      return;
    }

    if (newAdminPassword !== confirmAdminPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (newAdminPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    if (!staff?.employee_id) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        'admin_reset_admin_password',
        {
          p_admin_employee_id: staff.employee_id,
          p_target_admin_id: Number(selectedAdmin),
          p_new_password: newAdminPassword,
          p_confirm_password: confirmAdminPassword,
        }
      );

      if (error) throw error;

      setMessage(data?.message || 'Admin password reset');

      if (data?.success) {
        setSelectedAdmin('');
        setNewAdminPassword('');
        setConfirmAdminPassword('');
      }
    } catch (err: any) {
      setMessage(err?.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  }

  async function changeMyPassword() {
    if (!staff?.employee_id) return;

    if (!oldPassword) {
      setMessage('Old password is required');
      return;
    }

    if (!myNewPassword) {
      setMessage('New password is required');
      return;
    }

    if (!confirmMyNewPassword) {
      setMessage('Confirm password is required');
      return;
    }

    if (myNewPassword !== confirmMyNewPassword) {
      setMessage('New passwords do not match');
      return;
    }

    if (myNewPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        'admin_change_password',
        {
          p_admin_employee_id: staff.employee_id,
          p_old_password: oldPassword,
          p_new_password: myNewPassword,
          p_confirm_password: confirmMyNewPassword,
        }
      );

      if (error) throw error;

      setMessage(data?.message || 'Password changed');

      if (data?.success) {
        setOldPassword('');
        setMyNewPassword('');
        setConfirmMyNewPassword('');
      }
    } catch (err: any) {
      setMessage(err?.message || 'Unable to change password');
    } finally {
      setLoading(false);
    }
  }

  const filteredOT = useMemo(() => {
    return otRecords.filter(row => {
      if (fromDate && row.ot_date < fromDate) return false;
      if (toDate && row.ot_date > toDate) return false;
      return true;
    });
  }, [otRecords, fromDate, toDate]);

  const totalHours = useMemo(() => {
    return filteredOT.reduce(
      (sum, row) => sum + Number(row.ot_hours || 0),
      0
    );
  }, [filteredOT]);

  function downloadCSV() {
    if (!filteredOT.length) {
      setMessage('No OT records available for download');
      return;
    }

    const header = [
      'Employee ID',
      'Name',
      'OT Date',
      'OT Hours',
      'Comp Off',
    ];

    const rows = filteredOT.map(row => [
      row.employee_id,
      row.name,
      row.ot_date,
      row.ot_hours,
      row.comp_off ? 'Yes' : 'No',
    ]);

    const csv = [header, ...rows]
      .map(row =>
        row
          .map(value => `"${String(value ?? '').replace(/"/g, '""')}"`)
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

  function openSection(
    section:
      | 'dashboard'
      | 'staff'
      | 'add'
      | 'ot'
      | 'management'
      | 'password'
  ) {
    setAdminSection(section);
    setMessage('');

    if (section === 'staff') loadStaff();
    if (section === 'ot') loadOT();
    if (section === 'management') {
      loadStaff();
      loadAdmins();
    }
  }

  if (!staff) {
    return (
      <>
        <div className="loginPage">
          <div className="loginCard">
            <div className="brandLogo">OT</div>

            <h1>OT & COMP-OFF</h1>
            <p className="loginSubtitle">
              Employee Operations Portal
            </p>

            <label>Employee ID</label>
            <input
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              placeholder="Enter Employee ID"
              onKeyDown={e => {
                if (e.key === 'Enter') login();
              }}
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Admin password only"
              onKeyDown={e => {
                if (e.key === 'Enter') login();
              }}
            />

            {message && <div className="message">{message}</div>}

            <button className="primaryBtn" onClick={login} disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <p className="loginNote">
              Staff can sign in with Employee ID.
              <br />
              Admin login requires password.
            </p>
          </div>
        </div>

        <style jsx global>{styles}</style>
      </>
    );
  }

  if (isAdmin) {
    return (
      <>
        <div className="appPage">
          <header className="topbar">
            <div>
              <div className="brandName">OT & COMP-OFF</div>
              <div className="brandSub">Operations Management Portal</div>
            </div>

            <div className="topRight">
              <div className="adminInfo">
                <span>Admin</span>
                <strong>{staff.employee_id}</strong>
              </div>

              <button className="logoutBtn" onClick={logout}>
                Logout
              </button>
            </div>
          </header>

          <main className="mainContent">
            {adminSection === 'dashboard' && (
              <>
                <section className="welcomeCard">
                  <div>
                    <div className="smallLabel">ADMINISTRATOR PANEL</div>
                    <h2>Good Morning, {staff.name}</h2>
                    <p>
                      Manage employees, OT records and administrator access
                      from one place.
                    </p>
                  </div>

                  <div className="adminBadge">
                    <span>ADMIN ID</span>
                    <strong>{staff.employee_id}</strong>
                  </div>
                </section>

                <section className="dashboardGrid">
                  <DashboardCard
                    icon="👥"
                    title="Staff Details"
                    description="View employee details and access status."
                    onClick={() => openSection('staff')}
                  />

                  <DashboardCard
                    icon="＋"
                    title="Add Employee"
                    description="Create a new employee access record."
                    onClick={() => openSection('add')}
                  />

                  <DashboardCard
                    icon="◷"
                    title="OT Records"
                    description="View, filter and download OT records."
                    onClick={() => openSection('ot')}
                  />

                  <DashboardCard
                    icon="⚙"
                    title="Admin Management"
                    description="Manage administrators and staff access."
                    onClick={() => openSection('management')}
                  />

                  <DashboardCard
                    icon="🔐"
                    title="Change Password"
                    description="Securely change your admin password."
                    onClick={() => openSection('password')}
                  />

                  <DashboardCard
                    icon="↪"
                    title="Logout"
                    description="Sign out securely from the portal."
                    danger
                    onClick={logout}
                  />
                </section>

                <section className="overviewSection">
                  <div className="sectionTitle">
                    <div>
                      <h3>Quick Overview</h3>
                      <p>Current portal summary</p>
                    </div>
                  </div>

                  <div className="overviewGrid">
                    <OverviewCard
                      label="Active Staff"
                      value="—"
                      icon="👥"
                    />
                    <OverviewCard
                      label="OT Records"
                      value={otRecords.length || '—'}
                      icon="◷"
                    />
                    <OverviewCard
                      label="OT Hours"
                      value={totalHours || '—'}
                      icon="⌛"
                    />
                  </div>
                </section>
              </>
            )}

            {adminSection !== 'dashboard' && (
              <button
                className="backBtn"
                onClick={() => openSection('dashboard')}
              >
                ← Back to Dashboard
              </button>
            )}

            {adminSection === 'staff' && (
              <section className="contentCard">
                <SectionHeader
                  title="Staff Details"
                  subtitle="View all employees and their current access status."
                />

                <button
                  className="secondaryBtn"
                  onClick={loadStaff}
                  disabled={loading}
                >
                  ↻ Refresh
                </button>

                <div className="tableContainer">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Access</th>
                      </tr>
                    </thead>

                    <tbody>
                      {staffList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="empty">
                            No staff records found.
                          </td>
                        </tr>
                      ) : (
                        staffList.map(row => (
                          <tr key={row.id}>
                            <td>
                              <strong>{row.employee_id}</strong>
                            </td>
                            <td>{row.name}</td>
                            <td>
                              <span className="roleBadge">
                                {row.role || 'staff'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={
                                  row.access_enabled
                                    ? 'status active'
                                    : 'status inactive'
                                }
                              >
                                {row.access_enabled
                                  ? 'Active'
                                  : 'Disabled'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {message && <div className="message">{message}</div>}
              </section>
            )}

            {adminSection === 'add' && (
              <section className="contentCard narrowContent">
                <SectionHeader
                  title="Add Employee"
                  subtitle="Create access for a new employee."
                />

                <div className="formGrid">
                  <div>
                    <label>Employee ID</label>
                    <input
                      value={newEmployeeId}
                      onChange={e => setNewEmployeeId(e.target.value)}
                      placeholder="e.g. EMP1001"
                    />
                  </div>

                  <div>
                    <label>Employee Name</label>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Enter employee name"
                    />
                  </div>
                </div>

                {message && <div className="message">{message}</div>}

                <button
                  className="primaryBtn smallBtn"
                  onClick={addEmployee}
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Employee'}
                </button>
              </section>
            )}

            {adminSection === 'ot' && (
              <section className="contentCard">
                <SectionHeader
                  title="OT Records"
                  subtitle="Filter OT records by date and download them as CSV."
                />

                <div className="filterGrid">
                  <div>
                    <label>From Date</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>To Date</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                    />
                  </div>

                  <div className="filterActions">
                    <button
                      className="primaryBtn"
                      onClick={loadOT}
                      disabled={loading}
                    >
                      View Records
                    </button>

                    <button
                      className="secondaryBtn"
                      onClick={() => {
                        setFromDate('');
                        setToDate('');
                      }}
                    >
                      Clear
                    </button>

                    <button
                      className="downloadBtn"
                      onClick={downloadCSV}
                    >
                      ↓ Download Excel
                    </button>
                  </div>
                </div>

                <div className="summaryRow">
                  <div>
                    <span>Records</span>
                    <strong>{filteredOT.length}</strong>
                  </div>

                  <div>
                    <span>Total OT Hours</span>
                    <strong>{totalHours}</strong>
                  </div>
                </div>

                <div className="tableContainer">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>OT Date</th>
                        <th>OT Hours</th>
                        <th>Comp-Off</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOT.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="empty">
                            No OT records found.
                          </td>
                        </tr>
                      ) : (
                        filteredOT.map(row => (
                          <tr key={row.id}>
                            <td>{row.employee_id}</td>
                            <td>{row.name}</td>
                            <td>{row.ot_date}</td>
                            <td>{row.ot_hours}</td>
                            <td>
                              {row.comp_off ? (
                                <span className="status active">
                                  Yes
                                </span>
                              ) : (
                                <span className="status inactive">
                                  No
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {adminSection === 'management' && (
              <section className="contentCard">
                <SectionHeader
                  title="Admin Management"
                  subtitle="Manage administrator privileges and employee access."
                />

                <div className="managementGrid">
                  <div className="managementCard">
                    <div className="managementIcon">🛡</div>
                    <h3>Admin List</h3>
                    <p>
                      Remove admin access from an existing administrator.
                    </p>

                    <select
                      value={selectedAdmin}
                      onChange={e => setSelectedAdmin(e.target.value)}
                    >
                      <option value="">Select Admin</option>

                      {adminList.map(admin => (
                        <option key={admin.id} value={admin.id}>
                          {admin.employee_id} - {admin.name}
                          {admin.employee_id === MAIN_ADMIN_ID
                            ? ' (Main Admin)'
                            : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      className="dangerBtn"
                      onClick={removeAdmin}
                      disabled={loading || !selectedAdmin}
                    >
                      Remove Admin
                    </button>
                  </div>

                  <div className="managementCard">
                    <div className="managementIcon">＋</div>
                    <h3>Make Admin</h3>
                    <p>
                      Select a staff member and create their admin login.
                    </p>

                    <select
                      value={selectedStaff}
                      onChange={e => setSelectedStaff(e.target.value)}
                    >
                      <option value="">Select Employee</option>

                      {staffList
                        .filter(x => x.role !== 'admin')
                        .map(row => (
                          <option key={row.id} value={row.id}>
                            {row.employee_id} - {row.name}
                          </option>
                        ))}
                    </select>

                    <input
                      type="password"
                      value={newAdminPassword}
                      onChange={e =>
                        setNewAdminPassword(e.target.value)
                      }
                      placeholder="New admin password"
                    />

                    <input
                      type="password"
                      value={confirmAdminPassword}
                      onChange={e =>
                        setConfirmAdminPassword(e.target.value)
                      }
                      placeholder="Confirm admin password"
                    />

                    <button
                      className="primaryBtn"
                      onClick={makeAdmin}
                      disabled={loading}
                    >
                      Make Admin
                    </button>
                  </div>

                  <div className="managementCard">
                    <div className="managementIcon dangerIcon">−</div>
                    <h3>Remove Staff</h3>
                    <p>
                      Disable employee login while keeping their old OT
                      history.
                    </p>

                    <select
                      value={selectedStaff}
                      onChange={e => setSelectedStaff(e.target.value)}
                    >
                      <option value="">Select Staff</option>

                      {staffList
                        .filter(x => x.role !== 'admin')
                        .map(row => (
                          <option key={row.id} value={row.id}>
                            {row.employee_id} - {row.name}
                          </option>
                        ))}
                    </select>

                    <button
                      className="dangerBtn"
                      onClick={removeStaff}
                      disabled={loading || !selectedStaff}
                    >
                      Remove Staff
                    </button>
                  </div>

                  <div className="managementCard">
                    <div className="managementIcon">🔑</div>
                    <h3>Reset Admin Password</h3>
                    <p>
                      Select an existing administrator and set a new
                      password.
                    </p>

                    <select
                      value={selectedAdmin}
                      onChange={e => setSelectedAdmin(e.target.value)}
                    >
                      <option value="">Select Admin</option>

                      {adminList.map(admin => (
                        <option key={admin.id} value={admin.id}>
                          {admin.employee_id} - {admin.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="password"
                      value={newAdminPassword}
                      onChange={e =>
                        setNewAdminPassword(e.target.value)
                      }
                      placeholder="New password"
                    />

                    <input
                      type="password"
                      value={confirmAdminPassword}
                      onChange={e =>
                        setConfirmAdminPassword(e.target.value)
                      }
                      placeholder="Confirm password"
                    />

                    <button
                      className="primaryBtn"
                      onClick={resetAdminPassword}
                      disabled={loading}
                    >
                      Reset Password
                    </button>
                  </div>
                </div>

                {message && <div className="message">{message}</div>}
              </section>
            )}

            {adminSection === 'password' && (
              <section className="contentCard narrowContent">
                <SectionHeader
                  title="Change My Password"
                  subtitle="Your current password is required before changing it."
                />

                <div className="passwordForm">
                  <div>
                    <label>Old Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="Enter old password"
                    />
                  </div>

                  <div>
                    <label>New Password</label>
                    <input
                      type="password"
                      value={myNewPassword}
                      onChange={e =>
                        setMyNewPassword(e.target.value)
                      }
                      placeholder="Minimum 6 characters"
                    />
                  </div>

                  <div>
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmMyNewPassword}
                      onChange={e =>
                        setConfirmMyNewPassword(e.target.value)
                      }
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                {message && <div className="message">{message}</div>}

                <button
                  className="primaryBtn"
                  onClick={changeMyPassword}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Change Password'}
                </button>
              </section>
            )}
          </main>
        </div>

        <style jsx global>{styles}</style>
      </>
    );
  }

  return (
    <>
      <div className="appPage">
        <header className="topbar">
          <div>
            <div className="brandName">OT & COMP-OFF</div>
            <div className="brandSub">Employee Portal</div>
          </div>

          <div className="topRight">
            <div className="adminInfo">
              <span>Employee</span>
              <strong>{staff.employee_id}</strong>
            </div>

            <button className="logoutBtn" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <main className="mainContent">
          <section className="welcomeCard">
            <div>
              <div className="smallLabel">EMPLOYEE PORTAL</div>
              <h2>Welcome, {staff.name}</h2>
              <p>
                Your OT and Comp-Off management portal is ready.
              </p>
            </div>

            <div className="adminBadge">
              <span>EMPLOYEE ID</span>
              <strong>{staff.employee_id}</strong>
            </div>
          </section>

          <section className="dashboardGrid staffDashboard">
            <DashboardCard
              icon="＋"
              title="Add OT"
              description="Submit your overtime entry."
              onClick={() => {}}
            />

            <DashboardCard
              icon="◷"
              title="My OT Records"
              description="View your submitted OT records."
              onClick={() => {}}
            />

            <DashboardCard
              icon="↪"
              title="Logout"
              description="Sign out securely."
              danger
              onClick={logout}
            />
          </section>
        </main>
      </div>

      <style jsx global>{styles}</style>
    </>
  );
}

function DashboardCard({
  icon,
  title,
  description,
  onClick,
  danger = false,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`dashboardCard ${danger ? 'dangerCard' : ''}`}
      onClick={onClick}
    >
      <div className={`dashboardIcon ${danger ? 'dangerIcon' : ''}`}>
        {icon}
      </div>

      <div className="dashboardText">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <span className="cardArrow">→</span>
    </button>
  );
}

function OverviewCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="overviewCard">
      <div className="overviewIcon">{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="sectionHeader">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

const styles = `
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: Inter, Arial, Helvetica, sans-serif;
  background: #f3f6fa;
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
  border: 0;
  cursor: pointer;
}

button:disabled {
  opacity: .6;
  cursor: not-allowed;
}

input,
select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d9e0ea;
  border-radius: 9px;
  background: #fff;
  color: #172033;
  outline: none;
  transition: .2s ease;
}

input:focus,
select:focus {
  border-color: #2857a4;
  box-shadow: 0 0 0 3px rgba(40,87,164,.10);
}

label {
  display: block;
  margin-bottom: 7px;
  font-size: 13px;
  font-weight: 650;
  color: #344054;
}

/* LOGIN */

.loginPage {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 25px;
  background:
    radial-gradient(circle at top left, #e8f0ff 0, transparent 34%),
    radial-gradient(circle at bottom right, #e9f3ff 0, transparent 32%),
    #f5f7fb;
}

.loginCard {
  width: 100%;
  max-width: 430px;
  padding: 38px;
  background: rgba(255,255,255,.96);
  border: 1px solid #e4e9f0;
  border-radius: 20px;
  box-shadow: 0 18px 50px rgba(23,43,77,.10);
}

.brandLogo {
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  border-radius: 15px;
  background: linear-gradient(135deg,#173b7a,#2857a4);
  color: white;
  font-weight: 850;
  font-size: 19px;
  letter-spacing: 1px;
  box-shadow: 0 9px 20px rgba(23,59,122,.20);
}

.loginCard h1 {
  margin: 0;
  color: #122747;
  font-size: 28px;
}

.loginSubtitle {
  margin: 7px 0 27px;
  color: #667085;
  font-size: 13px;
}

.loginCard label {
  margin-top: 15px;
}

.loginCard .primaryBtn {
  width: 100%;
  margin-top: 20px;
}

.loginNote {
  margin: 19px 0 0;
  color: #98a2b3;
  text-align: center;
  font-size: 12px;
  line-height: 1.6;
}

/* BUTTONS */

.primaryBtn,
.secondaryBtn,
.downloadBtn,
.dangerBtn,
.logoutBtn,
.backBtn {
  border-radius: 9px;
  padding: 11px 17px;
  font-weight: 650;
  transition: .2s ease;
}

.primaryBtn {
  background: #173b7a;
  color: #fff;
}

.primaryBtn:hover:not(:disabled) {
  background: #102f63;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(23,59,122,.18);
}

.secondaryBtn {
  background: #fff;
  color: #344054;
  border: 1px solid #d8e0ea;
}

.secondaryBtn:hover:not(:disabled) {
  border-color: #b9c6d8;
  color: #173b7a;
  background: #f8faff;
}

.downloadBtn {
  background: #eaf1ff;
  color: #173b7a;
}

.downloadBtn:hover {
  background: #dce8ff;
}

.dangerBtn {
  background: #fff1f1;
  color: #a12828;
  border: 1px solid #f1d5d5;
}

.dangerBtn:hover:not(:disabled) {
  background: #ffe6e6;
}

.logoutBtn {
  background: #fff;
  color: #344054;
  border: 1px solid #d8e0ea;
}

.logoutBtn:hover {
  color: #a12828;
  border-color: #e2bcbc;
  background: #fff8f8;
}

.smallBtn {
  margin-top: 20px;
}

/* MAIN */

.appPage {
  min-height: 100vh;
  background:
    radial-gradient(circle at 90% 0%, #e9f1ff 0, transparent 26%),
    #f4f7fb;
}

.topbar {
  min-height: 74px;
  padding: 0 6%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: rgba(255,255,255,.97);
  border-bottom: 1px solid #e5eaf1;
  box-shadow: 0 2px 10px rgba(16,24,40,.035);
}

.brandName {
  color: #173b7a;
  font-size: 19px;
  font-weight: 850;
  letter-spacing: .2px;
}

.brandSub {
  margin-top: 3px;
  color: #98a2b3;
  font-size: 11px;
}

.topRight {
  display: flex;
  align-items: center;
  gap: 15px;
}

.adminInfo {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.adminInfo span {
  color: #98a2b3;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .7px;
}

.adminInfo strong {
  color: #173b7a;
  font-size: 13px;
}

/* CONTENT */

.mainContent {
  width: 88%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 0 55px;
}

.welcomeCard {
  min-height: 150px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 25px;
  padding: 27px 30px;
  background: linear-gradient(120deg,#ffffff,#f8fbff);
  border: 1px solid #e0e7f0;
  border-radius: 17px;
  box-shadow: 0 6px 22px rgba(16,24,40,.055);
}

.smallLabel {
  margin-bottom: 7px;
  color: #2857a4;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.1px;
}

.welcomeCard h2 {
  margin: 0 0 8px;
  color: #142b4d;
  font-size: 25px;
}

.welcomeCard p {
  margin: 0;
  color: #667085;
  font-size: 13px;
}

.adminBadge {
  min-width: 145px;
  padding: 14px 18px;
  text-align: center;
  border-radius: 12px;
  background: #edf3ff;
  border: 1px solid #dce7fb;
}

.adminBadge span {
  display: block;
  color: #667085;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .8px;
}

.adminBadge strong {
  display: block;
  margin-top: 4px;
  color: #173b7a;
  font-size: 17px;
}

/* DASHBOARD CARDS */

.dashboardGrid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 18px;
  margin-top: 23px;
}

.dashboardCard {
  position: relative;
  min-height: 155px;
  padding: 23px;
  text-align: left;
  background: #fff;
  border: 1px solid #e0e7f0;
  border-radius: 16px;
  box-shadow: 0 5px 18px rgba(16,24,40,.045);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}

.dashboardCard:hover {
  transform: translateY(-4px);
  border-color: #bfd0ea;
  box-shadow: 0 13px 30px rgba(16,24,40,.10);
}

.dashboardIcon {
  width: 44px;
  height: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 12px;
  background: #edf3ff;
  color: #173b7a;
  font-size: 19px;
  font-weight: 800;
}

.dashboardText h3 {
  margin: 17px 0 5px;
  color: #172b4d;
  font-size: 16px;
}

.dashboardText p {
  margin: 0;
  max-width: 240px;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.cardArrow {
  position: absolute;
  right: 21px;
  bottom: 20px;
  color: #98a2b3;
  font-size: 17px;
}

.dangerCard {
  border-color: #eee0e0;
}

.dangerCard:hover {
  border-color: #e5c5c5;
}

.dangerIcon {
  background: #fff1f1 !important;
  color: #a12828 !important;
}

/* OVERVIEW */

.overviewSection {
  margin-top: 25px;
  padding: 22px;
  background: #fff;
  border: 1px solid #e0e7f0;
  border-radius: 16px;
  box-shadow: 0 5px 18px rgba(16,24,40,.04);
}

.sectionTitle h3 {
  margin: 0;
  color: #172b4d;
  font-size: 17px;
}

.sectionTitle p {
  margin: 4px 0 18px;
  color: #98a2b3;
  font-size: 12px;
}

.overviewGrid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 14px;
}

.overviewCard {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 16px;
  border-radius: 12px;
  background: #f7f9fc;
  border: 1px solid #e8edf3;
}

.overviewIcon {
  width: 39px;
  height: 39px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10px;
  background: #eaf1ff;
  color: #173b7a;
}

.overviewCard span {
  display: block;
  color: #667085;
  font-size: 11px;
}

.overviewCard strong {
  display: block;
  margin-top: 2px;
  color: #173b7a;
  font-size: 20px;
}

/* INNER PAGES */

.backBtn {
  margin-bottom: 18px;
  background: transparent;
  color: #173b7a;
  padding-left: 0;
}

.backBtn:hover {
  color: #102f63;
}

.contentCard {
  padding: 27px;
  background: #fff;
  border: 1px solid #e0e7f0;
  border-radius: 17px;
  box-shadow: 0 6px 22px rgba(16,24,40,.05);
}

.narrowContent {
  max-width: 850px;
}

.sectionHeader {
  margin-bottom: 22px;
}

.sectionHeader h2 {
  margin: 0 0 5px;
  color: #172b4d;
  font-size: 21px;
}

.sectionHeader p {
  margin: 0;
  color: #667085;
  font-size: 12px;
}

/* FORMS */

.formGrid {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 17px;
}

.passwordForm {
  display: grid;
  gap: 17px;
  max-width: 520px;
}

.filterGrid {
  display: grid;
  grid-template-columns: 180px 180px 1fr;
  gap: 14px;
  align-items: end;
}

.filterActions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.summaryRow {
  display: flex;
  gap: 15px;
  margin: 22px 0;
}

.summaryRow > div {
  min-width: 160px;
  padding: 14px 17px;
  border-radius: 11px;
  background: #f6f8fb;
  border: 1px solid #e6ebf2;
}

.summaryRow span {
  display: block;
  color: #667085;
  font-size: 11px;
}

.summaryRow strong {
  display: block;
  margin-top: 4px;
  color: #173b7a;
  font-size: 19px;
}

/* TABLE */

.tableContainer {
  width: 100%;
  margin-top: 18px;
  overflow-x: auto;
  border: 1px solid #e3e8ef;
  border-radius: 11px;
}

table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
}

thead {
  background: #f5f7fa;
}

th {
  padding: 13px 14px;
  text-align: left;
  color: #344054;
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
  border-bottom: 1px solid #e0e6ee;
}

td {
  padding: 13px 14px;
  color: #475467;
  font-size: 12px;
  border-bottom: 1px solid #edf0f4;
}

tbody tr:hover {
  background: #f9fbff;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.empty {
  padding: 30px;
  text-align: center;
  color: #98a2b3;
}

.roleBadge {
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 20px;
  background: #edf3ff;
  color: #173b7a;
  font-size: 10px;
  font-weight: 700;
  text-transform: capitalize;
}

.status {
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
}

.status.active {
  background: #eaf7ef;
  color: #207345;
}

.status.inactive {
  background: #f3f4f6;
  color: #667085;
}

/* ADMIN MANAGEMENT */

.managementGrid {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 18px;
}

.managementCard {
  padding: 22px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fbfcfe;
}

.managementIcon {
  width: 42px;
  height: 42px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 14px;
  border-radius: 11px;
  background: #edf3ff;
  color: #173b7a;
  font-weight: 800;
}

.managementCard h3 {
  margin: 0 0 5px;
  color: #172b4d;
  font-size: 16px;
}

.managementCard p {
  min-height: 36px;
  margin: 0 0 16px;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.managementCard select,
.managementCard input {
  margin-bottom: 10px;
}

.message {
  margin: 17px 0 0;
  padding: 11px 14px;
  border-radius: 9px;
  background: #eef4ff;
  border: 1px solid #dce7fb;
  color: #173b7a;
  font-size: 12px;
}

/* RESPONSIVE */

@media (max-width: 950px) {
  .dashboardGrid {
    grid-template-columns: repeat(2,1fr);
  }

  .filterGrid {
    grid-template-columns: repeat(2,1fr);
  }

  .filterActions {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .topbar {
    padding: 15px 20px;
    flex-wrap: wrap;
  }

  .mainContent {
    width: calc(100% - 28px);
    padding-top: 20px;
  }

  .welcomeCard {
    flex-direction: column;
    align-items: flex-start;
    padding: 22px;
  }

  .adminBadge {
    width: 100%;
  }

  .dashboardGrid,
  .managementGrid,
  .overviewGrid,
  .formGrid {
    grid-template-columns: 1fr;
  }

  .overviewSection,
  .contentCard {
    padding: 19px;
  }

  .filterGrid {
    grid-template-columns: 1fr;
  }

  .filterActions {
    grid-column: auto;
  }

  .summaryRow {
    flex-direction: column;
  }

  .summaryRow > div {
    width: 100%;
  }
}

@media (max-width: 500px) {
  .topRight {
    width: 100%;
    justify-content: space-between;
  }

  .adminInfo {
    align-items: flex-start;
  }

  .loginCard {
    padding: 27px 22px;
  }

  .dashboardCard {
    min-height: 140px;
  }
}
`;
