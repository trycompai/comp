import type { ScriptConfig } from './types';

export function generateWindowsScript(config: ScriptConfig): string {
  const { orgId, employeeId, fleetDevicePath } = config;

  const script = `@echo off
title CompAI Device Setup
setlocal EnableExtensions EnableDelayedExpansion
color 0A

REM =========================
REM Variables
REM =========================
set "ORG_ID=${orgId}"
set "EMPLOYEE_ID=${employeeId}"
set "PRIMARY_DIR=${fleetDevicePath}"
set "FALLBACK_DIR=C:\\Users\\Public\\CompAI\\Fleet"
set "CHOSEN_DIR="
set "LOG_FILE="
set "HAS_ERROR=0"
set "ERRORS="
set "EXIT_CODE=0"
REM newline token (exactly this 2-line shape)
set "nl=^
"

REM --- bootstrap log (updated once CHOSEN_DIR is known) ---
set "LOG_FILE=%~dp0setup.log"

goto :main

REM =======================================================
REM Subroutines (placed AFTER main to avoid early execution)
REM =======================================================
:log_msg
setlocal EnableDelayedExpansion
set "msg=%~1"
echo [%date% %time%] !msg!
>>"%LOG_FILE%" echo [%date% %time%] !msg!
endlocal & exit /b 0

:log_run
setlocal EnableDelayedExpansion
set "cmdline=%*"
echo [%date% %time%] CMD: !cmdline!
>>"%LOG_FILE%" echo [%date% %time%] CMD: !cmdline!
%*
set "rc=!errorlevel!"
if not "!rc!"=="0" (
  echo [%date% %time%] ERR !rc!: !cmdline!
  >>"%LOG_FILE%" echo [%date% %time%] ERR !rc!: !cmdline!
)
endlocal & set "LAST_RC=%rc%"
exit /b %LAST_RC%

REM =========================
REM Main
REM =========================
:main
call :log_msg "Script starting"

REM Admin check
whoami /groups | find "S-1-16-12288" >nul 2>&1
if errorlevel 1 (
  color 0E
  echo This script must be run as Administrator.
  echo Please right-click the file and select "Run as administrator".
  echo.
  echo Press any key to exit, then try again with Administrator privileges.
  pause
  exit /b 5
)

REM Relaunch persistent window
if not "%PERSIST%"=="1" (
  set "PERSIST=1"
  call :log_msg "Re-launching in a persistent window"
  start "CompAI Device Setup" cmd /k "%~f0 %*"
  exit /b
)

call :log_msg "Running with administrator privileges"
call :log_msg "Current directory: %cd%"
call :log_msg "Script path: %~f0"
call :log_msg "Switching working directory to script folder"
cd /d "%~dp0"
call :log_msg "New current directory: %cd%"
echo.

REM Choose writable directory
call :log_msg "Choosing destination directory; primary=%PRIMARY_DIR% fallback=%FALLBACK_DIR%"
if exist "%PRIMARY_DIR%\\*" set "CHOSEN_DIR=%PRIMARY_DIR%"
if not defined CHOSEN_DIR call :log_run mkdir "%PRIMARY_DIR%"
if not defined CHOSEN_DIR if exist "%PRIMARY_DIR%\\*" set "CHOSEN_DIR=%PRIMARY_DIR%"

if not defined CHOSEN_DIR call :log_msg "Primary not available; trying fallback"
if not defined CHOSEN_DIR if exist "%FALLBACK_DIR%\\*" set "CHOSEN_DIR=%FALLBACK_DIR%"
if not defined CHOSEN_DIR call :log_run mkdir "%FALLBACK_DIR%"
if not defined CHOSEN_DIR if exist "%FALLBACK_DIR%\\*" set "CHOSEN_DIR=%FALLBACK_DIR%"

if not defined CHOSEN_DIR (
  color 0E
  call :log_msg "WARNING: No writable directory found"
  echo Primary attempted: "%PRIMARY_DIR%"
  echo Fallback attempted: "%FALLBACK_DIR%"
  echo [%date% %time%] No writable directory found. Primary: %PRIMARY_DIR%, Fallback: %FALLBACK_DIR% >> "%~dp0setup.log"
  set "LOG_FILE=%~dp0setup.log"
  set "HAS_ERROR=1"
  set "ERRORS=!ERRORS!- No writable directory found (Primary: %PRIMARY_DIR%, Fallback: %FALLBACK_DIR%).!nl!"
  set "EXIT_CODE=1"
) else (
  set "MARKER_DIR=%CHOSEN_DIR%"
  if not "!MARKER_DIR:~-1!"=="\\" set "MARKER_DIR=!MARKER_DIR!\\"

  REM switch the log file to the chosen directory, carry over bootstrap logs
  set "FINAL_LOG=!MARKER_DIR!setup.log"
  if /i not "%LOG_FILE%"=="%FINAL_LOG%" (
    call :log_msg "Switching log to !FINAL_LOG!"
    if exist "%LOG_FILE%" type "%LOG_FILE%" >> "!FINAL_LOG!" & del "%LOG_FILE%"
    set "LOG_FILE=!FINAL_LOG!"
  )
  call :log_msg "Using directory: !MARKER_DIR!"
)
echo Logs will be written to: !LOG_FILE!
echo.

REM Write marker files
if defined CHOSEN_DIR (
  call :log_msg "Writing organization marker file"
  call :log_msg "Preparing to write org marker to !MARKER_DIR!!ORG_ID!"
  call :log_run cmd /c "(echo %ORG_ID%) > \"!MARKER_DIR!!ORG_ID!\""
  if errorlevel 1 (
    color 0E
    call :log_msg "WARNING: Failed writing organization marker file to !MARKER_DIR!"
    echo [%date% %time%] Failed writing org marker file >> "%LOG_FILE%"
    set "HAS_ERROR=1"
    set "ERRORS=!ERRORS!- Failed writing organization marker file.!nl!"
    set "EXIT_CODE=1"
  ) else (
    call :log_msg "[OK] Organization marker file: !MARKER_DIR!!ORG_ID!"
  )

  call :log_msg "Writing employee marker file"
  call :log_msg "Preparing to write employee marker to !MARKER_DIR!!EMPLOYEE_ID!"
  call :log_run cmd /c "(echo %EMPLOYEE_ID%) > \"!MARKER_DIR!!EMPLOYEE_ID!\""
  if errorlevel 1 (
    color 0E
    call :log_msg "WARNING: Failed writing employee marker file to !MARKER_DIR!"
    echo [%date% %time%] Failed writing employee marker file >> "%LOG_FILE%"
    set "HAS_ERROR=1"
    set "ERRORS=!ERRORS!- Failed writing employee marker file.!nl!"
    set "EXIT_CODE=1"
  ) else (
    call :log_msg "[OK] Employee marker file: !MARKER_DIR!!EMPLOYEE_ID!"
  )
)

REM Permissions
if defined CHOSEN_DIR (
  call :log_msg "Setting permissions on marker directory"
  call :log_run icacls "!MARKER_DIR!" /inheritance:e

  call :log_msg "Granting read to SYSTEM and Administrators on org marker"
  call :log_run icacls "!MARKER_DIR!!ORG_ID!" /grant *S-1-5-18:R *S-1-5-32-544:R

  call :log_msg "Granting read to SYSTEM and Administrators on employee marker"
  call :log_run icacls "!MARKER_DIR!!EMPLOYEE_ID!" /grant *S-1-5-18:R *S-1-5-32-544:R
)

REM Verify
echo.
echo Verifying markers...
if defined CHOSEN_DIR (
  call :log_msg "Verifying marker exists: !MARKER_DIR!!EMPLOYEE_ID!"
  if not exist "!MARKER_DIR!!EMPLOYEE_ID!" (
    color 0E
    call :log_msg "WARNING: Employee marker file missing at !MARKER_DIR!!EMPLOYEE_ID!"
    echo [%date% %time%] Verification failed: employee marker file missing >> "!LOG_FILE!"
    set "HAS_ERROR=1"
    set "ERRORS=!ERRORS!- Employee marker file missing at !MARKER_DIR!!EMPLOYEE_ID!!.!nl!"
    set "EXIT_CODE=2"
  ) else (
    call :log_msg "[OK] Employee marker file present: !MARKER_DIR!!EMPLOYEE_ID!"
  )
)
rem Skipping registry checks per request

REM Result / Exit
echo.
echo ------------------------------------------------------------
if "%HAS_ERROR%"=="0" (
  color 0A
  echo RESULT: SUCCESS
  echo Setup completed successfully for %EMPLOYEE_ID%.
  if defined CHOSEN_DIR echo Files created in: !CHOSEN_DIR!
  echo Log file: !LOG_FILE!
  call :log_msg "RESULT: SUCCESS"
) else (
  color 0C
  echo RESULT: COMPLETED WITH ISSUES
  echo One or more steps did not complete successfully. Details:
  echo.
  echo !ERRORS!
  echo.
  echo Next steps:
  echo  - Take a screenshot of this window.
  echo  - Attach the log file from: !LOG_FILE!
  echo  - Share both with your CompAI support contact.
  call :log_msg "RESULT: COMPLETED WITH ISSUES (exit=%EXIT_CODE%)"
)
echo ------------------------------------------------------------
echo.
echo Press any key to close this window. This will not affect installation.
pause
if "%HAS_ERROR%"=="0" (exit /b 0) else (exit /b %EXIT_CODE%)

REM End of main
goto :eof
`;

  return script.replace(/\n/g, '\r\n');
}
