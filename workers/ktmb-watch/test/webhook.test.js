/**
 * Worker 的 fetch 入口 —— 谁进得来，谁进不来。
 *
 * webhook 是公开网址，只有那个密钥挡着。挡漏了，任何人都能冒充 Telegram
 * 灌假讯息进来，帮自己加点数。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import worker from "../src/index.js";
import { freshDb } from "./helpers/d1.js";

const SECRET = "test-secret-123";
const env = () => ({
  DB: freshDb(),
  TELEGRAM_BOT_TOKEN: "fake",
  TELEGRAM_WEBHOOK_SECRET: SECRET,
});

const post = (path, headers = {}, body = {}) =>
  new Request(`https://w.example.com${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const ctx = () => ({ waitUntil: (p) => p.catch(() => {}) });

test("没带密钥的 webhook 请求要被挡下来", async () => {
  const res = await worker.fetch(post("/webhook"), env(), ctx());
  assert.equal(res.status, 403);
});

test("密钥不对也要挡", async () => {
  const res = await worker.fetch(
    post("/webhook", { "X-Telegram-Bot-Api-Secret-Token": "wrong" }),
    env(),
    ctx(),
  );
  assert.equal(res.status, 403);
});

test("密钥对了才放行", async () => {
  const res = await worker.fetch(
    post("/webhook", { "X-Telegram-Bot-Api-Secret-Token": SECRET }),
    env(),
    ctx(),
  );
  assert.equal(res.status, 200);
});

test("webhook 只收 POST", async () => {
  const req = new Request("https://w.example.com/webhook", {
    method: "GET",
    headers: { "X-Telegram-Bot-Api-Secret-Token": SECRET },
  });
  const res = await worker.fetch(req, env(), ctx());
  assert.equal(res.status, 404);
});

test("不认得的路径回 404", async () => {
  const res = await worker.fetch(
    post("/admin", { "X-Telegram-Bot-Api-Secret-Token": SECRET }),
    env(),
    ctx(),
  );
  assert.equal(res.status, 404);
});

test("/health 不用密钥", async () => {
  const req = new Request("https://w.example.com/health");
  const res = await worker.fetch(req, env(), ctx());
  assert.equal(res.status, 200);
  assert.equal((await res.text()).trim(), "ok");
});

test("Telegram 要马上拿到 200，慢的活丢背景做", async () => {
  // 回得慢，Telegram 会重送同一条 update，等于同一个动作做两次
  let backgrounded = false;
  const c = {
    waitUntil: (p) => {
      backgrounded = true;
      p.catch(() => {});
    },
  };
  const res = await worker.fetch(
    post("/webhook", { "X-Telegram-Bot-Api-Secret-Token": SECRET }, {
      message: { chat: { id: 1 }, text: "/start" },
    }),
    env(),
    c,
  );
  assert.equal(res.status, 200);
  assert.equal(backgrounded, true, "处理要走 waitUntil，不能让 Telegram 等");
});
