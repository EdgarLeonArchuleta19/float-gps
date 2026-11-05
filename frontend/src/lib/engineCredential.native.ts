import * as SecureStore from 'expo-secure-store';

const PASSWORD_KEY = 'floa_engine_password';
const OWNER_KEY = 'floa_engine_password_owner';

function biometricsReady(): boolean {
  try {
    return SecureStore.canUseBiometricAuthentication();
  } catch {
    return false;
  }
}

export async function hasEngineCredential(userId: string): Promise<boolean> {
  if (!biometricsReady()) return false;
  const owner = await SecureStore.getItemAsync(OWNER_KEY).catch(() => null);
  return owner === userId;
}

export async function saveEngineCredential(userId: string, password: string): Promise<void> {
  if (!biometricsReady()) return;
  try {
    await SecureStore.setItemAsync(PASSWORD_KEY, password, {
      requireAuthentication: true,
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });
    await SecureStore.setItemAsync(OWNER_KEY, userId);
  } catch {
    await forgetEngineCredential();
  }
}

export async function readEngineCredential(prompt: string): Promise<string | null> {
  return SecureStore.getItemAsync(PASSWORD_KEY, {
    requireAuthentication: true,
    authenticationPrompt: prompt,
    keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  }).catch(() => null);
}

export async function forgetEngineCredential(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PASSWORD_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(OWNER_KEY).catch(() => {}),
  ]);
}
