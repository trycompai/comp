import axios from 'axios';

export async function fetcher(url: string) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch data');
  }
}
