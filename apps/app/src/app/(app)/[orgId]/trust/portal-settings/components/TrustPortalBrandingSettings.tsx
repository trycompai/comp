'use client';

import { useEffect, useState } from 'react';
import { BrandSettings } from './BrandSettings';
import { UpdateTrustFavicon } from './UpdateTrustFavicon';

interface TrustPortalBrandingSettingsProps {
  enabled: boolean;
  primaryColor: string | null;
  faviconUrl: string | null;
}

export function TrustPortalBrandingSettings({
  enabled,
  primaryColor,
  faviconUrl,
}: TrustPortalBrandingSettingsProps) {
  const [currentPrimaryColor, setCurrentPrimaryColor] = useState(primaryColor);
  const [currentFaviconUrl, setCurrentFaviconUrl] = useState(faviconUrl);

  useEffect(() => {
    setCurrentPrimaryColor(primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    setCurrentFaviconUrl(faviconUrl);
  }, [faviconUrl]);

  return (
    <div className="space-y-6">
      <UpdateTrustFavicon
        currentFaviconUrl={currentFaviconUrl}
        onFaviconChange={setCurrentFaviconUrl}
      />
      <BrandSettings
        enabled={enabled}
        primaryColor={currentPrimaryColor}
        onPrimaryColorChange={setCurrentPrimaryColor}
      />
    </div>
  );
}
