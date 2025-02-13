import { Novu } from "@novu/node";
import ky from "ky";

const novu = new Novu(process.env.NOVU_API_KEY!);
const novu_api = "https://api.novu.co/v1";

export enum TriggerEvents {
  TaskReminderInApp = "task-reminder-inapp",
  TaskReminderEmail = "task-reminder-email",
}

export enum NotificationTypes {
  Task = "task",
}

type TriggerUser = {
  subscriberId: string;
  email: string;
  fullName?: string | null;
  image?: string | null;
  organizationId: string;
}

type TriggerPayload = {
  name: TriggerEvents;
  payload: any;
  user: TriggerUser;
  replyTo?: string;
}

type GetSubscriberPreferencesParams = {
  organizationId: string;
  subscriberId: string;
}

type UpdateSubscriberPreferencesParams = {
  subscriberId: string;
  organizationId: string;
  templateId: string;
  type: string;
  enabled: boolean;
}

export async function trigger(data: TriggerPayload) {
  try {
    const subscriberId = data.user.subscriberId;

    await novu.trigger(data.name, {
      to: {
        subscriberId
      },
      payload: data.payload,
    });
  } catch (error: any) {
    console.error('Novu trigger error:', {
      event: data.name,
      error: error.response?.data || error.message,
      status: error.response?.status
    });

    throw error;
  }
}

export async function getSubscriberPreferences({ organizationId, subscriberId }: GetSubscriberPreferencesParams) {
  try {
    const response = await ky.get(`${novu_api}/subscribers/${organizationId}_${subscriberId}/preferences?includeInactiveChannels=false`, {
      method: "GET",
      headers: {
        Authorization: `ApiKey ${process.env.NOVU_API_KEY!}`,
      },
    })

    return response.json();
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function updateSubscriberPreferences({ subscriberId, organizationId, templateId, type, enabled }: UpdateSubscriberPreferencesParams) {
  try {
    const response = await ky.patch(`${novu_api}/subscribers/${organizationId}_${subscriberId}/preferences/${templateId}`, {
      method: "PATCH",
      headers: {
        Authorization: `ApiKey ${process.env.NOVU_API_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: {
          type,
          enabled,
        },
      }),
    })

    return response.json();
  } catch (error) {
    console.log(error);
    return null;
  }
}