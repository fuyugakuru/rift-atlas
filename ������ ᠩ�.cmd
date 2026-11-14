@echo off
setlocal
set "RIFT_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "RIFT_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
start "" "http://127.0.0.1:8128/"
"%RIFT_NODE%" "%~dp0tools\preview.cjs"
pause
