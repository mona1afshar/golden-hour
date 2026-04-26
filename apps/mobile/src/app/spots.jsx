import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Compass,
  Mountain,
  Building2,
  Star,
  MapPin,
  RefreshCw,
} from "lucide-react-native";
import { fetchSpots as fetchSpotsData } from "@/utils/api";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Dark map style matching the app theme
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8aaa" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#2a2a4a" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2d2d48" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#38385c" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#484870" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0d1b2e" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1e1e35" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0d2318" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1e1e38" }],
  },
];

function scoreToColor(score) {
  if (score >= 80) return "#FF5F1F";
  if (score >= 65) return "#FF8C42";
  if (score >= 50) return "#FFB347";
  if (score >= 35) return "#C8A2C8";
  return "#708090";
}

function obstructionColor(level) {
  switch (level) {
    case "None":
      return "#4ADE80";
    case "Low":
      return "#86EFAC";
    case "Moderate":
      return "#FCD34D";
    case "High":
      return "#F87171";
    default:
      return "#94A3B8";
  }
}

function westFacingColor(label) {
  if (label === "Yes") return "#FF8C42";
  if (label === "Partial") return "#FCD34D";
  return "#94A3B8";
}

function elevationColor(label) {
  if (label === "High") return "#C084FC";
  if (label === "Mid") return "#818CF8";
  return "#94A3B8";
}

// Custom marker component rendered on the map
function SpotMarker({ spot, selected }) {
  const color = scoreToColor(spot.sunsetScore);
  const scale = selected ? 1.25 : 1;
  return (
    <View style={{ alignItems: "center", transform: [{ scale }] }}>
      <View
        style={{
          backgroundColor: color,
          borderRadius: 22,
          width: selected ? 44 : 36,
          height: selected ? 44 : 36,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2.5,
          borderColor: "#fff",
          shadowColor: color,
          shadowOpacity: 0.8,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "900",
            fontSize: selected ? 14 : 12,
          }}
        >
          {spot.sunsetScore}
        </Text>
      </View>
      {/* Pin tail */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 5,
          borderRightWidth: 5,
          borderTopWidth: 7,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: color,
          marginTop: -1,
        }}
      />
    </View>
  );
}

// Info badge for spot details
function InfoBadge({ icon: Icon, label, value, color }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.07)",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
      }}
    >
      <Icon size={13} color={color || "rgba(255,180,100,0.9)"} />
      <View style={{ marginLeft: 6 }}>
        <Text
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: "#fff",
            fontSize: 12,
            fontWeight: "700",
            marginTop: 1,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// Full spot card in bottom sheet
function SpotCard({ spot, selected, onPress }) {
  const borderColor = selected
    ? scoreToColor(spot.sunsetScore)
    : "rgba(255,255,255,0.1)";
  const color = scoreToColor(spot.sunsetScore);

  return (
    <TouchableOpacity
      onPress={() => onPress(spot)}
      activeOpacity={0.85}
      style={{
        backgroundColor: selected
          ? "rgba(255,255,255,0.1)"
          : "rgba(255,255,255,0.05)",
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor,
      }}
    >
      {/* Header row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        {/* Rank badge */}
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: color + "33",
            borderWidth: 1.5,
            borderColor: color,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Text style={{ color, fontWeight: "900", fontSize: 14 }}>
            #{spot.rank}
          </Text>
        </View>

        {/* Name and highlight */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#fff",
              fontWeight: "800",
              fontSize: 15,
              lineHeight: 20,
            }}
            numberOfLines={2}
          >
            {spot.name}
          </Text>
          <Text
            style={{
              color: "rgba(255,180,100,0.75)",
              fontSize: 12,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {spot.highlight}
          </Text>
        </View>

        {/* Score pill */}
        <LinearGradient
          colors={[color + "cc", color]}
          style={{
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 5,
            marginLeft: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
            {spot.sunsetScore}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 8,
              fontWeight: "700",
              letterSpacing: 0.5,
            }}
          >
            SCORE
          </Text>
        </LinearGradient>
      </View>

      {/* Info badges */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        <InfoBadge
          icon={Compass}
          label="West-Facing"
          value={spot.westFacingLabel}
          color={westFacingColor(spot.westFacingLabel)}
        />
        <InfoBadge
          icon={Mountain}
          label="Elevation"
          value={`${spot.elevation}m`}
          color={elevationColor(spot.elevatedLabel)}
        />
        <InfoBadge
          icon={Building2}
          label="Obstruction"
          value={spot.obstructionLevel}
          color={obstructionColor(spot.obstructionLevel)}
        />
      </View>

      {/* Notes row */}
      <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}
            numberOfLines={1}
          >
            🧭 {spot.westFacingNote}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}
            numberOfLines={1}
          >
            🏙 {spot.obstructionNote}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Legend component
function Legend() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(15,10,30,0.9)",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
      }}
    >
      {[
        { color: "#FF5F1F", label: "80+" },
        { color: "#FFB347", label: "50+" },
        { color: "#708090", label: "<50" },
      ].map((item) => (
        <View
          key={item.label}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: item.color,
            }}
          />
          <Text
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 10,
              fontWeight: "600",
            }}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const SNAP_POINTS = ["38%", "72%"];

export default function SpotsPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef(null);
  const bottomSheetRef = useRef(null);

  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coords, setCoords] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const headerOpacity = useRef(new Animated.Value(0)).current;

  const fetchSpots = useCallback(async (latitude, longitude) => {
    setError(null);
    try {
      const spotsResult = await fetchSpotsData(latitude, longitude);
      setSpots(spotsResult || []);
      if (spotsResult && spotsResult.length > 0) {
        setSelectedId(spotsResult[0].id);
      }
    } catch (err) {
      console.error(err);
      setError("Could not load nearby spots. Pull down to retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission required to find nearby spots.");
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      setCoords({ latitude, longitude });
      await fetchSpots(latitude, longitude);
    })();
  }, [fetchSpots]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, headerOpacity]);

  const handleMarkerPress = useCallback((spot) => {
    setSelectedId(spot.id);
    bottomSheetRef.current?.snapToIndex(1);
    mapRef.current?.animateToRegion(
      {
        latitude: spot.lat - 0.004,
        longitude: spot.lon,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      500,
    );
  }, []);

  const handleCardPress = useCallback((spot) => {
    setSelectedId(spot.id);
    mapRef.current?.animateToRegion(
      {
        latitude: spot.lat - 0.004,
        longitude: spot.lon,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      500,
    );
  }, []);

  const selectedSpot = spots.find((s) => s.id === selectedId) || spots[0];

  const mapRegion = coords
    ? {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      }
    : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: "#0f0a1e" }}>
      <StatusBar style="light" />

      {/* Map fills the top portion */}
      <View style={{ flex: 1 }}>
        {mapRegion && (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            initialRegion={mapRegion}
            customMapStyle={DARK_MAP_STYLE}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
          >
            {spots.map((spot) => (
              <Marker
                key={spot.id}
                coordinate={{ latitude: spot.lat, longitude: spot.lon }}
                onPress={() => handleMarkerPress(spot)}
                tracksViewChanges={false}
              >
                <SpotMarker spot={spot} selected={selectedId === spot.id} />
              </Marker>
            ))}
          </MapView>
        )}

        {/* Dark gradient at the bottom of the map to blend into sheet */}
        <LinearGradient
          colors={["transparent", "rgba(15,10,30,0.6)"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            pointerEvents: "none",
          }}
        />

        {/* Header overlay */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: headerOpacity,
          }}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: "rgba(15,10,30,0.85)",
              borderRadius: 14,
              padding: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ChevronLeft size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
              Back
            </Text>
          </TouchableOpacity>

          {/* Title */}
          <View
            style={{
              backgroundColor: "rgba(15,10,30,0.85)",
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
              Nearby Spots
            </Text>
            {spots.length > 0 && (
              <Text
                style={{
                  color: "rgba(255,180,100,0.8)",
                  fontSize: 10,
                  fontWeight: "600",
                }}
              >
                {spots.length} spots found
              </Text>
            )}
          </View>

          {/* Legend */}
          <TouchableOpacity
            onPress={() =>
              coords &&
              fetchSpots(coords.latitude, coords.longitude) &&
              setLoading(true)
            }
            style={{
              backgroundColor: "rgba(15,10,30,0.85)",
              borderRadius: 14,
              padding: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            <RefreshCw size={18} color="rgba(255,180,100,0.9)" />
          </TouchableOpacity>
        </Animated.View>

        {/* Legend overlay bottom-left of map */}
        {spots.length > 0 && (
          <View style={{ position: "absolute", bottom: 88, left: 16 }}>
            <Legend />
          </View>
        )}
      </View>

      {/* Loading overlay */}
      {loading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#0f0a1e",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="rgba(255,180,100,0.9)" />
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              marginTop: 16,
              fontSize: 14,
            }}
          >
            Finding sunset spots near you...
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.3)",
              marginTop: 6,
              fontSize: 12,
            }}
          >
            Analysing elevation & orientation
          </Text>
        </View>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#0f0a1e",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <Text style={{ fontSize: 40, marginBottom: 16 }}>📍</Text>
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Couldn't Find Spots
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 14,
              textAlign: "center",
              lineHeight: 21,
              marginBottom: 28,
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            onPress={() =>
              coords && fetchSpots(coords.latitude, coords.longitude)
            }
            style={{
              backgroundColor: "#FF6B35",
              borderRadius: 14,
              paddingHorizontal: 28,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Sheet */}
      {!loading && spots.length > 0 && (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={SNAP_POINTS}
          backgroundStyle={{
            backgroundColor: "#0f0a1e",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
          handleIndicatorStyle={{
            backgroundColor: "rgba(255,255,255,0.25)",
            width: 40,
          }}
        >
          <BottomSheetScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 4,
              paddingBottom: insets.bottom + 24,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Section header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
                marginTop: 8,
              }}
            >
              <MapPin size={14} color="rgba(255,180,100,0.8)" />
              <Text
                style={{
                  color: "rgba(255,180,100,0.8)",
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginLeft: 6,
                }}
              >
                Ranked by Sunset Quality
              </Text>
            </View>

            {/* Key to icons */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 16,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <View style={{ flex: 1, alignItems: "center" }}>
                <Compass size={14} color="#FF8C42" />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 9,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  West{"\n"}Facing
                </Text>
              </View>
              <View
                style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }}
              />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Mountain size={14} color="#C084FC" />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 9,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Elevation{"\n"}(metres)
                </Text>
              </View>
              <View
                style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }}
              />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Building2 size={14} color="#FCD34D" />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 9,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Building{"\n"}Obstruction
                </Text>
              </View>
              <View
                style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }}
              />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Star size={14} color="#FF5F1F" />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 9,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Sunset{"\n"}Score
                </Text>
              </View>
            </View>

            {/* Spot cards */}
            {spots.map((spot) => (
              <SpotCard
                key={spot.id}
                spot={spot}
                selected={selectedId === spot.id}
                onPress={handleCardPress}
              />
            ))}

            <Text
              style={{
                color: "rgba(255,255,255,0.18)",
                fontSize: 11,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Data from OpenStreetMap · Elevation via SRTM30m · Analysis by AI
            </Text>
          </BottomSheetScrollView>
        </BottomSheet>
      )}
    </View>
  );
}
