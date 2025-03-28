declare const trainingVideos: {
    id: string;
    title: string;
    description: string;
    youtubeId: string;
    url: string;
}[];

interface Framework {
    name: string;
    version: string;
    description: string;
}
interface Frameworks {
    soc2: Framework;
    iso27001: Framework;
    gdpr: Framework;
}
declare const frameworks: Frameworks;

export { type Framework, type Frameworks, frameworks, trainingVideos };
