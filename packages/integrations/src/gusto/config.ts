import image from "./assets/image.png";
import { Logo } from "./assets/logo";

export default {
  name: "Gusto",
  id: "gusto-demo",
  active: true,
  logo: image,
  short_description:
    "Connect your Gusto account to Bubba to automate evidence collection for HR resources",
  description:
    "Integrating with Gusto allows you to automate evidence collection for employees, we'll run a daily read-only scan of your resources and store the results in Bubba.",
  images: [image],
  settings: [],
  config: {},
  category: "HR",
};
