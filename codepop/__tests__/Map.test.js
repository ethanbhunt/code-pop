import React from 'react';
import { render } from '@testing-library/react-native';

import GeoMap from '../src/components/map';

describe('GeoMap', () => {
  const originalToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    } else {
      process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = originalToken;
    }
  });

  it('shows a fallback when the Mapbox token is missing', () => {
    delete process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

    const { getByText } = render(<GeoMap title="Code Pop" />);

    expect(getByText('Map unavailable')).toBeTruthy();
    expect(getByText('Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to enable the Mapbox map.')).toBeTruthy();
  });

  it('renders a Mapbox image url when configured', () => {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = 'test-token';

    const { getByLabelText } = render(
      <GeoMap
        title="Code Pop"
        latitude={41.7}
        longitude={-111.8}
        userLatitude={41.8}
        userLongitude={-111.7}
      />
    );

    const image = getByLabelText('Code Pop map');
    expect(image.props.source.uri).toContain('mapbox.com/styles/v1/mapbox/streets-v12/static/');
    expect(image.props.source.uri).toContain('pin-s-1F7A8C(-111.8,41.7)');
    expect(image.props.source.uri).toContain('pin-s-F9A826(-111.7,41.8)');
    expect(image.props.source.uri).toContain('access_token=test-token');
  });
});
