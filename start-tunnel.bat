@echo off
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5173 > "%TEMP%\opencode\cf_final.log" 2>&1
