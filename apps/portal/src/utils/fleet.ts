'use server';

import axios from 'axios';

export const getFleetInstance = async () => {
  const fleet = axios.create({
    baseURL: `${process.env.FLEET_URL}/api/v1/fleet`,
    headers: { Authorization: `Bearer ${process.env.FLEET_TOKEN}` },
  });

  return fleet;
};
