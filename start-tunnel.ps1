$process = Start-Process -FilePath "C:\Program Files (x86)\cloudflared\cloudflared.exe" -ArgumentList 'tunnel','--url','http://localhost:5173' -NoNewWindow -PassThru
Start-Sleep -Seconds 15
Get-Content "C:\Users\DO-EDG~1\AppData\Local\Temp\opencode\cf_final.log" -ErrorAction SilentlyContinue
