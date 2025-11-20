"use client";

import { useEffect } from "react";
import { trackEvent } from "@/utils/tracking";

export function UpgradePageTracking() {
  useEffect(() => {
    // Track upgrade page view
    trackEvent("upgrade_started", {
      event_category: "ecommerce",
      event_label: "pricing_page_viewed",
    });
  }, []);

  return null;
}
