export function homeRoute(isStaff: boolean, inSupport: boolean): '/console' | '/live-map' {
  return isStaff && !inSupport ? '/console' : '/live-map';
}
