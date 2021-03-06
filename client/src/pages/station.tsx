import React from 'react';
import { useParams } from 'react-router';
import { Layout } from 'containers/layout';
import { useInterval } from 'hooks/use-interval';
import { StationContext, StationLayout, useStationContextStateProvider } from 'modules/station';
import {
  useCurrentUserQuery,
  useJoinStationMutation,
  useOnStationChangedSubscription,
  useStationQuery,
} from 'operations';

interface RouteParams {
  slug: string;
}

const Station: React.FC = () => {
  const contextState = useStationContextStateProvider();

  const params = useParams<RouteParams>();
  const currentUserQuery = useCurrentUserQuery();
  const [joinStation] = useJoinStationMutation();

  const { data, refetch } = useStationQuery({ variables: { slug: params.slug } });

  useOnStationChangedSubscription({
    variables: { where: { slug: params.slug } },
    onSubscriptionData: ({ subscriptionData: { data } }) => {
      if (!data) return;
      const { onStationChanged } = data;
      if (!onStationChanged) return;
      refetch();
    },
  });

  React.useEffect(() => {
    if (data && currentUserQuery.data && !data.station.onlineUserIds.includes(currentUserQuery.data.user.id)) {
      joinStation({ variables: { where: { slug: params.slug } } });
    }
  }, [data, currentUserQuery.data, joinStation, params]);

  useInterval(() => {
    if (currentUserQuery.data) joinStation({ variables: { where: { slug: params.slug } } });
  }, parseInt(process.env.REACT_APP_JOIN_STATION_INTERVAL));

  return (
    <StationContext.Provider value={contextState}>
      <Layout drawer={contextState.drawer}>
        <StationLayout />
      </Layout>
    </StationContext.Provider>
  );
};

export default Station;
