'use client';
import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { ApolloProvider as BaseApolloProvider } from '@apollo/client/react';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { nhost } from './nhost';
import React, { useMemo } from 'react';

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => {
    const httpLink = createHttpLink({
      uri: nhost.graphql.httpUrl,
    });

    const authLink = setContext(async (_, { headers }) => {
      const token = nhost.auth.getAccessToken();
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : '',
        }
      };
    });

    const wsLink = typeof window !== 'undefined'
      ? new GraphQLWsLink(
          createClient({
            url: nhost.graphql.wsUrl,
            connectionParams: () => {
              const token = nhost.auth.getAccessToken();
              return {
                headers: {
                  authorization: token ? `Bearer ${token}` : '',
                },
              };
            },
          })
        )
      : null;

    const splitLink = typeof window !== 'undefined' && wsLink != null
      ? split(
          ({ query }) => {
            const definition = getMainDefinition(query);
            return (
              definition.kind === 'OperationDefinition' &&
              definition.operation === 'subscription'
            );
          },
          wsLink,
          authLink.concat(httpLink)
        )
      : authLink.concat(httpLink);

    return new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache(),
    });
  }, []);

  return <BaseApolloProvider client={client}>{children}</BaseApolloProvider>;
}
