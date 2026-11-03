import { Platform, Vibration } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const ALARM_SOURCE = require('../../assets/sounds/guard-alarm.wav');
const VIBRATION_PATTERN = [0, 900, 400];

let player: ReturnType<typeof createAudioPlayer> | null = null;

export async function startGuardSiren() {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  }).catch(() => {});
  if (!player) player = createAudioPlayer(ALARM_SOURCE);
  player.loop = true;
  player.volume = 1;
  player.seekTo(0).catch(() => {});
  player.play();
  if (Platform.OS !== 'web') Vibration.vibrate(VIBRATION_PATTERN, true);
}

export function stopGuardSiren() {
  if (player) {
    player.pause();
    player.remove();
    player = null;
  }
  if (Platform.OS !== 'web') Vibration.cancel();
}
