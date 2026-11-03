interface PasswordRule {
  label: string;
  ok: boolean;
}

export function passwordRules(password: string, minLength = 10): PasswordRule[] {
  return [
    { label: `Al menos ${minLength} caracteres`, ok: password.length >= minLength },
    { label: 'Una letra minúscula', ok: /[a-z]/.test(password) },
    { label: 'Una letra mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Un número', ok: /[0-9]/.test(password) },
    { label: 'Un símbolo (ej. ! # $ %)', ok: /[^A-Za-z0-9]/.test(password) },
    { label: 'Sin espacios', ok: password.length > 0 && !/\s/.test(password) },
  ];
}

export function isStrongPassword(password: string, minLength = 10) {
  return passwordRules(password, minLength).every((r) => r.ok);
}
