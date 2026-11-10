@echo off
setlocal enabledelayedexpansion
title Stamp2Go - Print station setup
rem ==================================================================
rem  Stamp2Go print station - one-time setup (Windows XP SP3 / 7 / 10 / 11)
rem  1. Finds a modern browser (Supermium on XP, Chrome or Edge on newer Windows)
rem     or runs the Supermium installer placed next to this file.
rem  2. Sets the Trotec Engraver as the default printer.
rem  3. Creates a desktop icon + auto-start that opens the print station
rem     with kiosk printing (prints straight to the Trotec, no dialog).
rem  Safe to run again at any time.
rem ==================================================================
set "URL=https://www.stamp2go.co.il/admin/print-station/"
set "STATIONDIR=%SystemDrive%\Stamp2GoStation"
set "HERE=%~dp0"
set "BROWSER="

echo.
echo  Stamp2Go - print station setup
echo  ==============================
echo.

rem ---- 1. Browser ------------------------------------------------------
call :findbrowser
if not defined BROWSER (
  for %%I in ("%HERE%supermium*.exe") do (
    echo  Installing Supermium from %%~nxI ...
    start "" /wait "%%~fI"
  )
  call :findbrowser
)
if not defined BROWSER (
  echo  [X] No supported browser found.
  echo.
  echo      Windows XP: download the Supermium installer ^(32-bit^) from
  echo      https://github.com/win32ss/supermium/releases on another computer,
  echo      copy it to the same folder as this file and run this file again.
  echo      Windows 7/10/11: install Google Chrome or Microsoft Edge.
  echo.
  pause
  exit /b 1
)
echo  [OK] Browser: !BROWSER!

rem ---- 2. Default printer: the first printer whose name contains "Trotec"
set "PVBS=%TEMP%\s2g-printer.vbs"
> "%PVBS%" echo On Error Resume Next
>>"%PVBS%" echo Set net = CreateObject("WScript.Network")
>>"%PVBS%" echo For Each p In GetObject("winmgmts:").ExecQuery("select Name from Win32_Printer")
>>"%PVBS%" echo   If InStr(LCase(p.Name), "trotec") ^> 0 Then
>>"%PVBS%" echo     net.SetDefaultPrinter p.Name
>>"%PVBS%" echo     WScript.Echo p.Name
>>"%PVBS%" echo     WScript.Quit 0
>>"%PVBS%" echo   End If
>>"%PVBS%" echo Next
>>"%PVBS%" echo WScript.Quit 1
set "PRINTER="
for /f "delims=" %%P in ('cscript //nologo "%PVBS%"') do set "PRINTER=%%P"
del "%PVBS%" >nul 2>&1
if defined PRINTER (
  rem Stop Windows 10/11 from switching the default printer by itself.
  reg add "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Windows" /v LegacyDefaultPrinterMode /t REG_DWORD /d 1 /f >nul 2>&1
  echo  [OK] Default printer: !PRINTER!
) else (
  echo  [X] No Trotec printer found - install the Trotec driver, then run this file again.
)

rem ---- 3. Desktop icon + auto-start (VBScript works on every Windows) ----
if not exist "%STATIONDIR%" mkdir "%STATIONDIR%"
set "VBS=%TEMP%\s2g-shortcut.vbs"
> "%VBS%" echo Set sh = CreateObject("WScript.Shell")
>>"%VBS%" echo For Each place In Array(sh.SpecialFolders("Desktop"), sh.SpecialFolders("Startup"))
>>"%VBS%" echo   Set lnk = sh.CreateShortcut(place ^& "\Stamp2Go print station.lnk")
>>"%VBS%" echo   lnk.TargetPath = "!BROWSER!"
>>"%VBS%" echo   lnk.Arguments = "--kiosk-printing --no-first-run --user-data-dir=""%STATIONDIR%"" %URL%"
>>"%VBS%" echo   lnk.IconLocation = "!BROWSER!,0"
>>"%VBS%" echo   lnk.Description = "Stamp2Go - automatic printing to the Trotec"
>>"%VBS%" echo   lnk.Save
>>"%VBS%" echo Next
cscript //nologo "%VBS%"
del "%VBS%" >nul 2>&1
echo  [OK] Desktop icon and auto-start created: "Stamp2Go print station"

rem ---- 4. Open it now ----------------------------------------------------
echo.
echo  Opening the print station. Log in to the admin once,
echo  then press the green button to switch on automatic printing.
echo.
start "" "!BROWSER!" --kiosk-printing --no-first-run --user-data-dir="%STATIONDIR%" %URL%
pause
exit /b 0

:findbrowser
set "LAD=%LOCALAPPDATA%"
if not defined LAD set "LAD=%USERPROFILE%\Local Settings\Application Data"
for %%B in (
  "%ProgramFiles%\Supermium\supermium.exe"
  "%ProgramFiles%\Supermium\chrome.exe"
  "%ProgramFiles(x86)%\Supermium\supermium.exe"
  "%ProgramFiles(x86)%\Supermium\chrome.exe"
  "%LAD%\Supermium\Application\supermium.exe"
  "%LAD%\Supermium\Application\chrome.exe"
  "%HERE%SupermiumPortable\SupermiumPortable.exe"
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LAD%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do (
  if not defined BROWSER if exist %%B set "BROWSER=%%~B"
)
if not defined BROWSER (
  for /f "delims=" %%F in ('dir /s /b "%ProgramFiles%\Supermium\*.exe" 2^>nul ^| findstr /i /e "supermium.exe chrome.exe"') do if not defined BROWSER set "BROWSER=%%F"
)
exit /b 0
