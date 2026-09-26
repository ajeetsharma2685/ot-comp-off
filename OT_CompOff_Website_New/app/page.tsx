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

type Entry = {
  id: number;
  ot_date: string;
  start_time: string;
  end_time: string;
  ot_hours: number;
  reason: string | null;
  comp_off_date: string | null;
  comp_off_status: string | null;
};

type AdminStaff = {
  id: number;
  employee_id: string;
  name: string;
  access_enabled: boolean;
  role: string;
};

type AdminOT = {
  id: number;
  employee_id: string;
  name: string;
  ot_date: string;
  start_time: string;
  end_time: string;
  ot_hours: number;
  reason: string | null;
  comp_off_date: string | null;
  comp_off_status: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function Home() {
  const [employeeId, setEmployeeId] = useState('');
  const [staff, setStaff] = useState<Staff | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [adminLoginMode, setAdminLoginMode] = useState(false);
  const [adminEmployeeId, setAdminEmployeeId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [adminStaff, setAdminStaff] = useState<AdminStaff[]>([]);
  const [adminOT, setAdminOT] = useState<AdminOT[]>([]);
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const [form, setForm] = useState({
    ot_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });

  const [compOffEntryId, setCompOffEntryId] = useState<number | null>(null);
  const [compOffDate, setCompOffDate] = useState('');

  useEffect(() => {
    const savedStaff = localStorage.getItem('ot_staff');

    if (savedStaff) {
      try {
        setStaff(JSON.parse(savedStaff));
      } catch {
        localStorage.removeItem('ot_staff');
      }
    }

    ensureAnonymous();
  }, []);

  useEffect(() => {
    if (staff && staff.role !== 'admin') {
      loadEntries(staff.id);
    }

    if (staff?.role === 'admin') {
      loadAdminData();
    }
  }, [staff]);

  async function ensureAnonymous() {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      await supabase.auth.signInAnonymously();
    }
  }

  async function login() {
    setMessage('');

    if (!employeeId.trim()) {
      setMessage('Employee ID enter karo.');
      return;
    }

    setLoading(true);

    try {
      await ensureAnonymous();

      const { data, error } = await supabase.rpc('login_staff', {
        p_employee_id: employeeId.trim()
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(
          data?.message || 'Employee ID authorized nahi hai.'
        );
      }

      const loggedInStaff: Staff = {
        id: data.staff_id,
        employee_id: data.employee_id,
        name: data.name,
        access_enabled: true,
        role: data.role
      };

      localStorage.setItem(
        'ot_staff',
        JSON.stringify(loggedInStaff)
      );

      setStaff(loggedInStaff);
      setMessage('Login successful.');
    } catch (error: any) {
      setMessage(error.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function adminLogin() {
    setMessage('');

    if (!adminEmployeeId.trim()) {
      setMessage('Admin Employee ID enter karo.');
      return;
    }

    if (!adminPassword) {
      setMessage('Admin Password enter karo.');
      return;
    }

    setLoading(true);

    try {
      await ensureAnonymous();

      const { data, error } = await supabase.rpc('admin_login', {
        p_employee_id: adminEmployeeId.trim(),
        p_password: adminPassword
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(
          data?.message || 'Admin login failed.'
        );
      }

      const loggedInAdmin: Staff = {
        id: data.staff_id,
        employee_id: data.employee_id,
        name: data.name,
        access_enabled: true,
        role: data.role
      };

      localStorage.setItem(
        'ot_staff',
        JSON.stringify(loggedInAdmin)
      );

      setStaff(loggedInAdmin);
      setAdminEmployeeId('');
      setAdminPassword('');
      setMessage('Admin login successful.');
    } catch (error: any) {
      setMessage(error.message || 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function loadEntries(id: number) {
    const { data, error } = await supabase
      .from('ot_entries')
      .select('*')
      .eq('staff_id', id)
      .order('ot_date', { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
      setEntries(data as Entry[]);
    }
  }

  async function loadAdminData() {
    if (!staff || staff.role !== 'admin') {
      return;
    }

    setAdminLoading(true);
    setMessage('');

    try {
      const [staffResult, otResult] = await Promise.all([
        supabase.rpc('admin_get_staff', {
          p_admin_employee_id: staff.employee_id
        }),
        supabase.rpc('admin_get_all_ot', {
          p_admin_employee_id: staff.employee_id
        })
      ]);

      if (staffResult.error) {
        throw staffResult.error;
      }

      if (otResult.error) {
        throw otResult.error;
      }

      const staffData = Array.isArray(staffResult.data)
        ? staffResult.data
        : [];

      const otData = Array.isArray(otResult.data)
        ? otResult.data
        : [];

      setAdminStaff(staffData as AdminStaff[]);
      setAdminOT(otData as AdminOT[]);
    } catch (error: any) {
      setMessage(
        error.message || 'Admin data load nahi ho raha.'
      );
    } finally {
      setAdminLoading(false);
    }
  }

  function calculateHours(start: string, end: string) {
    if (!start || !end) {
      return 0;
    }

    const startParts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);

    let minutes =
      endParts[0] * 60 +
      endParts[1] -
      startParts[0] * 60 -
      startParts[1];

    if (minutes < 0) {
      minutes += 1440;
    }

    return Math.round((minutes / 60) * 100) / 100;
  }

  async function addOT() {
    if (!staff) {
      return;
    }

    if (
      !form.ot_date ||
      !form.start_time ||
      !form.end_time
    ) {
      setMessage(
        'Date, Start Time aur End Time required hain.'
      );
      return;
    }

    setLoading(true);
    setMessage('');

    const otHours = calculateHours(
      form.start_time,
      form.end_time
    );

    const { error } = await supabase
      .from('ot_entries')
      .insert({
        staff_id: staff.id,
        ot_date: form.ot_date,
        start_time: form.start_time,
        end_time: form.end_time,
        ot_hours: otHours,
        reason: form.reason || null,
        comp_off_date: null,
        comp_off_status: null
      });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('OT saved.');

      setForm({
        ot_date: '',
        start_time: '',
        end_time: '',
        reason: ''
      });

      await loadEntries(staff.id);
    }

    setLoading(false);
  }

  function openCompOff(entryId: number) {
    setCompOffEntryId(entryId);
    setCompOffDate('');
    setMessage('');
  }

  function cancelCompOff() {
    setCompOffEntryId(null);
    setCompOffDate('');
  }

  async function confirmCompOff() {
    if (!staff || !compOffEntryId) {
      return;
    }

    if (!compOffDate) {
      setMessage('Please select Comp-Off date.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase
      .from('ot_entries')
      .update({
        comp_off_date: compOffDate,
        comp_off_status: 'Comp-Off Used'
      })
      .eq('id', compOffEntryId)
      .eq('staff_id', staff.id)
      .is('comp_off_date', null);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Comp-Off Used successfully.');

      setCompOffEntryId(null);
      setCompOffDate('');

      await loadEntries(staff.id);
    }

    setLoading(false);
  }

  async function addEmployee() {
    if (!staff || staff.role !== 'admin') {
      return;
    }

    if (!newEmployeeId.trim()) {
      setMessage('Employee ID enter karo.');
      return;
    }

    if (!newEmployeeName.trim()) {
      setMessage('Employee Name enter karo.');
      return;
    }

    setAdminLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.rpc(
        'admin_add_staff',
        {
          p_admin_employee_id: staff.employee_id,
          p_employee_id: newEmployeeId.trim(),
          p_name: newEmployeeName.trim()
        }
      );

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(
          data?.message || 'Employee add nahi hua.'
        );
      }

      setNewEmployeeId('');
      setNewEmployeeName('');

      setMessage('Employee successfully added.');

      await loadAdminData();
    } catch (error: any) {
      setMessage(
        error.message || 'Employee add nahi hua.'
      );
    } finally {
      setAdminLoading(false);
    }
  }

  async function toggleEmployee(
    staffId: number,
    enabled: boolean
  ) {
    if (!staff || staff.role !== 'admin') {
      return;
    }

    setAdminLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.rpc(
        'admin_toggle_staff',
        {
          p_admin_employee_id: staff.employee_id,
          p_staff_id: staffId,
          p_enabled: enabled
        }
      );

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(
          data?.message || 'Employee status change nahi hua.'
        );
      }

      setMessage(
        enabled
          ? 'Employee enabled.'
          : 'Employee disabled.'
      );

      await loadAdminData();
    } catch (error: any) {
      setMessage(
        error.message ||
          'Employee status change nahi hua.'
      );
    } finally {
      setAdminLoading(false);
    }
  }

  function downloadOTExcel() {
    if (adminOT.length === 0) {
      setMessage('Download ke liye OT records nahi hain.');
      return;
    }

    const headers = [
      'Employee ID',
      'Employee Name',
      'OT Date',
      'Start Time',
      'End Time',
      'OT Hours',
      'Reason',
      'Comp-Off Date',
      'Comp-Off Status'
    ];

    const escapeCSV = (value: any) => {
      const text = value === null || value === undefined
        ? ''
        : String(value);

      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = adminOT.map((entry) => [
      entry.employee_id,
      entry.name,
      entry.ot_date,
      entry.start_time,
      entry.end_time,
      Number(entry.ot_hours || 0).toFixed(2),
      entry.reason || '',
      entry.comp_off_date || '',
      entry.comp_off_status || ''
    ]);

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) =>
        row.map(escapeCSV).join(',')
      )
    ].join('\r\n');

    const blob = new Blob(
      ['\uFEFF' + csv],
      {
        type: 'text/csv;charset=utf-8;'
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `OT_CompOff_All_Staff_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setMessage(
      `${adminOT.length} OT records Excel-compatible file me download ho gaye.`
    );
  }

  function logout() {
    localStorage.removeItem('ot_staff');

    setStaff(null);
    setEntries([]);
    setAdminStaff([]);
    setAdminOT([]);

    setEmployeeId('');
    setAdminEmployeeId('');
    setAdminPassword('');

    setAdminLoginMode(false);
    setMessage('');
  }

  const total = useMemo(() => {
    return entries.reduce(
      (sum, entry) =>
        sum + Number(entry.ot_hours || 0),
      0
    );
  }, [entries]);

  const adminTotalOT = useMemo(() => {
    return adminOT.reduce(
      (sum, entry) =>
        sum + Number(entry.ot_hours || 0),
      0
    );
  }, [adminOT]);

  if (!staff) {
    return (
      <main className="center">
        <section className="card login">

          <div className="logo">
            OT
          </div>

          <h1>
            OT & Comp-Off
          </h1>

          {!adminLoginMode ? (
            <>
              <p className="muted">
                Staff Login
              </p>

              <label>
                Employee ID
              </label>

              <input
                value={employeeId}
                onChange={(e) =>
                  setEmployeeId(e.target.value)
                }
                placeholder="Enter Employee ID"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    login();
                  }
                }}
              />

              <button
                onClick={login}
                disabled={loading}
              >
                {loading ? 'Checking...' : 'Login'}
              </button>

              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '1px solid #ddd'
                }}
              >
                <button
                  className="secondary"
                  onClick={() => {
                    setAdminLoginMode(true);
                    setMessage('');
                  }}
                >
                  Admin Login
                </button>
              </div>

              <small>
                Staff login ke liye Employee ID required hai.
              </small>
            </>
          ) : (
            <>
              <p className="muted">
                Admin Login
              </p>

              <label>
                Employee ID
              </label>

              <input
                value={adminEmployeeId}
                onChange={(e) =>
                  setAdminEmployeeId(e.target.value)
                }
                placeholder="Enter Admin Employee ID"
              />

              <label>
                Admin Password
              </label>

              <input
                type="password"
                value={adminPassword}
                onChange={(e) =>
                  setAdminPassword(e.target.value)
                }
                placeholder="Enter Admin Password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    adminLogin();
                  }
                }}
              />

              <button
                onClick={adminLogin}
                disabled={loading}
              >
                {loading
                  ? 'Checking...'
                  : 'Admin Login'}
              </button>

              <button
                className="secondary"
                onClick={() => {
                  setAdminLoginMode(false);
                  setAdminEmployeeId('');
                  setAdminPassword('');
                  setMessage('');
                }}
                style={{ marginTop: '8px' }}
              >
                Back to Staff Login
              </button>

              <small>
                Admin ID + Password required.
              </small>
            </>
          )}

          {message && (
            <p className="msg">
              {message}
            </p>
          )}

        </section>
      </main>
    );
  }

  if (staff.role === 'admin') {
    return (
      <main className="page">

        <header className="topbar">

          <div>
            <b>
              OT & Comp-Off
            </b>

            <span>
              {' '}Admin Panel
            </span>
          </div>

          <button
            className="secondary"
            onClick={logout}
          >
            Logout
          </button>

        </header>

        <section className="welcome">

          <div>
            <p className="muted">
              Welcome Admin
            </p>

            <h2>
              {staff.name}
            </h2>

            <span className="pill">
              {staff.employee_id}
            </span>
          </div>

          <div className="stat">
            <span>
              Total OT
            </span>

            <b>
              {adminTotalOT.toFixed(2)} hrs
            </b>
          </div>

        </section>

        {message && (
          <section className="card">
            <p className="msg">
              {message}
            </p>
          </section>
        )}

        <section className="card">

          <div className="sectionHead">

            <h3>
              Add Employee
            </h3>

          </div>

          <div className="grid">

            <div>
              <label>
                Employee ID
              </label>

              <input
                value={newEmployeeId}
                onChange={(e) =>
                  setNewEmployeeId(e.target.value)
                }
                placeholder="Enter Employee ID"
              />
            </div>

            <div>
              <label>
                Employee Name
              </label>

              <input
                value={newEmployeeName}
                onChange={(e) =>
                  setNewEmployeeName(e.target.value)
                }
                placeholder="Enter Employee Name"
              />
            </div>

          </div>

          <button
            onClick={addEmployee}
            disabled={adminLoading}
          >
            {adminLoading
              ? 'Saving...'
              : 'Add Employee'}
          </button>

        </section>

        <section className="card">

          <div className="sectionHead">

            <h3>
              Employee List
            </h3>

            <span className="muted">
              {adminStaff.length} employees
            </span>

          </div>

          <div className="tableWrap">

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

                {adminStaff.map((employee) => (

                  <tr key={employee.id}>

                    <td>
                      {employee.employee_id}
                    </td>

                    <td>
                      {employee.name}
                    </td>

                    <td>
                      {employee.role}
                    </td>

                    <td>
                      {employee.access_enabled
                        ? 'Active'
                        : 'Disabled'}
                    </td>

                    <td>

                      {employee.employee_id ===
                      staff.employee_id ? (
                        <span className="pill">
                          Admin
                        </span>
                      ) : (
                        <button
                          className="small"
                          onClick={() =>
                            toggleEmployee(
                              employee.id,
                              !employee.access_enabled
                            )
                          }
                          disabled={adminLoading}
                        >
                          {employee.access_enabled
                            ? 'Disable'
                            : 'Enable'}
                        </button>
                      )}

                    </td>

                  </tr>

                ))}

                {adminStaff.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: 'center'
                      }}
                    >
                      No employees found.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </section>

        <section className="card">

          <div className="sectionHead">

            <div>
              <h3>
                All Staff OT Records
              </h3>

              <span className="muted">
                {adminOT.length} OT entries
              </span>
            </div>

            <button
              onClick={downloadOTExcel}
              disabled={
                adminLoading ||
                adminOT.length === 0
              }
            >
              Download Excel
            </button>

          </div>

          <div className="tableWrap">

            <table>

              <thead>

                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>OT Date</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>OT Hours</th>
                  <th>Reason</th>
                  <th>Comp-Off Date</th>
                  <th>Comp-Off Status</th>
                </tr>

              </thead>

              <tbody>

                {adminOT.map((entry) => (

                  <tr key={entry.id}>

                    <td>
                      {entry.employee_id}
                    </td>

                    <td>
                      {entry.name}
                    </td>

                    <td>
                      {entry.ot_date}
                    </td>

                    <td>
                      {entry.start_time}
                    </td>

                    <td>
                      {entry.end_time}
                    </td>

                    <td>
                      {Number(
                        entry.ot_hours || 0
                      ).toFixed(2)}
                    </td>

                    <td>
                      {entry.reason || '-'}
                    </td>

                    <td>
                      {entry.comp_off_date || '-'}
                    </td>

                    <td>
                      {entry.comp_off_status || '-'}
                    </td>

                  </tr>

                ))}

                {adminOT.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: 'center'
                      }}
                    >
                      No OT records found.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </section>

      </main>
    );
  }

  return (
    <main className="page">

      <header className="topbar">

        <div>
          <b>
            OT & Comp-Off
          </b>

          <span>
            {' '}Staff Portal
          </span>
        </div>

        <button
          className="secondary"
          onClick={logout}
        >
          Logout
        </button>

      </header>

      <section className="welcome">

        <div>

          <p className="muted">
            Welcome
          </p>

          <h2>
            {staff.name}
          </h2>

          <span className="pill">
            {staff.employee_id}
          </span>

        </div>

        <div className="stat">

          <span>
            Total OT
          </span>

          <b>
            {total.toFixed(2)} hrs
          </b>

        </div>

      </section>

      <section className="card">

        <h3>
          Add OT
        </h3>

        <div className="grid">

          <div>

            <label>
              OT Date
            </label>

            <input
              type="date"
              value={form.ot_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  ot_date: e.target.value
                })
              }
            />

          </div>

          <div>

            <label>
              Start Time
            </label>

            <input
              type="time"
              value={form.start_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  start_time: e.target.value
                })
              }
            />

          </div>

          <div>

            <label>
              End Time
            </label>

            <input
              type="time"
              value={form.end_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  end_time: e.target.value
                })
              }
            />

          </div>

          <div className="wide">

            <label>
              Reason
            </label>

            <input
              value={form.reason}
              onChange={(e) =>
                setForm({
                  ...form,
                  reason: e.target.value
                })
              }
              placeholder="Reason for OT"
            />

          </div>

        </div>

        <div className="preview">

          Calculated OT:{' '}

          <b>
            {calculateHours(
              form.start_time,
              form.end_time
            ).toFixed(2)} hours
          </b>

        </div>

        <button
          onClick={addOT}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save OT'}
        </button>

        {message && (
          <p className="msg">
            {message}
          </p>
        )}

      </section>

      <section className="card">

        <div className="sectionHead">

          <h3>
            My OT Records
          </h3>

          <span className="muted">
            {entries.length} records
          </span>

        </div>

        <div className="tableWrap">

          <table>

            <thead>

              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Comp-Off Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>

            </thead>

            <tbody>

              {entries.map((entry) => (

                <tr key={entry.id}>

                  <td>
                    {entry.ot_date}
                  </td>

                  <td>
                    {entry.start_time} -{' '}
                    {entry.end_time}
                  </td>

                  <td>
                    {Number(
                      entry.ot_hours
                    ).toFixed(2)}
                  </td>

                  <td>
                    {entry.reason || '-'}
                  </td>

                  <td>
                    {entry.comp_off_date
                      ? entry.comp_off_date
                      : ''}
                  </td>

                  <td>
                    {entry.comp_off_status
                      ? entry.comp_off_status
                      : ''}
                  </td>

                  <td>

                    {!entry.comp_off_date &&
                    compOffEntryId !== entry.id && (
                      <button
                        className="small"
                        onClick={() =>
                          openCompOff(entry.id)
                        }
                      >
                        Comp-Off
                      </button>
                    )}

                    {compOffEntryId === entry.id && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          alignItems: 'center',
                          flexWrap: 'wrap'
                        }}
                      >

                        <input
                          type="date"
                          value={compOffDate}
                          onChange={(e) =>
                            setCompOffDate(
                              e.target.value
                            )
                          }
                        />

                        <button
                          className="small"
                          onClick={confirmCompOff}
                          disabled={
                            loading ||
                            !compOffDate
                          }
                        >
                          Confirm
                        </button>

                        <button
                          className="small secondary"
                          onClick={cancelCompOff}
                          disabled={loading}
                        >
                          Cancel
                        </button>

                      </div>
                    )}

                  </td>

                </tr>

              ))}

              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center'
                    }}
                  >
                    No OT records found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </section>

    </main>
  );
}
