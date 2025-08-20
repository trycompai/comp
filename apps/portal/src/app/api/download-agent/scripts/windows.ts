import type { ScriptConfig } from '../types';

export function generateWindowsScript(config: ScriptConfig): string {
  const { orgId, employeeId, fleetDevicePath } = config;

  const script = `@echo off
title CompAI Device Setup
setlocal EnableExtensions EnableDelayedExpansion
color 0A

echo ------------------------------------------------------------
echo  CompAI Device Setup
echo  Organization: ${orgId}
echo  Employee: ${employeeId}
echo  Date: %date% %time%
echo ------------------------------------------------------------
echo.

REM Variables
set "ORG_ID=${orgId}"
set "EMPLOYEE_ID=${employeeId}"
set "PRIMARY_DIR=${fleetDevicePath}"
set "FALLBACK_DIR=%PUBLIC%\CompAI\Fleet"
set "CHOSEN_DIR="
set "LOG_FILE="
set "HAS_ERROR=0"
set "ERRORS="

REM Self-elevate if not running as administrator
net session >nul 2>&1
if not %errorlevel%==0 (
  color 0E
  echo Administrator permission is required.
  echo A prompt will appear asking for permission. Please click "Yes".
  echo If no prompt appears, right-click this file and select "Run as administrator".
  echo.
  echo Elevating... A new window will open and remain open after running.
  > "%TEMP%\getadmin.vbs" echo Set UAC = CreateObject^("Shell.Application"^)
  >> "%TEMP%\getadmin.vbs" echo UAC.ShellExecute "%~f0", "", "", "runas", 1
  wscript "%TEMP%\getadmin.vbs" >nul 2>&1
  del "%TEMP%\getadmin.vbs" >nul 2>&1
  echo This window will now close. The setup will continue in the new (admin) window.
  pause
  exit /b
)
echo Running with administrator privileges.
echo.

REM Choose a writable directory (primary first, then fallback)
echo Choosing destination directory...
echo   Trying primary: %PRIMARY_DIR%
for %%D in ("%PRIMARY_DIR%" "%FALLBACK_DIR%") do (
  if not defined CHOSEN_DIR (
    mkdir "%%~D" >nul 2>&1
    if exist "%%~D" (
      set "CHOSEN_DIR=%%~D"
    )
  )
)

if not defined CHOSEN_DIR (
  color 0E
  echo WARNING: No writable directory found.
  echo Primary attempted: %PRIMARY_DIR%
  echo Fallback attempted: %FALLBACK_DIR%
  echo [%date% %time%] No writable directory found. Primary: %PRIMARY_DIR%, Fallback: %FALLBACK_DIR% >> "%~dp0setup.log"
  set "LOG_FILE=%~dp0setup.log"
  set "HAS_ERROR=1"
  set "ERRORS=!ERRORS!- No writable directory found (Primary: %PRIMARY_DIR%, Fallback: %FALLBACK_DIR%).!nl!"
) else (
  set "MARKER_DIR=%CHOSEN_DIR%"
  if not "%MARKER_DIR:~-1%"=="\\" set "MARKER_DIR=%MARKER_DIR%\\"
  set "LOG_FILE=%MARKER_DIR%setup.log"
  echo Using directory: %MARKER_DIR%
)
echo Logs will be written to: %LOG_FILE%
echo.

REM Write marker files
if defined CHOSEN_DIR (
  echo Writing organization marker file...
  > "%MARKER_DIR%%ORG_ID%" (echo %ORG_ID%) 2>>"%LOG_FILE%"
  if errorlevel 1 (
    color 0E
    echo WARNING: Failed writing organization marker file to %MARKER_DIR%.
    echo [%date% %time%] Failed writing org marker file >> "%LOG_FILE%"
    set "HAS_ERROR=1"
    set "ERRORS=!ERRORS!- Failed writing organization marker file.!nl!"
  ) else (
    echo [OK] Organization marker file: %MARKER_DIR%%ORG_ID%
  )

  echo Writing employee marker file...
  > "%MARKER_DIR%%EMPLOYEE_ID%" (echo %EMPLOYEE_ID%) 2>>"%LOG_FILE%"
  if errorlevel 1 (
    color 0E
    echo WARNING: Failed writing employee marker file to %MARKER_DIR%.
    echo [%date% %time%] Failed writing employee marker file >> "%LOG_FILE%"
    set "HAS_ERROR=1"
    set "ERRORS=!ERRORS!- Failed writing employee marker file.!nl!"
  ) else (
    echo [OK] Employee marker file: %MARKER_DIR%%EMPLOYEE_ID%
  )
)

REM Set permissive read ACLs for SYSTEM and Administrators
if defined CHOSEN_DIR (
  echo Setting permissions on marker files...
  icacls "%MARKER_DIR%" /inheritance:e >nul 2>&1
  icacls "%MARKER_DIR%%ORG_ID%" /grant *S-1-5-18:R *S-1-5-32-544:R /T >nul 2>&1
  icacls "%MARKER_DIR%%EMPLOYEE_ID%" /grant *S-1-5-18:R *S-1-5-32-544:R /T >nul 2>&1
)

echo.
echo Writing registry entries (HKLM preferred)...
reg add "HKLM\SOFTWARE\CompAI\Device" /f >nul 2>&1
if %errorlevel%==0 (
  reg add "HKLM\SOFTWARE\CompAI\Device" /v OrgId /t REG_SZ /d "%ORG_ID" /f >nul 2>&1
  if errorlevel 1 (
    color 0E
    echo WARNING: Failed writing OrgId to HKLM.
    echo [%date% %time%] Failed writing OrgId to HKLM >> "%LOG_FILE%"
    set "HAS_ERROR=1"
    set "ERRORS=!ERRORS!- Failed writing OrgId to HKLM registry.!nl!"
  )
  reg add "HKLM\SOFTWARE\CompAI\Device" /v EmployeeId /t REG_SZ /d "%EMPLOYEE_ID%" /f >nul 2>&1
  if errorlevel 1 (
    color 0E
    echo WARNING: Failed writing EmployeeId to HKLM.
    echo [%date% %time%] Failed writing EmployeeId to HKLM >> "%LOG_FILE%"
    set "HAS_ERROR=1"
    set "ERRORS=!ERRORS!- Failed writing EmployeeId to HKLM registry.!nl!"
  )
) else (
  color 0E
  echo Could not write to HKLM (system-wide). Falling back to current user registry (HKCU).
  echo [%date% %time%] No admin registry access (HKLM). Falling back to HKCU. >> "%LOG_FILE%"
  reg add "HKCU\Software\CompAI\Device" /f >nul 2>&1
  reg add "HKCU\Software\CompAI\Device" /v OrgId /t REG_SZ /d "%ORG_ID%" /f >nul 2>&1
  if errorlevel 1 (
    color 0E
    echo WARNING: Failed writing OrgId to HKCU.
    echo [%date% %time%] Failed writing OrgId to HKCU >> "%LOG_FILE%"
    set "HAS_ERROR=1"
    set "ERRORS=!ERRORS!- Failed writing OrgId to HKCU registry.!nl!"
  )
  reg add "HKCU\Software\CompAI\Device" /v EmployeeId /t REG_SZ /d "%EMPLOYEE_ID%" /f >nul 2>&1
  if errorlevel 1 (
    color 0E
    echo WARNING: Failed writing EmployeeId to HKCU.
    echo [%date% %time%] Failed writing EmployeeId to HKCU >> "%LOG_FILE%"
    set "HAS_ERROR=1"
    set "ERRORS=!ERRORS!- Failed writing EmployeeId to HKCU registry.!nl!"
  )
)

echo.
echo Verifying markers...
if defined CHOSEN_DIR (
  if not exist "%MARKER_DIR%%EMPLOYEE_ID%" (
    color 0E
    echo WARNING: Employee marker file missing at %MARKER_DIR%%EMPLOYEE_ID%
    echo [%date% %time%] Verification failed: employee marker file missing >> "%LOG_FILE%"
    set "HAS_ERROR=1"
    set "ERRORS=!ERRORS!- Employee marker file missing at %CHOSEN_DIR%\%EMPLOYEE_ID%.!nl!"
  ) else (
    echo [OK] Employee marker file present.
  )
)
reg query "HKLM\SOFTWARE\CompAI\Device" /v EmployeeId | find "%EMPLOYEE_ID%" >nul 2>&1
if errorlevel 1 reg query "HKCU\Software\CompAI\Device" /v EmployeeId | find "%EMPLOYEE_ID%" >nul 2>&1
if errorlevel 1 (
  color 0E
  echo WARNING: Registry check failed: EmployeeId not found or mismatched in HKLM/HKCU.
  echo [%date% %time%] Warning: registry EmployeeId value not found or mismatched >> "%LOG_FILE%"
  set "HAS_ERROR=1"
  set "ERRORS=!ERRORS!- Registry EmployeeId not found or mismatched in HKLM/HKCU.!nl!"
) else (
  echo [OK] Registry value found for EmployeeId.
)

echo.
echo ------------------------------------------------------------
if "%HAS_ERROR%"=="0" (
  color 0A
  echo RESULT: SUCCESS
  echo Setup completed successfully for %EMPLOYEE_ID%.
  if defined CHOSEN_DIR echo Files created in: %CHOSEN_DIR%
  echo Log file: %LOG_FILE%
) else (
  color 0C
  echo RESULT: COMPLETED WITH ISSUES
  echo One or more steps did not complete successfully. Details:
  echo.
  echo !ERRORS!
  echo.
  echo Next steps:
  echo  - Take a screenshot of this window.
  echo  - Attach the log file from: %LOG_FILE%
  echo  - Share both with your CompAI support contact.
)
echo ------------------------------------------------------------
echo.
echo Press any key to close this window. This will not affect installation.
pause >nul
if "%HAS_ERROR%"=="0" (exit /b 0) else (exit /b 1)`;

  return script.replace(/\n/g, '\r\n');
}
