export function homeRoute(isOwner: boolean, inSupport: boolean): '/owner-panel' | '/dashboard' {
  return isOwner && !inSupport ? '/owner-panel' : '/dashboard';
}
