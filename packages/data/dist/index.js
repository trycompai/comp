"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  frameworks: () => frameworks_default,
  trainingVideos: () => trainingVideos
});
module.exports = __toCommonJS(index_exports);

// src/videos/trainingVideos.ts
var trainingVideos = [
  {
    id: "sat-1",
    title: "Security Awareness Training - Part 1",
    description: "Security Awareness Training - Part 1",
    youtubeId: "N-sBS3uCWB4",
    url: "https://www.youtube.com/watch?v=N-sBS3uCWB4"
  },
  {
    id: "sat-2",
    title: "Security Awareness Training - Part 2",
    description: "Security Awareness Training - Part 2",
    youtubeId: "JwQNwhDyXig",
    url: "https://www.youtube.com/watch?v=JwQNwhDyXig"
  },
  {
    id: "sat-3",
    title: "Security Awareness Training - Part 3",
    description: "Security Awareness Training - Part 3",
    youtubeId: "fzMNw_-KEGE",
    url: "https://www.youtube.com/watch?v=fzMNw_-KEGE"
  },
  {
    id: "sat-4",
    title: "Security Awareness Training - Part 4",
    description: "Security Awareness Training - Part 4",
    youtubeId: "WbpqjH9kI2Y",
    url: "https://www.youtube.com/watch?v=WbpqjH9kI2Y"
  },
  {
    id: "sat-5",
    title: "Security Awareness Training - Part 5",
    description: "Security Awareness Training - Part 5",
    youtubeId: "Clvfkm6azDs",
    url: "https://www.youtube.com/watch?v=Clvfkm6azDs"
  }
];

// src/frameworks.ts
var frameworks = {
  soc2: {
    name: "SOC 2",
    version: "2025",
    description: "SOC 2 is a framework for assessing the security and reliability of information systems."
  },
  iso27001: {
    name: "ISO 27001",
    version: "2025",
    description: "ISO 27001 is a framework for assessing the security and reliability of information systems."
  },
  gdpr: {
    name: "GDPR",
    version: "2025",
    description: "GDPR is a framework for assessing the security and reliability of information systems."
  }
};
var frameworks_default = frameworks;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  frameworks,
  trainingVideos
});
