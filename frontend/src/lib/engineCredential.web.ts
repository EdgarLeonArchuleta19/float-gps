export async function hasEngineCredential(_userId: string): Promise<boolean> {
  return false;
}

export async function saveEngineCredential(_userId: string, _password: string): Promise<void> {}

export async function readEngineCredential(_prompt: string): Promise<string | null> {
  return null;
}

export async function forgetEngineCredential(): Promise<void> {}
