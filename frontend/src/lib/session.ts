export function homeRoute(isOwner: boolean, inSupport: boolean): '/owner-panel' | '/live-map' {
  return isOwner && !inSupport ? '/owner-panel' : '/live-map';
}
