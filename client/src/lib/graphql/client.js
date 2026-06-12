import { ApolloClient, ApolloLink, concat, createHttpLink, InMemoryCache, split } from '@apollo/client';
import { getAccessToken } from '../auth';
import {GraphQLWsLink} from '@apollo/client/link/subscriptions';
import {createClient} from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities';
import { Kind, OperationTypeNode } from 'graphql';

const httpLink = createHttpLink({ uri: 'http://localhost:9000/graphql' });

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:9000/graphql',
    connectionParams: ()=>({accessToken: getAccessToken()}),
  })
);

const authLink = new ApolloLink((operation, forward) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    operation.setContext({
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
  }
  return forward(operation);
});


const authenticatedHttpLink = concat(authLink, httpLink);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);

    return (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === OperationTypeNode.SUBSCRIPTION
    );
  },
  wsLink,                // subscriptions
  authenticatedHttpLink  // queries & mutations
);
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
