-- Run in Supabase SQL Editor after Anonymous Sign-Ins are enabled.
CREATE OR REPLACE FUNCTION public.login_staff(p_employee_id text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_staff public."STAFF"%ROWTYPE;
BEGIN
 SELECT * INTO v_staff FROM public."STAFF"
 WHERE employee_id=p_employee_id AND access_enabled=true LIMIT 1;
 IF NOT FOUND THEN
  RETURN json_build_object('success',false,'message','Employee ID not authorized');
 END IF;
 RETURN json_build_object('success',true,'staff_id',v_staff.id,'employee_id',v_staff.employee_id,'name',v_staff.name);
END; $$;
GRANT EXECUTE ON FUNCTION public.login_staff(text) TO anon, authenticated;
