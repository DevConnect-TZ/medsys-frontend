// Role definitions with specific permissions
export const ROLE_PERMISSIONS: Record<string, {
  label: string;
  description: string;
  permissions: string[];
  menuItems: string[];
}> = {
  admin: {
    label: 'Administrator',
    description: 'Full system access and user management',
    permissions: [
      'view_users',
      'manage_users',
      'invite_users',
      'view_patients',
      'view_appointments',
      'view_visits',
      'view_labs',
      'view_lab_results',
      'view_prescriptions',
      'view_inventory',
      'manage_inventory',
      'view_medical_tests',
      'manage_medical_tests',
      'manage_doctor_schedules',
      'manage_wards',
      'view_invoices',
      'view_payments',
    ],
    menuItems: ['dashboard', 'patients', 'appointments', 'users', 'reports', 'settings'],
  },
  doctor: {
    label: 'Doctor',
    description: 'Medical operations and patient care',
    permissions: [
      'view_patients',
      'edit_patients',
      'view_appointments',
      'view_visits',
      'create_visits',
      'manage_admissions',
      'edit_visits',
      'view_labs',
      'create_lab_orders',
      'manage_admissions',
      'view_lab_results',
      'create_prescriptions',
      'view_prescriptions',
      'edit_prescriptions',
      'view_medical_tests',
    ],
    menuItems: ['dashboard', 'patients', 'appointments', 'visits', 'admissions', 'labs', 'prescriptions'],
  },
  receptionist: {
    label: 'Receptionist',
    description: 'Front desk and appointment management',
    permissions: [
      'view_patients',
      'create_patients',
      'edit_patients',
      'view_appointments',
      'create_appointments',
      'edit_appointments',
      'cancel_appointments',
      'view_visits',
      'create_visits',
      'view_invoices',
      'create_invoices',
      'manage_admissions',
      'view_medical_tests',
    ],
    menuItems: ['dashboard', 'patients', 'appointments', 'visits', 'admissions', 'invoices'],
  },
  nurse: {
    label: 'Nurse',
    description: 'Patient care and vital signs recording',
    permissions: [
      'view_patients',
      'view_appointments',
      'view_visits',
      'create_visits',
      'edit_visits',
    ],
    menuItems: ['dashboard', 'patients', 'visits', 'admissions'],
  },
  cashier: {
    label: 'Cashier',
    description: 'Billing and payment processing',
    permissions: [
      'view_invoices',
      'create_invoices',
      'edit_invoices',
      'view_payments',
      'process_payments',
      'view_medical_tests',
    ],
    menuItems: ['dashboard', 'invoices', 'payments'],
  },
  lab_technician: {
    label: 'Lab Technician',
    description: 'Laboratory test management',
    permissions: [
      'view_labs',
      'create_lab_orders',
      'view_lab_results',
      'create_lab_results',
      'edit_lab_results',
      'view_medical_tests',
    ],
    menuItems: ['dashboard', 'labs'],
  },
  pharmacist: {
    label: 'Pharmacist',
    description: 'Pharmacy and medication management',
    permissions: [
      'view_prescriptions',
      'edit_prescriptions',
      'view_inventory',
      'manage_inventory',
      'view_medical_tests',
    ],
    menuItems: ['dashboard', 'prescriptions', 'inventory'],
  },
};

export const getAllRoles = () => {
  return Object.entries(ROLE_PERMISSIONS).map(([value, config]) => ({
    value,
    label: config.label,
    description: config.description,
  }));
};

export const getRoleLabel = (role: string): string => {
  return ROLE_PERMISSIONS[role]?.label || role;
};

export const getRoleDescription = (role: string): string => {
  return ROLE_PERMISSIONS[role]?.description || '';
};

export const getRolePermissions = (role: string): string[] => {
  return ROLE_PERMISSIONS[role]?.permissions || [];
};

export const getRoleMenuItems = (role: string): string[] => {
  return ROLE_PERMISSIONS[role]?.menuItems || [];
};

export const hasPermission = (role: string, permission: string): boolean => {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
};

export const hasAnyPermission = (role: string, permissions: string[]): boolean => {
  const rolePermissions = getRolePermissions(role);
  return permissions.some(p => rolePermissions.includes(p));
};
