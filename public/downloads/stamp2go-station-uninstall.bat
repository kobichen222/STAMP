@echo off
setlocal
title Stamp2Go - Print station uninstall
rem ==================================================================
rem  Stamp2Go print station - uninstall (Windows XP SP3 / 7 / 10 / 11)
rem  Undoes stamp2go-station-setup.bat:
rem   1. Closes the print-station browser window (only that window).
rem   2. Removes the desktop icon and the auto-start entry.
rem   3. Deletes the station's browser profile (C:\Stamp2GoStation).
rem   4. Lets Windows 10/11 manage the default printer again.
rem  The browser itself (Supermium / Chrome / Edge) and the Trotec driver
rem  are NOT removed. Safe to run more than once.
rem ==================================================================
set "STATIONDIR=%SystemDrive%\Stamp2GoStation"

echo.
echo  Stamp2Go - print station uninstall
echo  ==================================
echo.
set /p "ANSWER= Remove the Stamp2Go print station from this computer? (Y/N) "
if /i not "%ANSWER%"=="Y" (
  echo  Cancelled - nothing was changed.
  echo.
  pause
  exit /b 0
)
echo.

rem ---- 1. Close the station window (browser processes using its profile) --
wmic process where "CommandLine like '%%Stamp2GoStation%%' and not Name like '%%wmic%%' and not Name like '%%cmd%%'" call terminate >nul 2>&1
rem Give the browser a moment to release its files.
ping -n 3 127.0.0.1 >nul
echo  [OK] Print station window closed

rem ---- 2. Desktop icon + auto-start -------------------------------------
set "VBS=%TEMP%\s2g-remove.vbs"
> "%VBS%" echo Set sh = CreateObject("WScript.Shell")
>>"%VBS%" echo Set fs = CreateObject("Scripting.FileSystemObject")
>>"%VBS%" echo For Each place In Array(sh.SpecialFolders("Desktop"), sh.SpecialFolders("Startup"), sh.SpecialFolders("AllUsersDesktop"), sh.SpecialFolders("AllUsersStartup"))
>>"%VBS%" echo   f = place ^& "\Stamp2Go print station.lnk"
>>"%VBS%" echo   If fs.FileExists(f) Then fs.DeleteFile f, True
>>"%VBS%" echo Next
cscript //nologo "%VBS%"
del "%VBS%" >nul 2>&1
echo  [OK] Desktop icon and auto-start removed

rem ---- 3. Station browser profile ---------------------------------------
if exist "%STATIONDIR%" (
  rmdir /s /q "%STATIONDIR%" >nul 2>&1
  if exist "%STATIONDIR%" (
    echo  [X] Could not delete %STATIONDIR% - close all browser windows and run this file again.
  ) else (
    echo  [OK] Deleted %STATIONDIR%
  )
) else (
  echo  [OK] %STATIONDIR% was already gone
)

rem ---- 4. Default printer management (Windows 10/11) ---------------------
reg delete "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Windows" /v LegacyDefaultPrinterMode /f >nul 2>&1
echo  [OK] Windows manages the default printer again
echo      (the Trotec stays the default printer until you choose another one)

echo.
echo  Done. The Stamp2Go print station was removed.
echo  To remove the browser too: Control Panel - Add or Remove Programs - Supermium.
echo.
pause
exit /b 0
