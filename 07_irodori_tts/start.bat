@echo off
rem Start the Irodori-TTS web UI. Usage: start.bat [voicedesign]
set "PATH=%USERPROFILE%\.local\bin;%PATH%"
cd /d "%USERPROFILE%\Irodori-TTS" 2>nul || (
  echo Irodori-TTS is not installed. Run install.bat first.
  pause
  exit /b 1
)

set "APP=gradio_app.py"
set "PORT=7860"
if /i "%~1"=="voicedesign" (
  set "APP=gradio_app_voicedesign.py"
  set "PORT=7861"
)

rem Open the browser once the server is listening (model loading takes a while).
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "while ($true) { try { (New-Object Net.Sockets.TcpClient('127.0.0.1', %PORT%)).Close(); break } catch { Start-Sleep 2 } }; Start-Process http://127.0.0.1:%PORT%"

echo Starting Irodori-TTS on http://127.0.0.1:%PORT% ... (close this window to stop)
uv run --no-sync python %APP% --server-name 127.0.0.1 --server-port %PORT%
pause
