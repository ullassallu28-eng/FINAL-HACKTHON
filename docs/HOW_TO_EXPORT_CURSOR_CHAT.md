# How to Export Full Cursor Chat History (AgriSentinel)

## Already exported for this project

| File | Size | Content |
|------|------|---------|
| **`AgriSentinel_Full_Chat_History.md`** | ~3.4 MB | **Main file** — full merged chat (2241 messages), start to latest |
| `AgriSentinel_Full_Chat_History_Part2.md` | ~470 KB | Secondary session export (overlap; use main file first) |

Open `AgriSentinel_Full_Chat_History.md` in VS Code, Notepad++, or upload to ChatGPT/Claude/Google Drive.

---

## Method 1 — Cursor built-in (one chat only)

1. Open the chat in Cursor
2. Click **⋯** (top of chat panel)
3. Click **Export Chat**
4. Saves one `.md` file for that conversation

---

## Method 2 — Full history via CLI (recommended)

Requires Node.js 20+.

```powershell
# Install once
npm install -g cursor-history

# If command not found, use npx instead:
npx cursor-history list

# Export session #1 (FARM-PLATFORM project — full merged history)
npx cursor-history export 1 --format md --output docs/AgriSentinel_Full_Chat_History.md
```

Other useful commands:

```powershell
npx cursor-history list                    # See all chats
npx cursor-history show 1                  # Preview session 1
npx cursor-history export 1 --format json  # JSON instead of Markdown
```

---

## Method 3 — Share with teammate / other AI

Upload or paste these together:

1. `docs/AgriSentinel_Full_Chat_History.md` (this export)
2. `DEPLOYMENT_GUIDE.md`
3. `docs/AgriSentinel_SIH2026_Feature_List.md`

---

## Note

- Very large `.md` files may be slow in normal Notepad — use VS Code or split the file.
- Images pasted in chat are **not** always included in exports.
- Tool calls may appear as `[Tool: ...]` lines in the export.
