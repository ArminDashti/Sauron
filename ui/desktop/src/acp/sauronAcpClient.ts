import {
  client,
  methods,
  type Client,
  type ClientConnection,
  type Stream,
} from '@agentclientprotocol/sdk';
import {
  SAURON_EXT_AGENT_REQUESTS,
  SAURON_EXT_NOTIFICATIONS,
  SauronExtClient,
  type SauronSessionNotification_unstable,
  type ProviderDeviceCodeNotification_unstable,
  type RecipeParamsResponse_unstable,
  type RequestRecipeParams_unstable,
  zSauronSessionNotification_unstable,
  zProviderDeviceCodeNotification_unstable,
  zRequestRecipeParams_unstable,
} from '@aaif/sauron-acp-client';

const [sauronSessionUpdate, providerDeviceCode] = SAURON_EXT_NOTIFICATIONS;
const [sauronRecipeParamsRequest] = SAURON_EXT_AGENT_REQUESTS;

export type SauronAcpCallbacks = Required<
  Pick<Client, 'requestPermission' | 'sessionUpdate' | 'createElicitation'>
> & {
  unstable_sessionRecipeRequestParams: (
    request: RequestRecipeParams_unstable
  ) => Promise<RecipeParamsResponse_unstable>;
  unstable_sessionUpdate: (notification: SauronSessionNotification_unstable) => Promise<void>;
  unstable_providerDeviceCode: (
    notification: ProviderDeviceCodeNotification_unstable
  ) => Promise<void>;
};

export type SauronAcpClient = {
  connection: ClientConnection;
  sauron: SauronExtClient;
};

export function connectSauronAcpClient(
  stream: Stream,
  callbacks: SauronAcpCallbacks
): SauronAcpClient {
  const app = client({ name: 'sauron' })
    .onRequest(methods.client.session.requestPermission, (context) =>
      callbacks.requestPermission(context.params)
    )
    .onNotification(methods.client.session.update, (context) =>
      callbacks.sessionUpdate(context.params)
    )
    .onRequest(methods.client.elicitation.create, (context) =>
      callbacks.createElicitation(context.params)
    )
    .onRequest(sauronRecipeParamsRequest.method, zRequestRecipeParams_unstable, (context) =>
      callbacks.unstable_sessionRecipeRequestParams(context.params)
    )
    .onNotification(sauronSessionUpdate.method, zSauronSessionNotification_unstable, (context) =>
      callbacks.unstable_sessionUpdate(context.params)
    )
    .onNotification(
      providerDeviceCode.method,
      zProviderDeviceCodeNotification_unstable,
      (context) => callbacks.unstable_providerDeviceCode(context.params)
    );

  const connection = app.connect(stream);
  const sauron = new SauronExtClient(connection.agent);

  return { connection, sauron };
}
