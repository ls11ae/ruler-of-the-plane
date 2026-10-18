@echo off
rem Ruler of the Plane: starts the booth (local server, Chrome in kiosk mode). End with Stop-Stand.cmd.
rem Options, e.g. from a console: Start-Stand.cmd -Browser firefox   or   -Port 8138   or   -NoBrowser
title Ruler of the Plane - Stand
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1" %*
if errorlevel 1 if not defined CI pause
