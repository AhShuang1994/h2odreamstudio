/**
 * 收到即封：用使用者的公钥把一笔刷卡记录封起来，之后只有那台手机解得开。
 *
 * ECIES：一次性 ECDH P-256 钥匙 + 使用者公钥 → 共享秘密 → HKDF-SHA256 → AES-256-GCM。
 * 只用 WebCrypto，Workers 与 Node 都有。小帐本那一侧的解封在
 * public/app/moneybook/inbox-crypto.js，两边的 INFO 与格式必须一字不差。
 */

const INFO = new TextEncoder().encode("moneybook-inbox v1");
const EC = { name: "ECDH", namedCurve: "P-256" };

export function b64url(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 公钥 JWK 合法吗。开箱时就挡掉，免得每一笔投递都在 importKey 上炸。 */
export async function importPublicKey(jwk) {
  if (!jwk || jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.x || !jwk.y || jwk.d) {
    throw new Error("公钥格式不对");
  }
  return crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y, ext: true },
    EC,
    true,
    [],
  );
}

/** 把一个物件封起来，返回 { epk, iv, ct }，三个都是 base64url。 */
export async function seal(pubJwk, obj) {
  const recipient = await importPublicKey(pubJwk);
  const eph = await crypto.subtle.generateKey(EC, true, ["deriveBits"]);
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: recipient }, eph.privateKey, 256);
  const epkRaw = await crypto.subtle.exportKey("raw", eph.publicKey);

  const hkdf = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: epkRaw, info: INFO },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(obj)),
  );
  return { epk: b64url(epkRaw), iv: b64url(iv), ct: b64url(ct) };
}
