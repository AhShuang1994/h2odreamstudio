# 同步说明

这个技能有**两份**,源头只有一个。

| 位置 | 角色 | 谁读它 |
|---|---|---|
| `AhShuang1994/my-claude-skills` → `skills/design/screenshot-to-web/` | **源头** | 本机 Claude Code(经 `setup.ps1` 链进 `~/.claude/skills/`) |
| `AhShuang1994/h2odreamstudio` → `.agents/skills/screenshot-to-web/` | 拷贝 | 云端 / 网页版 session(只克隆本 repo) |

`.claude/skills/screenshot-to-web` 是指向 `.agents/skills/` 的符号链接,
跟本 repo 其他 35 个技能一样的做法(git 以模式 `120000` 追踪符号链接本身,克隆出来即可用)。

## 为什么要两份

云端 session 在容器里跑,只克隆 h2odreamstudio,**读不到你本机的 `~/.claude/skills/`**。
所以本机装好的技能在网页版里是「Unknown command」。要两边都能用,库里就得有一份。

## 改动流程

**先改源头,再同步过来:**

```bash
# 1. 在 my-claude-skills 里改,提交
# 2. 同步到这里(在 h2odreamstudio 根目录跑)
rm -rf .agents/skills/screenshot-to-web
cp -r <my-claude-skills 路径>/skills/design/screenshot-to-web .agents/skills/screenshot-to-web
# 3. 把这份 SYNC.md 和 SKILL.md 顶部的「这是拷贝」提示加回去(cp 会覆盖掉)
```

Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .agents\skills\screenshot-to-web
Copy-Item -Recurse "$env:USERPROFILE\ClaudeCode\my-claude-skills\skills\design\screenshot-to-web" .agents\skills\screenshot-to-web
```

## 校验两边是否一致

```bash
diff -r <my-claude-skills>/skills/design/screenshot-to-web .agents/skills/screenshot-to-web
```

只应该差两处:`SKILL.md` 顶部的「这是拷贝」提示,和这份 `SYNC.md`。
**出现其他差异 = 有一边改了没同步。**
