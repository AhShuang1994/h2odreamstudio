/**
 * 小帐本 · 收件箱的钥匙与解封
 *
 * 钥匙对在这台手机上生成：公钥交给收件箱 Worker，私钥只进 state.inbox.priv。
 * Worker 收到刷卡记录的当下就用公钥封起来（workers/moneybook-inbox/src/seal.js），
 * 库里只有密文，只有这里的私钥解得开。两边的 INFO 与格式必须一字不差。
 *
 * 只用 WebCrypto：不引第三方库，Safari 与 Node 都有。
 */

const INFO = new TextEncoder().encode('moneybook-inbox v1');
const EC = { name: 'ECDH', namedCurve: 'P-256' };

function fromB64url(s) {
  const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

/** 新的一对钥匙。返回两个 JWK：pub 交给 Worker，priv 留在本机。 */
export async function generateKeyPair() {
  const kp = await crypto.subtle.generateKey(EC, true, ['deriveBits']);
  const priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const { kty, crv, x, y } = await crypto.subtle.exportKey('jwk', kp.publicKey);
  return { pub: { kty, crv, x, y }, priv: { kty: priv.kty, crv: priv.crv, x: priv.x, y: priv.y, d: priv.d } };
}

/** 解封一笔。钥匙不对或内容被动过就抛错：AES-GCM 会验证完整性。 */
export async function open(privJwk, { epk, iv, ct }) {
  const priv = await crypto.subtle.importKey('jwk', { ...privJwk, ext: true }, EC, false, ['deriveBits']);
  const epkRaw = fromB64url(epk);
  const eph = await crypto.subtle.importKey('raw', epkRaw, EC, false, []);
  const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: eph }, priv, 256);
  const hkdf = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: epkRaw, info: INFO },
    hkdf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64url(iv) }, key, fromB64url(ct));
  return JSON.parse(new TextDecoder().decode(plain));
}
