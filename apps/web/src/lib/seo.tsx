import type { Metadata } from "next";
import type { OpenGraph } from "next/dist/lib/metadata/types/opengraph-types";
import type { Twitter } from "next/dist/lib/metadata/types/twitter-types";
import type { StaticImageData } from "next/image";

const baseURL = "https://trycomp.ai";
const title = "Comp AI - Open Source Platform for SOC 2, ISO 27001 & GDPR";
const description =
  "The Open Source Drata & Vanta alternative that does everything you need to get compliant, fast. Get SOC 2, ISO 27001 and GDPR compliant in minutes.";

export const rootOpenGraph: OpenGraph = {
  locale: "en",
  type: "website",
  url: baseURL,
  siteName: "Comp AI",
  title,
  description,
};

export const rootTwitter: Twitter = {
  title,
  description,
  card: "summary_large_image",
  creator: "@trycompai",
  site: "@trycompai",
};

export const rootMetadata: Metadata = {
  metadataBase: new URL(baseURL),
  title,
  description,
  applicationName: "Comp AI",
  openGraph: rootOpenGraph,
  twitter: rootTwitter,
  robots:
    "follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large",
};

function getImage(
  image?: StaticImageData | string,
  alt?: string,
  width?: number,
  height?: number,
) {
  if (!image) {
    return null;
  }

  if (typeof image === "string") {
    return {
      url: image,
      alt,
      width,
      height,
      type: image.endsWith(".png") ? "image/png" : "image/jpeg",
    };
  }

  return {
    url: image.src,
    width: image.width,
    height: image.height,
    alt,
    type: image.src.endsWith(".png") ? "image/png" : "image/jpeg",
  };
}

export function generatePageMeta({
  title = rootMetadata.title as string,
  description = rootMetadata.description as string,
  url,
  image,
  image_alt,
  image_width,
  image_height,
  publishedAt,
  updatedAt,
  siteName = rootMetadata.applicationName as string,
  authors,
  noindex,
  locale = "en",
}: {
  title?: string;
  description?: string;
  url?: string;
  image?: StaticImageData | string;
  image_alt?: string;
  image_width?: number;
  image_height?: number;
  publishedAt?: string;
  updatedAt?: string;
  authors?: string[];
  siteName?: string;
  noindex?: boolean;
  locale?: string;
} = {}): Metadata {
  const metadata = {
    ...rootMetadata,
    title,
    description,
    alternates: {
      canonical: url,
    },
    authors: authors,
    openGraph: {
      ...rootOpenGraph,
      locale,
      url,
      title: title,
      description,
    } as OpenGraph,
    twitter: {
      ...rootTwitter,
      title: title,
      description,
    } as Twitter,
    publisher: siteName,
    other: {},
  } as Metadata;

  if (publishedAt) {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: "article",
      locale: locale,
      publishedTime: publishedAt,
      modifiedTime: updatedAt ?? publishedAt,
      authors: authors ?? [],
      section: siteName,
      tags: [siteName ?? "Comp AI"],
    };
  }

  const img = getImage(image, image_alt ?? title, image_width, image_height);
  const screenshot = {
    url: `${metadata.metadataBase}og.png`,
    width: 1200,
    height: 630,
    alt: title,
    type: "image/png",
  };
  metadata.openGraph!.images = img ? [img] : [screenshot];
  metadata.twitter!.images = img ? [img] : [screenshot];

  if (siteName) {
    metadata.applicationName = siteName;
    metadata.openGraph!.siteName = siteName;
  }

  if (noindex) {
    metadata.robots = {
      index: false,
      follow: true,
    };
  }

  return metadata;
}
