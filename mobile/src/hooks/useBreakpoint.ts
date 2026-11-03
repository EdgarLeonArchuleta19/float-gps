import { useWindowDimensions } from 'react-native';

const DESKTOP_MIN_WIDTH = 1024;

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_MIN_WIDTH;
}
