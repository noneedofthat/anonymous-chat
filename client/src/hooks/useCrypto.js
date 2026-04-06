// Encryption uses AES-GCM 256-bit
// Key is derived from the room code using PBKDF2
// All encryption/decryption happens in the browser — server only sees ciphertext

const SALT = "campfire-salt-2026"; // static salt, fine for this use case

// Derive a CryptoKey from the room code
export async function deriveKey(roomCode) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(roomCode),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(SALT),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt plaintext string → base64 string
export async function encryptText(key, plaintext) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  // Combine iv + ciphertext and encode as base64
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

// Decrypt base64 string → plaintext string
export async function decryptText(key, encoded) {
  try {
    const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return "[encrypted message]";
  }
}
