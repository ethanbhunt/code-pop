import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const defaultStoreLocation = {
    latitude: 41.7421007,
    longitude: -111.8070335,
};

function buildMarker(color, longitude, latitude) {
    return `pin-s-${color}(${longitude},${latitude})`;
}

function buildMapboxStaticUrl({ storeLatitude, storeLongitude, userLatitude, userLongitude }) {
    const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) return null;

    const overlays = [];
    overlays.push(buildMarker('1F7A8C', storeLongitude, storeLatitude));

    if (typeof userLatitude === 'number' && typeof userLongitude === 'number') {
        overlays.push(buildMarker('F9A826', userLongitude, userLatitude));
    }

    const centerLatitude =
        typeof userLatitude === 'number'
            ? (storeLatitude + userLatitude) / 2
            : storeLatitude;
    const centerLongitude =
        typeof userLongitude === 'number'
            ? (storeLongitude + userLongitude) / 2
            : storeLongitude;

    const path = overlays.join(',');
    const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${path}/${centerLongitude},${centerLatitude},14/900x520@2x?access_token=${token}`;
    return encodeURI(url);
}

const GeoMap = ({
    latitude,
    longitude,
    userLatitude,
    userLongitude,
    title = 'Code Pop',
    description = 'Store location',
}) => {
    const storeLatitude = typeof latitude === 'number' ? latitude : defaultStoreLocation.latitude;
    const storeLongitude = typeof longitude === 'number' ? longitude : defaultStoreLocation.longitude;
    const mapUrl = buildMapboxStaticUrl({
        storeLatitude,
        storeLongitude,
        userLatitude,
        userLongitude,
    });

    if (!mapUrl) {
        return (
            <View style={styles.placeholder}>
                <Text style={styles.placeholderTitle}>Map unavailable</Text>
                <Text style={styles.placeholderText}>
                    Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to enable the Mapbox map.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Image
                source={{ uri: mapUrl }}
                accessibilityLabel={`${title} map`}
                style={styles.map}
                resizeMode="cover"
            />
            <View style={styles.caption}>
                <Text style={styles.captionTitle}>{title}</Text>
                <Text style={styles.captionText}>{description}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 15,
        overflow: 'hidden',
        backgroundColor: '#e9f2f7',
    },
    map: {
        width: '100%',
        height: 260,
    },
    caption: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#ffffff',
    },
    captionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1c334d',
    },
    captionText: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '600',
        color: '#49627d',
    },
    placeholder: {
        width: '100%',
        minHeight: 260,
        borderRadius: 15,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f7fa',
    },
    placeholderTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1c334d',
    },
    placeholderText: {
        marginTop: 8,
        fontSize: 13,
        fontWeight: '600',
        color: '#49627d',
        textAlign: 'center',
    },
});

export default GeoMap;
  