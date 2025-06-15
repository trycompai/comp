import { Novu } from "@novu/node";
import axios from "axios";

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
};

type TriggerPayload = {
  name: TriggerEvents;
  payload: any;
  user: TriggerUser;
  replyTo?: string;
};

type GetSubscriberPreferencesParams = {
  organizationId: string;
  subscriberId: string;
};

type UpdateSubscriberPreferencesParams = {
  subscriberId: string;
  organizationId: string;
  templateId: string;
  type: string;
  enabled: boolean;
};

export async function trigger(data: TriggerPayload) {
  try {
    const subscriberId = data.user.subscriberId;

    await novu.trigger(data.name, {
      to: {
        subscriberId,
      },
      payload: data.payload,
    });
  } catch (error: any) {
    console.error("Novu trigger error:", {
      event: data.name,
      error: error.response?.data || error.message,
      status: error.response?.status,
    });

    throw error;
  }
}

export async function getSubscriberPreferences({
  organizationId,
  subscriberId,
}: GetSubscriberPreferencesParams) {
  try {
    const response = await axios.get(
      `${novu_api}/subscribers/${organizationId}_${subscriberId}/preferences?includeInactiveChannels=false`,
      {
        headers: {
          Authorization: `ApiKey ${process.env.NOVU_API_KEY!}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function updateSubscriberPreferences({
  subscriberId,
  organizationId,
  templateId,
  type,
  enabled,
}: UpdateSubscriberPreferencesParams) {
  try {
    const response = await axios.patch(
      `${novu_api}/subscribers/${organizationId}_${subscriberId}/preferences/${templateId}`,
      {
        channel: {
          type,
          enabled,
        },
      },
      {
        headers: {
          Authorization: `ApiKey ${process.env.NOVU_API_KEY!}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    console.log(error);
    return null;
  }
}
