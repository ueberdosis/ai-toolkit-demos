export function toBase64String(uint8Array: Uint8Array) {
  return btoa(String.fromCharCode(...new Uint8Array(uint8Array)));
}

export function fromBase64String(base64String: string) {
  const decodedString = atob(base64String);
  const uint8Array = new Uint8Array(decodedString.length);

  for (let i = 0; i < decodedString.length; i += 1) {
    uint8Array[i] = decodedString.charCodeAt(i);
  }

  return uint8Array;
}
