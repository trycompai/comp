import image from "./assets/image.png";
import { Logo } from "./assets/logo";

export default {
  name: "GitHub",
  id: "github",
  active: true,
  logo: image,
  short_description:
    "Connect your GitHub account to Bubba to automate evidence collection for cloud resources",
  description:
    "Integrating with GitHub allows you to automate evidence collection for any GitHub repositories you may have, we'll run a daily read-only scan of your repositories and store the results in Bubba.",
  images: [image],
  settings: [
    {
      id: "api_key",
      label: "API Key",
      description: "The API key for your GitHub account",
      type: "text",
      required: false,
      value: "",
    },
  ],
  config: {},
  category: "Code",
};
