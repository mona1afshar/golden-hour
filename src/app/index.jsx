import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  MapPin,
  Cloud,
  Droplets,
  Eye,
  Wind,
  Sunrise,
  Sunset,
  Star,
  Navigation,
  ThermometerSun,
  Clock,
  Lightbulb,
  Map,
} from "lucide-react-native";
import { fetchForecast as fetchForecastData } from "@/utils/api";

const { width } = Dimensions.get("window");

const SCORE_COLORS = {
  great: ["#FF6B35", "#FF3F66", "#C24CF6"],
  good: ["#FFB347", "#FF8C69", "#FF6B8A"],
  decent: ["#FFD700", "#FFA500", "#FF6347"],
  poor: ["#708090", "#778899", "#B0C4DE"],
};

function getGradientForScore(score) {
  if (score >= 75) return SCORE_COLORS.great;
  if (score >= 55) return SCORE_COLORS.good;
  if (score >= 35) return SCORE_COLORS.decent;
  return SCORE_COLORS.poor;
}

function ScoreRing({ score }) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const colors = getGradientForScore(score);
  const size = 160;
  const ringSize = size + 32;

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 8,
      }}
    >
      <View
        style={{
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          padding: 6,
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: (ringSize - 12) / 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: "rgba(15,10,30,0.55)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 48,
                fontWeight: "800",
                letterSpacing: -2,
              }}
            >
              {score}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: 13,
                fontWeight: "600",
                letterSpacing: 3,
                marginTop: -4,
              }}
            >
              /100
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

function WeatherBadge({ icon: Icon, label, value, color = "#fff" }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: (width - 64) / 2,
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 14,
        margin: 4,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
      >
        <Icon size={15} color="rgba(255,180,100,0.9)" />
        <Text
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 11,
            fontWeight: "600",
            marginLeft: 5,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
        {value}
      </Text>
    </View>
  );
}

function SpotCard({ spot, index }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        flexDirection: "row",
        alignItems: "flex-start",
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "rgba(255,107,53,0.3)",
          borderWidth: 1,
          borderColor: "rgba(255,107,53,0.5)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          marginTop: 2,
        }}
      >
        <Text style={{ color: "#FF6B35", fontWeight: "800", fontSize: 13 }}>
          {index + 1}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "#fff",
            fontWeight: "700",
            fontSize: 15,
            marginBottom: 4,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {spot.name}
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
            lineHeight: 18,
          }}
          numberOfLines={3}
        >
          {spot.description}
        </Text>
      </View>
    </View>
  );
}

function SectionHeader({ title }) {
  return (
    <Text
      style={{
        color: "rgba(255,180,100,0.9)",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 2.5,
        textTransform: "uppercase",
        marginBottom: 12,
        marginTop: 4,
      }}
    >
      {title}
    </Text>
  );
}

export default function SunsetTracker() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [coords, setCoords] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchForecast = useCallback(
    async (latitude, longitude) => {
      try {
        const json = await fetchForecastData(latitude, longitude);
        setData(json);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      } catch (err) {
        console.error(err);
        setLocationError("Could not load forecast. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fadeAnim],
  );

  const requestLocation = useCallback(async () => {
    setLocationError(null);
    setLoading(true);
    fadeAnim.setValue(0);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(
          "Location permission denied. Please enable it in Settings to get local forecasts.",
        );
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      setCoords({ latitude, longitude });
      await fetchForecast(latitude, longitude);
    } catch (err) {
      console.error(err);
      setLocationError("Could not determine your location. Please try again.");
      setLoading(false);
    }
  }, [fetchForecast, fadeAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (coords) {
      await fetchForecast(coords.latitude, coords.longitude);
    } else {
      await requestLocation();
    }
  }, [coords, fetchForecast, requestLocation]);

  useEffect(() => {
    requestLocation();
  }, []);

  const score = data?.analysis?.score ?? 0;
  const gradColors = getGradientForScore(score);
  const bgColors = [
    "rgb(12,8,28)",
    "rgb(18,10,38)",
    score >= 60 ? "rgb(55,20,10)" : "rgb(18,15,40)",
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "rgb(12,8,28)" }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={bgColors}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="rgba(255,180,100,0.8)"
            />
          }
        >
          {/* Header */}
          <View
            style={{
              paddingTop: insets.top + 16,
              paddingHorizontal: 24,
              paddingBottom: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 26,
                    fontWeight: "800",
                    letterSpacing: -0.5,
                  }}
                >
                  Golden Hour
                </Text>
                <Text
                  style={{
                    color: "rgba(255,180,100,0.8)",
                    fontSize: 13,
                    fontWeight: "500",
                    marginTop: 2,
                  }}
                >
                  Sunset & Sunrise Tracker
                </Text>
              </View>
              <TouchableOpacity
                onPress={requestLocation}
                style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.15)",
                }}
              >
                <Navigation size={18} color="rgba(255,180,100,0.9)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Loading State */}
          {loading && !refreshing && (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 120,
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
                Finding your location...
              </Text>
            </View>
          )}

          {/* Error State */}
          {locationError && !loading && (
            <View
              style={{
                alignItems: "center",
                paddingHorizontal: 32,
                paddingTop: 80,
              }}
            >
              <Text style={{ fontSize: 40, marginBottom: 16 }}>🌅</Text>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: "700",
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                Location Needed
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
                {locationError}
              </Text>
              <TouchableOpacity
                onPress={requestLocation}
                style={{
                  backgroundColor: "#FF6B35",
                  borderRadius: 14,
                  paddingHorizontal: 28,
                  paddingVertical: 14,
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}
                >
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main Content */}
          {data && !loading && (
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Location */}
              <View
                style={{
                  paddingHorizontal: 24,
                  marginTop: 4,
                  marginBottom: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <MapPin size={14} color="rgba(255,180,100,0.8)" />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 13,
                    marginLeft: 5,
                    fontWeight: "500",
                  }}
                >
                  {data.location?.name}
                  {data.location?.region ? `, ${data.location.region}` : ""}
                  {data.location?.country ? ` · ${data.location.country}` : ""}
                </Text>
              </View>

              {/* Score Section */}
              <View
                style={{
                  alignItems: "center",
                  paddingHorizontal: 24,
                  marginBottom: 8,
                }}
              >
                <ScoreRing score={score} />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 24,
                    fontWeight: "800",
                    marginTop: 12,
                    letterSpacing: -0.5,
                  }}
                >
                  {data.analysis?.rating}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 14,
                    textAlign: "center",
                    marginTop: 6,
                    lineHeight: 20,
                    paddingHorizontal: 16,
                  }}
                >
                  {data.analysis?.reason}
                </Text>
              </View>

              {/* Sunrise / Sunset Times */}
              {data.astro && (
                <View
                  style={{
                    paddingHorizontal: 24,
                    marginTop: 16,
                    marginBottom: 4,
                  }}
                >
                  <SectionHeader title="Today's Times" />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: "rgba(255,200,80,0.1)",
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "rgba(255,200,80,0.2)",
                        alignItems: "center",
                      }}
                    >
                      <Sunrise size={22} color="#FFD060" />
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 11,
                          fontWeight: "600",
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                          marginTop: 8,
                        }}
                      >
                        Sunrise
                      </Text>
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 18,
                          fontWeight: "800",
                          marginTop: 4,
                        }}
                      >
                        {data.astro.sunrise}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: "rgba(255,107,53,0.1)",
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "rgba(255,107,53,0.25)",
                        alignItems: "center",
                      }}
                    >
                      <Sunset size={22} color="#FF6B35" />
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 11,
                          fontWeight: "600",
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                          marginTop: 8,
                        }}
                      >
                        Sunset
                      </Text>
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 18,
                          fontWeight: "800",
                          marginTop: 4,
                        }}
                      >
                        {data.astro.sunset}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Pro Tips */}
              <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
                <SectionHeader title="Pro Tips" />
                {data.analysis?.tip && (
                  <View
                    style={{
                      backgroundColor: "rgba(255,107,53,0.12)",
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: "rgba(255,107,53,0.25)",
                      flexDirection: "row",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <Lightbulb
                      size={16}
                      color="#FF6B35"
                      style={{ marginTop: 2 }}
                    />
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.85)",
                        fontSize: 13,
                        lineHeight: 19,
                        marginLeft: 10,
                        flex: 1,
                      }}
                    >
                      {data.analysis.tip}
                    </Text>
                  </View>
                )}
                {data.analysis?.bestTime && (
                  <View
                    style={{
                      backgroundColor: "rgba(200,150,255,0.1)",
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: "rgba(200,150,255,0.2)",
                      flexDirection: "row",
                      alignItems: "flex-start",
                    }}
                  >
                    <Clock size={16} color="#C896FF" style={{ marginTop: 2 }} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text
                        style={{
                          color: "rgba(200,150,255,0.8)",
                          fontSize: 11,
                          fontWeight: "700",
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          marginBottom: 3,
                        }}
                      >
                        Best Time to Head Out
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.85)",
                          fontSize: 13,
                          lineHeight: 19,
                        }}
                      >
                        {data.analysis.bestTime}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Weather Conditions */}
              <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                <View style={{ paddingHorizontal: 4 }}>
                  <SectionHeader title="Conditions" />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  <WeatherBadge
                    icon={ThermometerSun}
                    label="Temp"
                    value={`${data.weather?.temp_c ?? "--"}°C`}
                  />
                  <WeatherBadge
                    icon={Cloud}
                    label="Clouds"
                    value={`${data.weather?.cloud ?? "--"}%`}
                  />
                  <WeatherBadge
                    icon={Droplets}
                    label="Humidity"
                    value={`${data.weather?.humidity ?? "--"}%`}
                  />
                  <WeatherBadge
                    icon={Eye}
                    label="Visibility"
                    value={`${data.weather?.vis_km ?? "--"} km`}
                  />
                  <WeatherBadge
                    icon={Wind}
                    label="Wind"
                    value={`${data.weather?.wind_kph ?? "--"} kph`}
                  />
                  <WeatherBadge
                    icon={Star}
                    label="UV Index"
                    value={`${data.weather?.uv ?? "--"}`}
                  />
                </View>
              </View>

              {/* Sunset Spots */}
              {data.spots && data.spots.length > 0 && (
                <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
                  <SectionHeader title="Best Spots Near You" />
                  {data.spots.map((spot, i) => (
                    <SpotCard key={i} spot={spot} index={i} />
                  ))}
                </View>
              )}

              {/* Best Spots Button */}
              <TouchableOpacity
                onPress={() => router.push("/spots")}
                style={{
                  backgroundColor: "rgba(255,107,53,0.15)",
                  borderRadius: 16,
                  padding: 16,
                  marginHorizontal: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 20,
                  borderWidth: 1,
                  borderColor: "rgba(255,107,53,0.3)",
                }}
              >
                <Map size={18} color="#FF6B35" />
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: 15,
                  }}
                >
                  Find Best Spots Near You
                </Text>
              </TouchableOpacity>

              {/* Powered By */}
              <View
                style={{
                  alignItems: "center",
                  marginTop: 24,
                  paddingHorizontal: 24,
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.2)",
                    fontSize: 11,
                    textAlign: "center",
                  }}
                >
                  Pull down to refresh · Weather data updates every 5 min
                </Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
