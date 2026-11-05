const AUDIT_LABELS: Record<string, string> = {
  OWNER_LOGIN_SUCCESS: 'Inicio de sesión en consola',
  OWNER_LOGIN_FAILED: 'Intento fallido de acceso a consola',
  OWNER_PUBLIC_LOGIN_BLOCKED: 'Cuenta de dueño bloqueada en login público',
  OWNER_REVOKE_ALL_SESSIONS: 'Cierre de todas las sesiones',
  OWNER_REVOKE_ALL_REQUEST: 'Solicitud de cierre de sesiones',
  COMPANY_CREATE: 'Empresa creada',
  COMPANY_UPDATE: 'Empresa editada',
  COMPANY_TOGGLE_STATUS: 'Empresa suspendida / reactivada',
  COMPANY_DELETE: 'Empresa movida a Eliminados',
  SUPPORT_MODE_ENTER: 'Entrada a Modo Soporte',
  USER_CREATE: 'Usuario creado',
  USER_RESET_PASSWORD: 'Contraseña de usuario restablecida',
  USER_DELETE: 'Usuario movido a Eliminados',
  GPS_CREATE: 'GPS registrado',
  GPS_UPDATE: 'GPS reasignado / editado',
  GPS_DELETE: 'GPS movido a Eliminados',
  RECORD_RESTORE: 'Registro restaurado desde Eliminados',
};

export function auditLabel(action: string) {
  if (AUDIT_LABELS[action]) return AUDIT_LABELS[action];
  if (action.endsWith('_MASTER_KEY_REJECTED')) return 'Clave maestra rechazada';
  return action;
}
