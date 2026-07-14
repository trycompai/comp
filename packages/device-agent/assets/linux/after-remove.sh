#!/bin/bash
# Remove per-user app data on uninstall (not on upgrade), so a stale device-linking
# auth token doesn't survive a reinstall and silently skip the sign-in screen.
ACTION="$1"

case "$ACTION" in
  remove|purge)
    for home in /root /home/*; do
      [ -d "$home" ] || continue
      config_dir="$home/.config/comp-ai-device-agent"
      if [ -d "$config_dir" ]; then
        rm -rf "$config_dir"
      fi
    done
    ;;
esac

exit 0
