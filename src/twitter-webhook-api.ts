import { TwitterApi } from 'twitter-api-v2';
import { config } from './config';
import { UserModel } from './models/user';

interface WebhookResponse {
  id: string;
  url: string;
  valid: boolean;
}

type WebhookListResponse = Array<WebhookResponse>;

export const getWebhookList = async (envName: string) => {
  const bearerClient = new TwitterApi(config.twitter.bearerToken);
  const list = await bearerClient.v1.get<WebhookListResponse>(
    `account_activity/all/${envName}/webhooks.json`,
  );

  return list;
};

export const registerWebhook = async (
  user: UserModel,
  envName: string,
  url: string,
) => {
  const client = user.getClient();
  const list = await getWebhookList(envName);

  const hook = list.find((item) => item.url === url);
  if (hook) return hook.id;

  // Due to limited plan, remove previous webhook first
  for (const { id } of list) {
    await unsubscribeWebhook(user, envName, id);
  }

  const response = await client.v1.post<WebhookResponse>(
    `account_activity/all/${envName}/webhooks.json`,
    { url },
  );

  return response.id;
};

export const subscribeWebhook = async (user: UserModel, envName: string) => {
  const client = user.getClient();
  await client.v1.post(`account_activity/all/${envName}/subscriptions.json`);
};

export const unsubscribeWebhook = async (
  user: UserModel,
  envName: string,
  webhookId: string,
) => {
  const client = user.getClient();
  await client.v1.delete(
    `account_activity/all/${envName}/webhooks/${webhookId}.json`,
  );
};
