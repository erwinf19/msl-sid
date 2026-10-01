// Browser-only download gate. This hash is public; it is not server authorization.
// PBKDF2 slows password guessing, but client code can still be bypassed.
export const DOWNLOAD_LOCK = Object.freeze({
  algorithm: 'PBKDF2', hash: 'SHA-256', iterations: 600000,
  salt: '3ad703937cd8ccd9634ade82c2b6742822324093a3cec064b9d861abf1b8ac3d',
  digest: '540f5d8087923c6644fb3c0c906f1e5043912af1af18b0d47d9383ce0335ba4d'
});
const hexBytes = hex => Uint8Array.from(hex.match(/../g), byte => parseInt(byte, 16));

export async function verifyDownloadPassword(password, configuration = DOWNLOAD_LOCK) {
  if (!globalThis.crypto?.subtle) throw new Error('Verifikasi password memerlukan HTTPS atau localhost.');
  if (typeof password !== 'string' || !password || password.length > 256) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: configuration.hash, salt: hexBytes(configuration.salt), iterations: configuration.iterations }, key, 256));
  const expected = hexBytes(configuration.digest);
  let difference = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}
