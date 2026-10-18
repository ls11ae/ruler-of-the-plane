@echo off
rem Ruler of the Plane: ends the booth (browser, server) and restores the power settings.
title Ruler of the Plane - Stand beenden
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop.ps1" %*
if not defined CI timeout /t 5
