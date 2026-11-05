const AUDIT_LABELS: Record<string, string> = {
  STAFF_LOGIN_SUCCESS: 'Inicio de sesión en la consola',
  STAFF_LOGIN_FAILED: 'Intento fallido de acceso a la consola',
  STAFF_PASSWORD_CHANGED: 'Contraseña de la consola cambiada',
  STAFF_PASSWORD_CHANGE_REQUEST: 'Solicitud de cambio de contraseña',
  STAFF_REVOKE_ALL_SESSIONS: 'Cierre de todas sus sesiones',
  COMPANY_CREATE: 'Empresa creada',
  COMPANY_UPDATE: 'Datos del cliente editados',
  COMPANY_PLAN_CHANGE: 'Cambio de plan',
  COMPANY_TOGGLE_STATUS: 'Empresa suspendida / reactivada',
  COMPANY_DELETE: 'Empresa movida a Eliminados',
  SUPPORT_MODE_ENTER: 'Entrada a Modo Soporte',
  SUPPORT_CHANGE: 'Cambio hecho en Modo Soporte',
  SUBSCRIPTION_SAVE: 'Suscripción guardada',
  USER_CREATE: 'Usuario de cliente creado',
  USER_RESET_PASSWORD: 'Contraseña de cliente restablecida',
  USER_DELETE: 'Usuario de cliente movido a Eliminados',
  GPS_CREATE: 'GPS registrado',
  GPS_UPDATE: 'GPS reasignado / editado',
  GPS_DELETE: 'GPS movido a Eliminados',
  GPS_LINK: 'GPS vinculado a una unidad',
  GPS_UNLINK: 'GPS desvinculado de su unidad',
  RECORD_RESTORE: 'Registro restaurado desde Eliminados',
  TEAM_CREATE: 'Integrante del equipo agregado',
  TEAM_UPDATE: 'Integrante del equipo editado',
  TEAM_SET_ACTIVE: 'Integrante desactivado / reactivado',
  TEAM_RESET_PASSWORD: 'Contraseña de integrante restablecida',
};

export function auditLabel(action: string) {
  if (AUDIT_LABELS[action]) return AUDIT_LABELS[action];
  if (action.endsWith('_PASSWORD_REJECTED')) return 'Contraseña de confirmación rechazada';
  return action;
}
