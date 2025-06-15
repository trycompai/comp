import { env } from "@/env.mjs";
import axios from "axios";

export const fleet = axios.create({
  baseURL: `${env.FLEET_URL}/api/v1/fleet`,
  headers: { Authorization: `Bearer ${env.FLEET_TOKEN}` },
});
