/**
 * 确认请求真的经过了 Cloudflare Access。
 *
 * Access 挡在前面，没登录的人根本到不了这里。可是只靠「前面有门」不够：
 * 门的设定哪天被改坏（路径打错、规则被删），这些数字就直接公开了。
 * 所以 Worker 自己再验一次 Access 签发的 JWT：签名对、发给这个应用、没过期。
 *
 * 本机开发（wrangler dev）没有 Access，在 .dev.vars 里设 DEV_NO_ACCESS=1 跳过。
 * .dev.vars 不进 git、不会被部署，线上永远要验。
 */

const b64urlBytes = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

let certCache = { at: 0, keys: [] };

async function accessKeys(teamDomain, fetchFn) {
  if (Date.now() - certCache.at < 3600_000 && certCache.keys.length) return certCache.keys;
  const res = await fetchFn(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access certs ${res.status}`);
  certCache = { at: Date.now(), keys: (await res.json()).keys };
  return certCache.keys;
}

/** 验过了返回 JWT 的内容（有 email 或 common_name），没过返回 null */
export async function verifyAccess(request, env, fetchFn = fetch) {
  if (env.DEV_NO_ACCESS === "1") return { email: "dev@localhost" };

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let header, payload;
  try {
    header = b64urlJson(parts[0]);
    payload = b64urlJson(parts[1]);
  } catch {
    return null;
  }

  const jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN, fetchFn)).find((k) => k.kid === header.kid);
  if (!jwk || header.alg !== "RS256") return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!ok) return null;

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) return null;
  if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
  if (!(payload.exp * 1000 > Date.now())) return null;
  return payload;
}

/** 测试用：换一组 key 时清掉缓存 */
export const resetCertCache = () => {
  certCache = { at: 0, keys: [] };
};
