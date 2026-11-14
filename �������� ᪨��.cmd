@echo off
setlocal
set "RIFT_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "RIFT_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%RIFT_NODE%" "%~dp0tools\update-skin-videos.cjs"
if errorlevel 1 (
  echo Update failed. Check the skin video list.
) else (
  echo Skins updated. Refresh the website with Ctrl+F5.
)
pause
