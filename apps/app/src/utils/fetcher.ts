import axios from 'axios';

export async function fetcher(url: string, t: (content: string) => string) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error(t('Failed to fetch data'));
  }
}
