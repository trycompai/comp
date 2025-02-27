import image from "./assets/image.png";
import { Logo } from "./assets/logo";

export default {
  name: "AWS",
  id: "aws",
  active: true,
  logo: Logo,
  short_description:
    "Connect your AWS account to Comp AI to automate evidence collection for cloud resources",
  description:
    "Integrating with AWS allows you to automate evidence collection. This compliance analysis tool enables organizations to more quickly articulate their compliance posture and also generate supporting evidence artifacts",
  images: [image],
  settings: [
    {
      id: "access_key_id",
      label: "AWS access key ID",
      description: "The API access key ID for your AWS account",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "secret_access_key",
      label: "AWS secret access key",
      description: "The API secret access key for your AWS account",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "session_token",
      label: "AWS session token",
      description: "The API session token AWS account",
      type: "text",
      required: true,
      value: "",
    },
  ],
  config: {},
  category: "Cloud"
};
