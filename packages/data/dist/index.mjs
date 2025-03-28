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
export {
  frameworks_default as frameworks,
  trainingVideos
};
