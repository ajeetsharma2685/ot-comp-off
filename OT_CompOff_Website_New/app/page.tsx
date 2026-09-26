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

type AdminSection =
  | 'dashboard'
  | 'staff'
  | 'add'
  | 'ot'
  | 'management';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function Home() {
  /* =====================================================
     LOGIN
     ===================================================== */

  const [employeeId, setEmployeeId] = useState('');
  const [staff, setStaff] = useState<Staff | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [adminLoginMode, setAdminLoginMode] = useState(false);
  const [adminEmployeeId, setAdminEmployeeId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  /* =====================================================
     ADMIN DATA
     ===================================================== */

  const [adminStaff, setAdminStaff] = useState<AdminStaff[]>([]);
  const [adminOT, setAdminOT] = useState<AdminOT[]>([]);
  const [adminList, setAdminList] = useState<AdminStaff[]>([]);

  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const [adminLoading, setAdminLoading] = useState(false);

  const [adminSection, setAdminSection] =
    useState<AdminSection>('dashboard');

  /* =====================================================
     EDIT STAFF
     ===================================================== */

  const [editingStaffId, setEditingStaffId] =
    useState<number | null>(null);

  const [editingEmployeeId, setEditingEmployeeId] =
    useState('');

  const [editingName, setEditingName] =
    useState('');

  /* =====================================================
     OT FORM
     ===================================================== */

  const [form, setForm] = useState({
    ot_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });

  /* =====================================================
     COMP OFF
     ===================================================== */

  const [compOffEntryId, setCompOffEntryId] =
    useState<number | null>(null);

  const [compOffDate, setCompOffDate] =
    useState('');

  /* =====================================================
     ADMIN MANAGEMENT
     ===================================================== */

  const [selectedMakeAdminStaffId, setSelectedMakeAdminStaffId] =
    useState('');

  const [makeAdminPassword, setMakeAdminPassword] =
    useState('');

  const [makeAdminConfirmPassword, setMakeAdminConfirmPassword] =
    useState('');

  const [selectedRemoveAdminId, setSelectedRemoveAdminId] =
    useState('');

  const [selectedRemoveStaffId, setSelectedRemoveStaffId] =
    useState('');

  const [selectedResetAdminId, setSelectedResetAdminId] =
    useState('');

  const [resetAdminPassword, setResetAdminPassword] =
    useState('');

  const [resetAdminConfirmPassword, setResetAdminConfirmPassword] =
    useState('');

  const [oldPassword, setOldPassword] =
    useState('');

  const [newPassword, setNewPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  /* =====================================================
     OT FILTER
     ===================================================== */

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  /* =====================================================
     INITIAL LOAD
     ===================================================== */

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

  /* =====================================================
     ANONYMOUS SESSION
     ===================================================== */

  async function ensureAnonymous() {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      await supabase.auth.signInAnonymously();
    }
  }

  /* =====================================================
     STAFF LOGIN
     ===================================================== */

  async function login() {
    setMessage('');

    if (!employeeId.trim()) {
      setMessage('Employee ID enter karo.');
      return;
    }

    setLoading(true);

    try {
      await ensureAnonymous();

      const { data, error } =
        await supabase.rpc('login_staff', {
          p_employee_id: employeeId.trim()
        });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            'Employee ID authorized nahi hai.'
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
      setMessage(
        error.message || 'Login failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     ADMIN LOGIN
     ===================================================== */

  async function adminLogin() {
    setMessage('');

    if (!adminEmployeeId.trim()) {
      setMessage(
        'Admin Employee ID enter karo.'
      );
      return;
    }

    if (!adminPassword) {
      setMessage(
        'Admin Password enter karo.'
      );
      return;
    }

    setLoading(true);

    try {
      await ensureAnonymous();

      const { data, error } =
        await supabase.rpc('admin_login', {
          p_employee_id:
            adminEmployeeId.trim(),
          p_password: adminPassword
        });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            'Admin login failed.'
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

      setMessage(
        'Admin login successful.'
      );
    } catch (error: any) {
      setMessage(
        error.message ||
          'Admin login failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     STAFF OT LOAD
     ===================================================== */

  async function loadEntries(id: number) {
    const { data, error } =
      await supabase
        .from('ot_entries')
        .select('*')
        .eq('staff_id', id)
        .order('ot_date', {
          ascending: false
        });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
      setEntries(data as Entry[]);
    }
  }

  /* =====================================================
     ADMIN DATA LOAD
     ===================================================== */

  async function loadAdminData() {
    if (
      !staff ||
      staff.role !== 'admin'
    ) {
      return;
    }

    setAdminLoading(true);

    try {
      const [
        staffResult,
        otResult,
        adminResult
      ] = await Promise.all([
        supabase.rpc(
          'admin_get_staff',
          {
            p_admin_employee_id:
              staff.employee_id
          }
        ),

        supabase.rpc(
          'admin_get_all_ot',
          {
            p_admin_employee_id:
              staff.employee_id
          }
        ),

        supabase.rpc(
          'admin_get_admins',
          {
            p_admin_employee_id:
              staff.employee_id
          }
        )
      ]);

      if (staffResult.error) {
        throw staffResult.error;
      }

      if (otResult.error) {
        throw otResult.error;
      }

      if (adminResult.error) {
        throw adminResult.error;
      }

      const staffData =
        Array.isArray(staffResult.data)
          ? staffResult.data
          : [];

      const otData =
        Array.isArray(otResult.data)
          ? otResult.data
          : [];

      const adminResponse =
        adminResult.data;

      const admins =
        Array.isArray(
          adminResponse?.admins
        )
          ? adminResponse.admins
          : [];

      setAdminStaff(
        staffData as AdminStaff[]
      );

      setAdminOT(
        otData as AdminOT[]
      );

      setAdminList(
        admins as AdminStaff[]
      );
    } catch (error: any) {
      setMessage(
        error.message ||
          'Admin data load nahi ho raha.'
      );
    } finally {
      setAdminLoading(false);
    }
  }

  /* =====================================================
     CALCULATE OT HOURS
     ===================================================== */

  function calculateHours(
    start: string,
    end: string
  ) {
    if (!start || !end) {
      return 0;
    }

    const startParts =
      start.split(':').map(Number);

    const endParts =
      end.split(':').map(Number);

    let minutes =
      endParts[0] * 60 +
      endParts[1] -
      startParts[0] * 60 -
      startParts[1];

    if (minutes < 0) {
      minutes += 1440;
    }

    return Math.round(
      (minutes / 60) * 100
    ) / 100;
  }

  /* =====================================================
     ADD OT
     ===================================================== */

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

    const otHours =
      calculateHours(
        form.start_time,
        form.end_time
      );

    const { error } =
      await supabase
        .from('ot_entries')
        .insert({
          staff_id: staff.id,
          ot_date: form.ot_date,
          start_time:
            form.start_time,
          end_time:
            form.end_time,
          ot_hours: otHours,
          reason:
            form.reason || null,
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

  /* =====================================================
     COMP OFF
     ===================================================== */

  function openCompOff(
    entryId: number
  ) {
    setCompOffEntryId(entryId);
    setCompOffDate('');
    setMessage('');
  }

  function cancelCompOff() {
    setCompOffEntryId(null);
    setCompOffDate('');
  }

  async function confirmCompOff() {
    if (
      !staff ||
      !compOffEntryId
    ) {
      return;
    }

    if (!compOffDate) {
      setMessage(
        'Please select Comp-Off date.'
      );
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } =
      await supabase
        .from('ot_entries')
        .update({
          comp_off_date:
            compOffDate,
          comp_off_status:
            'Comp-Off Used'
        })
        .eq(
          'id',
          compOffEntryId
        )
        .eq(
          'staff_id',
          staff.id
        )
        .is(
          'comp_off_date',
          null
        );

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        'Comp-Off Used successfully.'
      );

      setCompOffEntryId(null);
      setCompOffDate('');

      await loadEntries(staff.id);
    }

    setLoading(false);
  }

  /* =====================================================
     ADD EMPLOYEE
     ===================================================== */

  async function addEmployee() {
    if (
      !staff ||
      staff.role !== 'admin'
    ) {
      return;
    }

    if (!newEmployeeId.trim()) {
      setMessage(
        'Employee ID enter karo.'
      );
      return;
    }

    if (!newEmployeeName.trim()) {
      setMessage(
        'Employee Name enter karo.'
      );
      return;
    }

    setAdminLoading(true);
    setMessage('');

    try {
      const { data, error } =
        await supabase.rpc(
          'admin_add_staff',
          {
            p_admin_employee_id:
              staff.employee_id,
            p_employee_id:
              newEmployeeId.trim(),
            p_name:
              newEmployeeName.trim()
          }
        );

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            'Employee add nahi hua.'
        );
      }

      setNewEmployeeId('');
      setNewEmployeeName('');

      setMessage(
        'Employee successfully added.'
      );

      await loadAdminData();
    } catch (error: any) {
      setMessage(
        error.message ||
          'Employee add nahi hua.'
      );
    } finally {
      setAdminLoading(false);
    }
  }

  /* =====================================================
     EDIT STAFF
     ===================================================== */

  function startEdit(
    employee: AdminStaff
  ) {
    setEditingStaffId(
      employee.id
    );

    setEditingEmployeeId(
      employee.employee_id
    );

    setEditingName(
      employee.name
    );

    setMessage('');
  }

  function cancelEdit() {
    setEditingStaffId(null);
    setEditingEmployeeId('');
    setEditingName('');
  }

  async function saveEdit() {
    if (
      !staff ||
      staff.role !== 'admin'
    ) {
      return;
    }

    if (!editingStaffId) {
      return;
    }

    if (!editingEmployeeId.trim()) {
      setMessage(
        'Employee ID required hai.'
      );
      return;
    }

    if (!editingName.trim()) {
      setMessage(
        'Employee Name required hai.'
      );
      return;
    }

    setAdminLoading(true);
    setMessage('');

    try {
      const { data, error } =
        await supabase.rpc(
          'admin_update_staff',
          {
            p_admin_employee_id:
              staff.employee_id,
            p_staff_id:
              editingStaffId,
            p_employee_id:
              editingEmployeeId.trim(),
            p_name:
              editingName.trim()
          }
        );

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            'Employee details update nahi hue.'
        );
      }

      cancelEdit();

      setMessage(
        'Employee details updated successfully.'
      );

      await loadAdminData();
    } catch (error: any) {
      setMessage(
        error.message ||
          'Employee details update nahi hue.'
      );
    } finally {
      setAdminLoading(false);
    }
  }

  /* =====================================================
     ENABLE / DISABLE STAFF
     ===================================================== */

  async function toggleEmployee(
    staffId: number,
    enabled: boolean
  ) {
    if (
      !staff ||
      staff.role !== 'admin'
    ) {
      return;
    }

    setAdminLoading(true);
    setMessage('');

    try {
      const { data, error } =
        await supabase.rpc(
          'admin_toggle_staff',
          {
            p_admin_employee_id:
              staff.employee_id,
            p_staff_id: staffId,
            p_enabled: enabled
          }
        );

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            'Employee status change nahi hua.'
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

  /* =====================================================
     MAKE ADMIN
     ===================================================== */

  async function makeAdmin() {
    if (
      !staff ||
      staff.role !== 'admin'
    ) {
      return;
    }

    if (!selectedMakeAdminStaffId) {
      setMessage(
        'Staff select karo.'
      );
      return;
    }

    if (!makeAdminPassword) {
      setMessage(
        'New Admin Password enter karo.'
      );
      return;
    }

    if (!makeAdminConfirmPassword) {
      setMessage(
        'Confirm Password enter karo.'
      );
      return;
    }

    if (
      makeAdminPassword !==
      makeAdminConfirmPassword
    ) {
      setMessage(
        'Password match nahi kar raha.'
      );
      return;
    }

    if (
      makeAdminPassword.length < 6
    ) {
      setMessage(
        'Password minimum 6 characters ka hona chahiye.'
      );
      return;
    }

    setAdminLoading(true);
    setMessage('');

    try {
      const { data, error } =
        await supabase.rpc(
          'admin_make_admin',
          {
            p_admin_employee_id:
              staff.employee_id,

            p_staff_id:
              Number(
                selectedMakeAdminStaffId
              ),

            p_new_password:
              makeAdminPassword,

            p_confirm_password:
              makeAdminConfirmPassword
          }
        );

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            'Make Admin failed.'
        );
      }

      setSelectedMakeAdminStaffId('');
      setMakeAdminPassword('');
      setMakeAdminConfirmPassword('');

      setMessage(
        'Employee is now an Admin successfully.'
      );

      await loadAdminData();
    } catch (error: any) {
      setMessage(
        error.message ||
          'Make Admin failed.'
      );
    } finally {
      setAdminLoading(false);
    }
  }

  /* =====================================================
     REMOVE ADMIN
     ===================================================== */

  async function removeAdmin() {
    if (
      !staff ||
      staff.role !== 'admin'
    ) {
      return;
    }

    if (!selectedRemoveAdminId) {
      setMessage(
        'Admin select karo.'
      );
      return;
    }

    const selectedAdmin =
      adminList.find(
        (item) =>
          item.id ===
          Number(
            selectedRemoveAdminId
          )
      );

    if (
      selectedAdmin &&
      selectedAdmin.employee_id
        .trim()
        .toUpperCase() ===
        'SAS102'
    ) {
      setMessage(
        'Main Admin SAS102 ko remove nahi kiya ja sakta.'
      );
      return;
    }

    if (
      !window.confirm(
        'Kya aap selected Admin ko remove karna chahte ho?'
      )
    ) {
      return;
    }

    setAdminLoading(true);
    setMessage('');

    try {
      const { data, error } =
        await supabase.rpc(
          'admin_remove_admin',
          {
            p_admin_employee_id:
              staff.employee_id,

            p_target_admin_id:
              Number(
                selectedRemoveAdminId
              )
          }
        );

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            'Admin remove nahi hua.'
        );
      }

      setSelectedRemoveAdminId('');

      setMessage(
        'Admin removed successfully.'
      );

      await loadAdminData();
    } catch (error: any) {
      setMessage(
        error.message ||
          'Admin remove nahi hua.'
      );
    } finally {
      setAdminLoading(false);
    }
  }

  /* =====================================================
     REMOVE STAFF
     ===================================================== */

  async function removeStaff() {
    if (
      !staff ||
      staff.role !== 'admin'
    ) {
      return;
    }

    if (!selectedRemoveStaffId) {
      setMessage(
        'Staff select karo.'
      );
      return;
    }

    const selected =
      adminStaff.find(
        (item) =>
          item.id ===
          Number(
            selectedRemoveStaffId
          )
      );

    if (
      selected &&
      selected.employee_id
        .trim()
        .toUpperCase() ===
        'SAS102'
    ) {
      setMessage(
        'Main Admin SAS102 ko remove nahi kiya ja sakta.'
      );
      return;
    }

    if (
      selected &&
      selected.role === 'admin'
    ) {
      setMessage(
        'Admin account ke liye Remove Admin use karo.'
      );
      return;
    }

    if (
      !window.confirm(
        'Kya aap selected Staff ko remove karna chahte ho? OT/Comp-Off history preserve rahegi.'
      )
    ) {
      return;
    }

    setAdminLoading(true);
    setMessage('');

    try {
      const { data, error } =
        await supabase.rpc(
          'admin_remove_staff',
          {
            p_admin_employee_id:
              staff.employee_id,

            p_staff_id:
              Number(
                selectedRemoveStaffId
              )
          }
        );

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            'Staff remove nahi hua.'
        );
      }

      setSelectedRemoveStaffId('');

      setMessage(
        'Staff removed successfully. OT/Comp-Off history preserved.'
      );

      await loadAdminData();
    } catch (error: any) {
      setMessage(
        error.message ||
          'Staff remove nahi hua.'
      );
    } finally {
      setAdminLoading(false);
    }
  }

  /* =====================================================
     RESET ADMIN PASSWORD
     ===================================================== */

  async function resetAdminPasswordFn() {
    if (
      !staff ||
      staff.role !== 'admin'
    ) {
      return;
    }

    if (!selectedResetAdminId) {
      setMessage(
        'Admin select karo.'
      );
      return;
    }

    if (!resetAdminPassword) {
      setMessage(
        'New password enter karo.'
      );
      return;
    }

    if (!resetAdminConfirmPassword) {
      setMessage(
        'Confirm password enter karo.'
      );
      return;
    }

    if (
      resetAdminPassword !==
      resetAdminConfirmPassword
    ) {
      setMessage(
        'Password match nahi kar raha.'
      );
      return;
    }

    if (
      resetAdminPassword.length < 6
    ) {
      setMessage(
        'Password minimum 6 characters ka hona chahiye.'
      );
      return;
    }

    setAdminLoading(true);
    setMessage('');

    try {
      const { data, error } =
        await supabase.rpc(
          'admin_reset_admin_password',
          {
            p_admin_employee_id:
              staff.employee_id,

            p_target_admin_id:
              Number(
                selectedResetAdminId
              ),

            p_new_password:
              resetAdminPassword,

            p_confirm_password:
              resetAdminConfirmPassword
          }
        );

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            'Password reset failed.'
        );
      }

      setSelectedResetAdminId('');
      setResetAdminPassword('');
      setResetAdminConfirmPassword('');

      setMessage(
        'Admin password reset successfully.'
      );
    } catch (error: any) {
      setMessage(
        error.message ||
          'Password reset failed.'
      );
    } finally {
      setAdminLoading(false);
    }
  }

  /* =====================================================
     CHANGE MY PASSWORD
     ===================================================== */

  async function changeMyPassword() {
    if (
      !staff ||
      staff.role !== 'admin'
    ) {
      return;
    }

    if (!oldPassword) {
      setMessage(
        'Old password enter karo.'
      );
      return;
    }

    if (!newPassword) {
      setMessage(
        'New password enter karo.'
      );
      return;
    }

    if (!confirmPassword) {
      setMessage(
        'Confirm password enter karo.'
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setMessage(
        'New password aur confirm password match nahi kar raha.'
      );
      return;
    }

    if (newPassword.length < 6) {
      setMessage(
        'Password minimum 6 characters ka hona chahiye.'
      );
      return;
    }

    setAdminLoading(true);
    setMessage('');

    try {
      const { data, error } =
        await supabase.rpc(
          'admin_change_password',
          {
            p_admin_employee_id:
              staff.employee_id,

            p_old_password:
              oldPassword,

            p_new_password:
              newPassword,

            p_confirm_password:
              confirmPassword
          }
        );

      if (error) {
        throw error;
      }

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            'Password change failed.'
        );
      }

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setMessage(
        'Password changed successfully.'
      );
    } catch (error: any) {
      setMessage(
        error.message ||
          'Password change failed.'
      );
    } finally {
      setAdminLoading(false);
    }
  }

  /* =====================================================
     FILTERED OT
     ===================================================== */

  const filteredAdminOT =
    useMemo(() => {
      return adminOT.filter(
        (entry) => {
          if (
            fromDate &&
            entry.ot_date < fromDate
          ) {
            return false;
          }

          if (
            toDate &&
            entry.ot_date > toDate
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      adminOT,
      fromDate,
      toDate
    ]);

  /* =====================================================
     TOTAL OT
     ===================================================== */

  const total =
    useMemo(() => {
      return entries.reduce(
        (sum, entry) =>
          sum +
          Number(
            entry.ot_hours || 0
          ),
        0
      );
    }, [entries]);

  const adminTotalOT =
    useMemo(() => {
      return filteredAdminOT.reduce(
        (sum, entry) =>
          sum +
          Number(
            entry.ot_hours || 0
          ),
        0
      );
    }, [filteredAdminOT]);

  /* =====================================================
     DOWNLOAD EXCEL
     ===================================================== */

  function downloadOTExcel() {
    if (
      filteredAdminOT.length === 0
    ) {
      setMessage(
        'Download ke liye OT records nahi hain.'
      );
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

    const escapeCSV = (
      value: any
    ) => {
      const text =
        value === null ||
        value === undefined
          ? ''
          : String(value);

      return `"${text.replace(
        /"/g,
        '""'
      )}"`;
    };

    const rows =
      filteredAdminOT.map(
        (entry) => [
          entry.employee_id,
          entry.name,
          entry.ot_date,
          entry.start_time,
          entry.end_time,
          Number(
            entry.ot_hours || 0
          ).toFixed(2),
          entry.reason || '',
          entry.comp_off_date ||
            '',
          entry.comp_off_status ||
            ''
        ]
      );

    const csv = [
      headers
        .map(escapeCSV)
        .join(','),
      ...rows.map((row) =>
        row
          .map(escapeCSV)
          .join(',')
      )
    ].join('\r\n');

    const blob =
      new Blob(
        ['\uFEFF' + csv],
        {
          type:
            'text/csv;charset=utf-8;'
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        'a'
      );

    link.href = url;

    link.download =
      `OT_CompOff_${fromDate || 'All'}_to_${toDate || 'All'}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);

    setMessage(
      `${filteredAdminOT.length} OT records download ho gaye.`
    );
  }

  /* =====================================================
     LOGOUT
     ===================================================== */

  function logout() {
    localStorage.removeItem(
      'ot_staff'
    );

    setStaff(null);
    setEntries([]);
    setAdminStaff([]);
    setAdminOT([]);
    setAdminList([]);

    setEmployeeId('');
    setAdminEmployeeId('');
    setAdminPassword('');

    setAdminSection(
      'dashboard'
    );

    setAdminLoginMode(false);

    setMessage('');
  }

  /* =====================================================
     LOGIN PAGE
     ===================================================== */

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
                  setEmployeeId(
                    e.target.value
                  )
                }
                placeholder="Enter Employee ID"
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    'Enter'
                  ) {
                    login();
                  }
                }}
              />

              <button
                onClick={login}
                disabled={loading}
              >
                {loading
                  ? 'Checking...'
                  : 'Login'}
              </button>

              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop:
                    '1px solid #ddd'
                }}
              >
                <button
                  className="secondary"
                  onClick={() => {
                    setAdminLoginMode(
                      true
                    );
                    setMessage('');
                  }}
                >
                  Admin Login
                </button>
              </div>

              <small>
                Staff login ke liye
                Employee ID required
                hai.
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
                value={
                  adminEmployeeId
                }
                onChange={(e) =>
                  setAdminEmployeeId(
                    e.target.value
                  )
                }
                placeholder="Enter Admin Employee ID"
              />

              <label>
                Admin Password
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
                placeholder="Enter Admin Password"
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    'Enter'
                  ) {
                    adminLogin();
                  }
                }}
              />

              <button
                onClick={
                  adminLogin
                }
                disabled={loading}
              >
                {loading
                  ? 'Checking...'
                  : 'Admin Login'}
              </button>

              <button
                className="secondary"
                onClick={() => {
                  setAdminLoginMode(
                    false
                  );
                  setAdminEmployeeId(
                    ''
                  );
                  setAdminPassword(
                    ''
                  );
                  setMessage('');
                }}
                style={{
                  marginTop: '8px'
                }}
              >
                Back to Staff Login
              </button>

              <small>
                Admin ID + Password
                required.
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

  /* =====================================================
     ADMIN PANEL
     ===================================================== */

  if (
    staff.role === 'admin'
  ) {
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

        {message && (
          <section className="card">
            <p className="msg">
              {message}
            </p>
          </section>
        )}

        {/* =================================================
            ADMIN DASHBOARD
            ================================================= */}

        {adminSection ===
          'dashboard' && (
          <>
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
                  {adminTotalOT.toFixed(
                    2
                  )}{' '}
                  hrs
                </b>

              </div>

            </section>

            <section
              className="dashboardGrid"
            >

              <button
                className="dashboardCard"
                onClick={() =>
                  setAdminSection(
                    'staff'
                  )
                }
              >
                <div className="dashboardIcon">
                  👥
                </div>

                <h3>
                  Staff Details
                </h3>

                <p>
                  View, edit and manage employees
                </p>
              </button>

              <button
                className="dashboardCard"
                onClick={() =>
                  setAdminSection(
                    'add'
                  )
                }
              >
                <div className="dashboardIcon">
                  ➕
                </div>

                <h3>
                  Add Employee
                </h3>

                <p>
                  Add new employee to the system
                </p>
              </button>

              <button
                className="dashboardCard"
                onClick={() =>
                  setAdminSection(
                    'ot'
                  )
                }
              >
                <div className="dashboardIcon">
                  🕒
                </div>

                <h3>
                  OT Records
                </h3>

                <p>
                  View, filter and download OT
                </p>
              </button>

              <button
                className="dashboardCard"
                onClick={() =>
                  setAdminSection(
                    'management'
                  )
                }
              >
                <div className="dashboardIcon">
                  ⚙️
                </div>

                <h3>
                  Admin Management
                </h3>

                <p>
                  Manage admins, staff and passwords
                </p>
              </button>

              <button
                className="dashboardCard logoutCard"
                onClick={logout}
              >
                <div className="dashboardIcon">
                  🚪
                </div>

                <h3>
                  Logout
                </h3>

                <p>
                  Sign out from Admin Panel
                </p>
              </button>

            </section>
          </>
        )}

        {/* =================================================
            STAFF DETAILS
            ================================================= */}

        {adminSection ===
          'staff' && (
          <section className="card">

            <div className="sectionHead">

              <div>
                <h3>
                  Staff Details
                </h3>

                <span className="muted">
                  {adminStaff.length}{' '}
                  employees
                </span>
              </div>

              <button
                className="secondary"
                onClick={() =>
                  setAdminSection(
                    'dashboard'
                  )
                }
              >
                ← Back to Dashboard
              </button>

            </div>

            <div className="tableWrap">

              <table>

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

                    <th>
                      Action
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {adminStaff.map(
                    (employee) => (
                      <tr
                        key={
                          employee.id
                        }
                      >

                        {editingStaffId ===
                        employee.id ? (
                          <>
                            <td>
                              <input
                                value={
                                  editingEmployeeId
                                }
                                onChange={(
                                  e
                                ) =>
                                  setEditingEmployeeId(
                                    e
                                      .target
                                      .value
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                value={
                                  editingName
                                }
                                onChange={(
                                  e
                                ) =>
                                  setEditingName(
                                    e
                                      .target
                                      .value
                                  )
                                }
                              />
                            </td>

                            <td>
                              {
                                employee.role
                              }
                            </td>

                            <td>
                              {employee.access_enabled
                                ? 'Active'
                                : 'Disabled'}
                            </td>

                            <td>
                              <div
                                style={{
                                  display:
                                    'flex',
                                  gap: '6px',
                                  flexWrap:
                                    'wrap'
                                }}
                              >
                                <button
                                  className="small"
                                  onClick={
                                    saveEdit
                                  }
                                  disabled={
                                    adminLoading
                                  }
                                >
                                  Save
                                </button>

                                <button
                                  className="small secondary"
                                  onClick={
                                    cancelEdit
                                  }
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              {
                                employee.employee_id
                              }
                            </td>

                            <td>
                              {
                                employee.name
                              }
                            </td>

                            <td>
                              {
                                employee.role
                              }
                            </td>

                            <td>
                              {employee.access_enabled
                                ? 'Active'
                                : 'Disabled'}
                            </td>

                            <td>
                              {employee.role ===
                              'admin' ? (
                                <span className="pill">
                                  Admin
                                </span>
                              ) : (
                                <div
                                  style={{
                                    display:
                                      'flex',
                                    gap: '6px',
                                    flexWrap:
                                      'wrap'
                                  }}
                                >
                                  <button
                                    className="small"
                                    onClick={() =>
                                      startEdit(
                                        employee
                                      )
                                    }
                                  >
                                    Edit
                                  </button>

                                  <button
                                    className="small"
                                    onClick={() =>
                                      toggleEmployee(
                                        employee.id,
                                        !employee.access_enabled
                                      )
                                    }
                                    disabled={
                                      adminLoading
                                    }
                                  >
                                    {employee.access_enabled
                                      ? 'Disable'
                                      : 'Enable'}
                                  </button>
                                </div>
                              )}
                            </td>
                          </>
                        )}

                      </tr>
                    )
                  )}

                  {adminStaff.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign:
                            'center'
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
        )}

        {/* =================================================
            ADD EMPLOYEE
            ================================================= */}

        {adminSection ===
          'add' && (
          <section className="card">

            <div className="sectionHead">

              <h3>
                Add Employee
              </h3>

              <button
                className="secondary"
                onClick={() =>
                  setAdminSection(
                    'dashboard'
                  )
                }
              >
                ← Back to Dashboard
              </button>

            </div>

            <div className="grid">

              <div>

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
                  placeholder="Enter Employee ID"
                />

              </div>

              <div>

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
                  placeholder="Enter Employee Name"
                />

              </div>

            </div>

            <button
              onClick={
                addEmployee
              }
              disabled={
                adminLoading
              }
            >
              {adminLoading
                ? 'Saving...'
                : 'Add Employee'}
            </button>

          </section>
        )}

        {/* =================================================
            OT RECORDS
            ================================================= */}

        {adminSection ===
          'ot' && (
          <section className="card">

            <div className="sectionHead">

              <div>

                <h3>
                  OT Records
                </h3>

                <span className="muted">
                  {filteredAdminOT.length}{' '}
                  records
                </span>

              </div>

              <button
                className="secondary"
                onClick={() =>
                  setAdminSection(
                    'dashboard'
                  )
                }
              >
                ← Back to Dashboard
              </button>

            </div>

            <div className="grid">

              <div>

                <label>
                  From Date
                </label>

                <input
                  type="date"
                  value={
                    fromDate
                  }
                  onChange={(e) =>
                    setFromDate(
                      e.target.value
                    )
                  }
                />

              </div>

              <div>

                <label>
                  To Date
                </label>

                <input
                  type="date"
                  value={
                    toDate
                  }
                  onChange={(e) =>
                    setToDate(
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '12px'
              }}
            >

              <button
                onClick={() =>
                  setMessage(
                    `${filteredAdminOT.length} records found.`
                  )
                }
              >
                View Records
              </button>

              <button
                className="secondary"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
              >
                Clear Filter
              </button>

              <button
                onClick={
                  downloadOTExcel
                }
                disabled={
                  adminLoading ||
                  filteredAdminOT.length ===
                    0
                }
              >
                Download Excel
              </button>

            </div>

            <div
              className="stat"
              style={{
                marginTop: '15px'
              }}
            >
              <span>
                Filtered Total OT
              </span>

              <b>
                {adminTotalOT.toFixed(
                  2
                )}{' '}
                hrs
              </b>
            </div>

            <div className="tableWrap">

              <table>

                <thead>

                  <tr>
                    <th>
                      Employee ID
                    </th>

                    <th>
                      Employee Name
                    </th>

                    <th>
                      OT Date
                    </th>

                    <th>
                      Start Time
                    </th>

                    <th>
                      End Time
                    </th>

                    <th>
                      OT Hours
                    </th>

                    <th>
                      Reason
                    </th>

                    <th>
                      Comp-Off Date
                    </th>

                    <th>
                      Comp-Off Status
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {filteredAdminOT.map(
                    (entry) => (
                      <tr
                        key={
                          entry.id
                        }
                      >

                        <td>
                          {
                            entry.employee_id
                          }
                        </td>

                        <td>
                          {entry.name}
                        </td>

                        <td>
                          {
                            entry.ot_date
                          }
                        </td>

                        <td>
                          {
                            entry.start_time
                          }
                        </td>

                        <td>
                          {
                            entry.end_time
                          }
                        </td>

                        <td>
                          {Number(
                            entry.ot_hours ||
                              0
                          ).toFixed(2)}
                        </td>

                        <td>
                          {
                            entry.reason ||
                            '-'
                          }
                        </td>

                        <td>
                          {
                            entry.comp_off_date ||
                            '-'
                          }
                        </td>

                        <td>
                          {
                            entry.comp_off_status ||
                            '-'
                          }
                        </td>

                      </tr>
                    )
                  )}

                  {filteredAdminOT.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign:
                            'center'
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
        )}

        {/* =================================================
            ADMIN MANAGEMENT
            ================================================= */}

        {adminSection ===
          'management' && (
          <>

            <section className="card">

              <div className="sectionHead">

                <div>
                  <h3>
                    Admin Management
                  </h3>

                  <span className="muted">
                    Manage Admin access
                  </span>
                </div>

                <button
                  className="secondary"
                  onClick={() =>
                    setAdminSection(
                      'dashboard'
                    )
                  }
                >
                  ← Back to Dashboard
                </button>

              </div>

            </section>

            {/* MAKE ADMIN */}

            <section className="card">

              <h3>
                Make Admin
              </h3>

              <p className="muted">
                Existing Staff ko Admin
                banaye.
              </p>

              <label>
                Select Staff
              </label>

              <select
                value={
                  selectedMakeAdminStaffId
                }
                onChange={(e) =>
                  setSelectedMakeAdminStaffId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Staff
                </option>

                {adminStaff
                  .filter(
                    (item) =>
                      item.role !==
                        'admin' &&
                      item.employee_id
                        .trim()
                        .toUpperCase() !==
                        'SAS102'
                  )
                  .map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.employee_id} -{' '}
                      {item.name}
                    </option>
                  ))}
              </select>

              <label>
                New Admin Password
              </label>

              <input
                type="password"
                value={
                  makeAdminPassword
                }
                onChange={(e) =>
                  setMakeAdminPassword(
                    e.target.value
                  )
                }
                placeholder="Minimum 6 characters"
              />

              <label>
                Confirm Admin Password
              </label>

              <input
                type="password"
                value={
                  makeAdminConfirmPassword
                }
                onChange={(e) =>
                  setMakeAdminConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Confirm password"
              />

              <button
                onClick={
                  makeAdmin
                }
                disabled={
                  adminLoading
                }
              >
                {adminLoading
                  ? 'Processing...'
                  : 'Make Admin'}
              </button>

            </section>

            {/* REMOVE ADMIN */}

            <section className="card">

              <h3>
                Remove Admin
              </h3>

              <p className="muted">
                Main Admin SAS102 protected
                hai.
              </p>

              <label>
                Select Admin
              </label>

              <select
                value={
                  selectedRemoveAdminId
                }
                onChange={(e) =>
                  setSelectedRemoveAdminId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Admin
                </option>

                {adminList.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.employee_id} -{' '}
                      {item.name}
                    </option>
                  )
                )}

              </select>

              <button
                onClick={
                  removeAdmin
                }
                disabled={
                  adminLoading
                }
              >
                Remove Admin
              </button>

            </section>

            {/* REMOVE STAFF */}

            <section className="card">

              <h3>
                Remove Staff
              </h3>

              <p className="muted">
                Staff login/access remove
                hoga. OT/Comp-Off history
                preserve rahegi.
              </p>

              <label>
                Select Staff
              </label>

              <select
                value={
                  selectedRemoveStaffId
                }
                onChange={(e) =>
                  setSelectedRemoveStaffId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Staff
                </option>

                {adminStaff
                  .filter(
                    (item) =>
                      item.role !==
                        'admin' &&
                      item.employee_id
                        .trim()
                        .toUpperCase() !==
                        'SAS102'
                  )
                  .map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.employee_id} -{' '}
                      {item.name}
                    </option>
                  ))}
              </select>

              <button
                onClick={
                  removeStaff
                }
                disabled={
                  adminLoading
                }
              >
                Remove Staff
              </button>

            </section>

            {/* RESET ADMIN PASSWORD */}

            <section className="card">

              <h3>
                Reset Admin Password
              </h3>

              <p className="muted">
                Existing Admin ka password
                reset karo.
              </p>

              <label>
                Select Admin
              </label>

              <select
                value={
                  selectedResetAdminId
                }
                onChange={(e) =>
                  setSelectedResetAdminId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Admin
                </option>

                {adminList.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.employee_id} -{' '}
                      {item.name}
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
                  resetAdminPassword
                }
                onChange={(e) =>
                  setResetAdminPassword(
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
                  resetAdminConfirmPassword
                }
                onChange={(e) =>
                  setResetAdminConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Confirm password"
              />

              <button
                onClick={
                  resetAdminPasswordFn
                }
                disabled={
                  adminLoading
                }
              >
                Reset Admin Password
              </button>

            </section>

            {/* CHANGE MY PASSWORD */}

            <section className="card">

              <h3>
                Change My Password
              </h3>

              <p className="muted">
                Current Admin password change
                karne ke liye old password
                mandatory hai.
              </p>

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

              <button
                onClick={
                  changeMyPassword
                }
                disabled={
                  adminLoading
                }
              >
                Change My Password
              </button>

            </section>

          </>
        )}

      </main>
    );
  }

  /* =====================================================
     STAFF PORTAL
     ===================================================== */

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
            {total.toFixed(
              2
            )}{' '}
            hrs
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
              value={
                form.ot_date
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  ot_date:
                    e.target.value
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
              value={
                form.start_time
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  start_time:
                    e.target.value
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
              value={
                form.end_time
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  end_time:
                    e.target.value
                })
              }
            />

          </div>

          <div className="wide">

            <label>
              Reason
            </label>

            <input
              value={
                form.reason
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  reason:
                    e.target.value
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
            ).toFixed(
              2
            )}{' '}
            hours
          </b>

        </div>

        <button
          onClick={
            addOT
          }
          disabled={
            loading
          }
        >
          {loading
            ? 'Saving...'
            : 'Save OT'}
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
            {entries.length}{' '}
            records
          </span>

        </div>

        <div className="tableWrap">

          <table>

            <thead>

              <tr>

                <th>
                  Date
                </th>

                <th>
                  Time
                </th>

                <th>
                  Hours
                </th>

                <th>
                  Reason
                </th>

                <th>
                  Comp-Off Date
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {entries.map(
                (entry) => (
                  <tr
                    key={
                      entry.id
                    }
                  >

                    <td>
                      {
                        entry.ot_date
                      }
                    </td>

                    <td>
                      {
                        entry.start_time
                      }{' '}
                      -{' '}
                      {
                        entry.end_time
                      }
                    </td>

                    <td>
                      {Number(
                        entry.ot_hours
                      ).toFixed(
                        2
                      )}
                    </td>

                    <td>
                      {
                        entry.reason ||
                        '-'
                      }
                    </td>

                    <td>
                      {
                        entry.comp_off_date ||
                        ''
                      }
                    </td>

                    <td>
                      {
                        entry.comp_off_status ||
                        ''
                      }
                    </td>

                    <td>

                      {!entry.comp_off_date &&
                        compOffEntryId !==
                          entry.id && (

                          <button
                            className="small"
                            onClick={() =>
                              openCompOff(
                                entry.id
                              )
                            }
                          >
                            Comp-Off
                          </button>

                        )}

                      {compOffEntryId ===
                        entry.id && (

                        <div
                          style={{
                            display:
                              'flex',
                            gap: '6px',
                            alignItems:
                              'center',
                            flexWrap:
                              'wrap'
                          }}
                        >

                          <input
                            type="date"
                            value={
                              compOffDate
                            }
                            onChange={(
                              e
                            ) =>
                              setCompOffDate(
                                e
                                  .target
                                  .value
                              )
                            }
                          />

                          <button
                            className="small"
                            onClick={
                              confirmCompOff
                            }
                            disabled={
                              loading ||
                              !compOffDate
                            }
                          >
                            Confirm
                          </button>

                          <button
                            className="small secondary"
                            onClick={
                              cancelCompOff
                            }
                            disabled={
                              loading
                            }
                          >
                            Cancel
                          </button>

                        </div>

                      )}

                    </td>

                  </tr>
                )
              )}

              {entries.length ===
                0 && (
                <tr>

                  <td
                    colSpan={7}
                    style={{
                      textAlign:
                        'center'
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
