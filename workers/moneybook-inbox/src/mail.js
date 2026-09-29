/**
 * 把 Email Routing 交来的一封信读成 `{ t, from, subject, body }`（ADR-0004）。
 *
 * 只做「读出文字」这一件事：不认银行、不抓金额，那些全在小帐本的 ledger.js。
 * 所以这里给出的格式要跟快捷指令投的 `{mail:{from, subject, body}}` 一样，小帐本分不出来。
 */

import PostalMime from "postal-mime";

/** HTML → 一行一行的文字。表格的一格变空格、一列变一行：`Amount:` 跟金额才会落在同一行 */
export function htmlToText(html) {
  return String(html ?? "")
    .replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|blockquote)>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 寄件人用**信头**的 From，不用信封地址：Gmail 转寄时信封地址是 Gmail 自己，
 * 信头才是银行。格式跟 iPhone 邮件给的一样：`名字 <地址>`。
 */
export async function readMail(raw) {
  const m = await PostalMime.parse(raw);
  const addr = m.from?.address ?? "";
  const from = m.from?.name ? `${m.from.name} <${addr}>` : addr;
  return {
    t: m.date ?? "",
    from,
    subject: m.subject ?? "",
    body: m.text?.trim() ? m.text : htmlToText(m.html),
  };
}
