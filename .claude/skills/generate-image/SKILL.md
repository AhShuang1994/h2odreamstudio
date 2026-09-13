---
name: generate-image
description: Generate images by calling the locally installed Codex CLI, which has OpenAI image generation built in. Use when the user asks to 生图, 画图, 做张图, generate an image, or produce an illustration, cover, hero, or OG asset.
---

# 生图 via Codex CLI

Codex CLI ships a built-in `image_generation` tool. Calling `codex exec` borrows the
user's ChatGPT login, so no separate API key is needed.

**Only works on the user's own machine.** It needs a logged-in Codex CLI and direct
network access to `api.openai.com`. Cloud sessions (Claude Code on the web) have
neither — the egress proxy rejects OpenAI with `HTTP CONNECT 403`. If preflight
fails there, say so and stop; do not look for a workaround.

## One-time setup

`.claude/settings.json` is gitignored here (`.gitignore` keeps `.claude/*` local
except `skills/`), so each machine needs this once to stop every generation
prompting for approval:

```json
{
  "permissions": {
    "allow": [
      "Bash(codex exec:*)",
      "Bash(codex features list:*)",
      "Bash(codex login status:*)"
    ]
  }
}
```

## Preflight

Run both once per session. Stop if either fails.

```bash
codex login status                           # must NOT print "Not logged in"
codex features list | grep image_generation  # must print: stable  true
```

Not logged in → tell the user to run `codex login` (opens a browser). On a headless
box, `codex login --device-auth`.

## Generate

```bash
codex exec -C "$PWD" -s workspace-write --skip-git-repo-check \
  "用内置的 image_generation 工具生成图片：<描述>。保存为 <相对路径>"
```

Three things matter:

- `-C "$PWD"` — writes into this project instead of codex's own working dir.
- `-s workspace-write` — the default sandbox is read-only and the save silently fails.
- Name the output path **in the prompt**. Left unsaid, codex invents one and you
  won't know where the file landed.

Each run takes 30-60s. Report the saved path back to the user.

## Turning output into a site asset

This site serves WebP. Convert after generating.

Needs `sharp`, the same dependency `scripts/dewatermark.js` uses. The repo has no
`package.json`, so it is installed outside the project — if `require('sharp')`
throws, run `npm i sharp` at the repo root and retry.

```bash
node -e "require('sharp')('<in>.png').webp({quality:82}).toFile('<out>.webp')"
```

Match the width the page actually uses — 1440 for hero and blog images:

```bash
node -e "require('sharp')('<in>.png').resize(1440).webp({quality:82}).toFile('<out>.webp')"
```

Do **not** run `scripts/dewatermark.js` on these. That script removes the Nano Banana
/ Gemini corner sparkle; OpenAI output has no such mark, and on a busy corner the
script would clone over real image content.
