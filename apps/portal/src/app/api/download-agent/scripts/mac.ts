import type { ScriptConfig } from '../types';

export function generateMacScript(config: ScriptConfig): string {
  const { orgId, employeeId, fleetDevicePath } = config;

  return `#!/bin/bash
# CompAI Device Setup (macOS)
# Creates organization markers for Fleet policies/labels with clear, human-readable output

set -uo pipefail

ORG_ID="${orgId}"
EMPLOYEE_ID="${employeeId}"
FLEET_DIR="${fleetDevicePath}"
LOG_FILE="/tmp/compai-setup.log"
HAS_ERROR=0
ERROR_TEXT=""

# Colors (ANSI escapes)
NC='\x1b[0m'
GREEN='\x1b[0;32m'
YELLOW='\x1b[0;33m'
RED='\x1b[0;31m'
BOLD='\x1b[1m'

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }
log_info()  { printf "[%s] %bINFO%b  %s\n" "$(timestamp)" "$GREEN" "$NC" "$1" | tee -a "$LOG_FILE"; }
log_warn()  { printf "[%s] %bWARN%b  %s\n" "$(timestamp)" "$YELLOW" "$NC" "$1" | tee -a "$LOG_FILE"; }
log_error() { printf "[%s] %bERROR%b %s\n" "$(timestamp)" "$RED" "$NC" "$1" | tee -a "$LOG_FILE"; HAS_ERROR=1; ERROR_TEXT+=" - $1"$'\n'; }

echo "------------------------------------------------------------"
printf "%b\n" "$BOLD CompAI Device Setup (macOS)$NC"
echo "Organization: $ORG_ID"
echo "Employee: $EMPLOYEE_ID"
echo "Date: $(timestamp)"
echo "Log file: $LOG_FILE"
echo "------------------------------------------------------------"
echo

# Determine if we need sudo for the fleet directory
SUDO=""
if [ ! -d "$FLEET_DIR" ]; then
  log_info "Creating directory: $FLEET_DIR"
  if mkdir -p "$FLEET_DIR" 2>>"$LOG_FILE"; then
    :
  else
    log_warn "No write access creating $FLEET_DIR; retrying with sudo (you may be prompted for your password)."
    if sudo mkdir -p "$FLEET_DIR" 2>>"$LOG_FILE"; then
      SUDO="sudo"
    else
      log_error "Failed to create directory $FLEET_DIR even with sudo."
    fi
  fi
fi

if [ -d "$FLEET_DIR" ] && [ ! -w "$FLEET_DIR" ]; then
  SUDO="sudo"
fi

if [ -z "$SUDO" ]; then
  log_info "Using directory: $FLEET_DIR (no sudo needed)"
else
  log_info "Using directory: $FLEET_DIR (sudo required)"
fi

# Write marker files
if [ -d "$FLEET_DIR" ]; then
  log_info "Writing organization marker file..."
  if printf "%s" "$ORG_ID" | $SUDO tee "$FLEET_DIR/$ORG_ID" >/dev/null 2>>"$LOG_FILE"; then
    log_info "[OK] Organization marker: $FLEET_DIR/$ORG_ID"
  else
    log_error "Failed writing organization marker to $FLEET_DIR/$ORG_ID"
  fi

  log_info "Writing employee marker file..."
  if printf "%s" "$EMPLOYEE_ID" | $SUDO tee "$FLEET_DIR/$EMPLOYEE_ID" >/dev/null 2>>"$LOG_FILE"; then
    log_info "[OK] Employee marker: $FLEET_DIR/$EMPLOYEE_ID"
  else
    log_error "Failed writing employee marker to $FLEET_DIR/$EMPLOYEE_ID"
  fi

  # Permissions
  $SUDO chmod 755 "$FLEET_DIR" 2>>"$LOG_FILE" || log_warn "Could not chmod 755 on $FLEET_DIR"
  $SUDO chmod 644 "$FLEET_DIR/$ORG_ID" 2>>"$LOG_FILE" || log_warn "Could not chmod 644 on $FLEET_DIR/$ORG_ID"
  $SUDO chmod 644 "$FLEET_DIR/$EMPLOYEE_ID" 2>>"$LOG_FILE" || log_warn "Could not chmod 644 on $FLEET_DIR/$EMPLOYEE_ID"
else
  log_error "Directory not available: $FLEET_DIR"
fi

# Verify markers
echo
log_info "Verifying markers..."
if [ -f "$FLEET_DIR/$EMPLOYEE_ID" ]; then
  log_info "[OK] Employee marker file present."
else
  log_error "Employee marker file missing at $FLEET_DIR/$EMPLOYEE_ID"
fi

# Summary
echo
echo "------------------------------------------------------------"
if [ "$HAS_ERROR" -eq 0 ]; then
  printf "%b\n" "$GREEN RESULT: SUCCESS $NC"
  echo "Setup completed successfully for $EMPLOYEE_ID."
  echo "Files created in: $FLEET_DIR"
else
  printf "%b\n" "$RED RESULT: COMPLETED WITH ISSUES $NC"
  echo "One or more steps did not complete successfully. Details:"
  printf "%b" "$ERROR_TEXT"
  echo
  echo "Next steps:"
  echo " - Take a screenshot of this window."
  echo " - Attach the log file from: $LOG_FILE"
  echo " - Share both with your CompAI support contact."
fi
echo "------------------------------------------------------------"
echo
read -r -p "Press Return to close this window..." _
exit $HAS_ERROR`;
}
