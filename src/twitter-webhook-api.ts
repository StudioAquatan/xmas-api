import { UserModel } from './models/user';

interface WebhookResponse {
  id: string;
  url: string;
  valid: boolean;
}

type WebhookListResponse = Array<WebhookResponse>;

export const registerWebhook = async (user: UserModel, url: string) => {
  const client = user.getClient();
  const list = await client.v1.get<WebhookListResponse>(
    'account_activity/webhooks.json',
  );

  const hook = list.find((item) => item.url === url);
  if (hook) return hook.id;

  const response = await client.v1.post<WebhookResponse>(
    'account_activity/webhooks.json',
    {},
    { query: { url } },
  );

  return response.id;
};

export const subscribeWebhook = async (user: UserModel, hookId: string) => {
  const client = user.getClient();
  await client.v1.post(
    `account_activity/webhooks/${hookId}/subscriptions/all.json`,
  );
};
