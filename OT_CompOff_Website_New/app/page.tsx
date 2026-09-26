'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Staff = {
  id: number;
  employee_id: string;
  name: string;
  access_enabled: boolean;
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
    if (staff) {
      loadEntries(staff.id);
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
        access_enabled: true
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

  function logout() {
    localStorage.removeItem('ot_staff');
    setStaff(null);
    setEntries([]);
    setEmployeeId('');
    setMessage('');
  }

  const total = useMemo(() => {
    return entries.reduce(
      (sum, entry) =>
        sum + Number(entry.ot_hours || 0),
      0
    );
  }, [entries]);

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

          {message && (
            <p className="msg">
              {message}
            </p>
          )}

          <small>
            No OTP / password required.
          </small>

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
