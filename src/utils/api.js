/**
 * Direct API calls for weather, sunrise/sunset, and spots data.
 * Uses free public APIs — no backend server or API keys required.
 */

// ─── Weather via Open-Meteo (free, no key) ───

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,visibility,uv_index,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather data unavailable");
  const data = await res.json();
  const c = data.current;
  return {
    temp_c: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    wind_kph: c.wind_speed_10m,
    cloud: c.cloud_cover,
    vis_km: Math.round((c.visibility || 10000) / 1000),
    uv: c.uv_index,
    condition: { text: weatherCodeToText(c.weather_code) },
  };
}

function weatherCodeToText(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] || "Unknown";
}

// ─── Sunrise/Sunset via sunrise-sunset.org (free, no key) ───

async function fetchAstro(lat, lon) {
  const res = await fetch(
    `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "OK") return null;

  const toLocalTime = (utc) => {
    const d = new Date(utc);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return {
    sunrise: toLocalTime(data.results.sunrise),
    sunset: toLocalTime(data.results.sunset),
    golden_hour: data.results.golden_hour
      ? toLocalTime(data.results.golden_hour)
      : null,
  };
}

// ─── Location name via Nominatim reverse geocoding (free, no key) ───

async function fetchLocationName(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      { headers: { "User-Agent": "GoldenHourApp/1.0" } }
    );
    if (!res.ok) return { name: "Your Location", region: "", country: "" };
    const data = await res.json();
    const addr = data.address || {};
    return {
      name: addr.city || addr.town || addr.village || addr.county || "Your Location",
      region: addr.state || addr.province || "",
      country: addr.country || "",
    };
  } catch (_) {
    return { name: "Your Location", region: "", country: "" };
  }
}

// ─── Local sunset quality analysis (no AI needed) ───

function analyzeSunset(weather, astro) {
  const cloud = weather.cloud ?? 50;
  const humidity = weather.humidity ?? 50;
  const vis = weather.vis_km ?? 10;
  const wind = weather.wind_kph ?? 10;
  const condition = (weather.condition?.text || "").toLowerCase();

  let score = 50;

  // Cloud cover scoring: 30-70% is ideal for colorful sunsets
  if (cloud >= 30 && cloud <= 70) {
    score += 25;
  } else if (cloud >= 20 && cloud <= 80) {
    score += 10;
  } else if (cloud < 10) {
    score -= 5; // clear sky = decent but plain
  } else if (cloud > 85) {
    score -= 25; // overcast = poor
  }

  // Visibility: higher is better
  if (vis >= 15) score += 10;
  else if (vis >= 10) score += 5;
  else if (vis < 5) score -= 10;

  // Humidity: lower is better for crisp colors
  if (humidity < 40) score += 10;
  else if (humidity < 60) score += 5;
  else if (humidity > 80) score -= 10;

  // Wind: moderate is fine, very high is bad
  if (wind > 40) score -= 5;

  // Storm clearing bonus
  if (condition.includes("shower") || condition.includes("thunder")) {
    score += 5; // storms can produce spectacular clearings
  }

  // Rain/fog penalty
  if (condition.includes("rain") || condition.includes("drizzle")) {
    score -= 10;
  }
  if (condition.includes("fog")) {
    score -= 15;
  }

  score = Math.max(0, Math.min(100, score));

  let rating, tip, bestTime;
  if (score >= 80) {
    rating = "Spectacular";
    tip = "Scattered clouds at the right altitude will light up with vibrant oranges and pinks. Get to an elevated spot with a clear western view!";
    bestTime = "Head out 45 minutes before sunset for the golden hour buildup";
  } else if (score >= 65) {
    rating = "Great";
    tip = "Good cloud coverage should paint some nice colors. Find a spot with an unobstructed western horizon for the best view.";
    bestTime = "Arrive 30 minutes before sunset to catch the full color progression";
  } else if (score >= 50) {
    rating = "Good";
    tip = "Conditions are reasonable. Look for breaks in the clouds toward the west — that's where the magic happens.";
    bestTime = "Be in position about 20 minutes before sunset";
  } else if (score >= 35) {
    rating = "Decent";
    tip = "Don't expect dramatic colors, but there may be subtle beauty in the sky. Sometimes the simplest sunsets surprise you.";
    bestTime = "Check the sky 15 minutes before sunset for any promising breaks";
  } else {
    rating = "Muted";
    tip = "Heavy cloud cover or poor visibility may block the sunset. Consider checking back tomorrow for better conditions.";
    bestTime = "If you go out, try 10 minutes before sunset in case the clouds break";
  }

  return { score, rating, reason: generateReason(weather, score), tip, bestTime };
}

function generateReason(weather, score) {
  const cloud = weather.cloud ?? 50;
  const vis = weather.vis_km ?? 10;
  const condition = (weather.condition?.text || "").toLowerCase();

  if (score >= 75) {
    if (cloud >= 30 && cloud <= 70) {
      return `${cloud}% cloud cover at ${vis}km visibility creates ideal conditions for a colorful sunset.`;
    }
    return `Clear skies with ${vis}km visibility promise a clean, warm sunset.`;
  }
  if (score >= 50) {
    return `${cloud}% cloud cover with ${weather.condition?.text || "mixed"} conditions — could produce some nice colors.`;
  }
  if (cloud > 85) {
    return `Heavy ${cloud}% cloud cover will likely block most sunset colors.`;
  }
  return `Current ${condition} conditions may limit sunset visibility.`;
}

// ─── Spots search via Google search (from web) ───

async function fetchSpotsFromSearch(locationName) {
  // This is a simplified version — returns empty since Google Search API requires a key
  return [];
}

// ─── Main forecast function ───

export async function fetchForecast(lat, lon) {
  const [weather, astro, location] = await Promise.all([
    fetchWeather(lat, lon),
    fetchAstro(lat, lon),
    fetchLocationName(lat, lon),
  ]);

  const analysis = analyzeSunset(weather, astro);
  const spots = await fetchSpotsFromSearch(location.name);

  return {
    location,
    weather,
    astro,
    analysis,
    spots,
  };
}

// ─── Spots via Overpass API (OpenStreetMap) ───

export async function fetchSpots(lat, lon) {
  // 1. Fetch real viewpoints / peaks from Overpass API
  const overpassQuery = `
    [out:json][timeout:15];
    (
      node["tourism"="viewpoint"](around:20000,${lat},${lon});
      node["natural"="peak"](around:15000,${lat},${lon});
      node["tourism"="attraction"](around:10000,${lat},${lon});
      node["leisure"="park"](around:8000,${lat},${lon});
    );
    out body 10;
  `;

  let osmSpots = [];
  try {
    const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (overpassRes.ok) {
      const osmData = await overpassRes.json();
      osmSpots = (osmData.elements || [])
        .filter((el) => el.lat && el.lon && el.tags && el.tags.name)
        .slice(0, 8)
        .map((el) => ({
          name: el.tags.name,
          lat: el.lat,
          lon: el.lon,
          type:
            el.tags.tourism ||
            el.tags.natural ||
            el.tags.leisure ||
            "viewpoint",
          osmEle: el.tags.ele ? parseFloat(el.tags.ele) : null,
          description:
            el.tags.description || el.tags["description:en"] || null,
        }));
    }
  } catch (_) {}

  // 2. Fallback to Nominatim
  if (osmSpots.length < 3) {
    try {
      const viewbox = `${lon - 0.3},${lat + 0.3},${lon + 0.3},${lat - 0.3}`;
      const nominatimRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=viewpoint+hill+park&format=json&limit=8&viewbox=${viewbox}&bounded=1`,
        { headers: { "User-Agent": "GoldenHourApp/1.0" } }
      );
      if (nominatimRes.ok) {
        const nomData = await nominatimRes.json();
        const existing = new Set(osmSpots.map((s) => s.name));
        const nomSpots = nomData
          .filter(
            (r) =>
              r.display_name &&
              !existing.has(r.display_name.split(",")[0])
          )
          .slice(0, 8 - osmSpots.length)
          .map((r) => ({
            name: r.display_name.split(",")[0],
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            type: r.type || "place",
            osmEle: null,
            description: null,
          }));
        osmSpots = [...osmSpots, ...nomSpots];
      }
    } catch (_) {}
  }

  if (osmSpots.length === 0) {
    return [];
  }

  // 3. Batch elevation lookup via Open-Topo-Data
  const locationsStr = osmSpots.map((s) => `${s.lat},${s.lon}`).join("|");
  let elevations = osmSpots.map((s) => s.osmEle || 0);
  try {
    const eleRes = await fetch(
      `https://api.opentopodata.org/v1/srtm30m?locations=${locationsStr}`
    );
    if (eleRes.ok) {
      const eleData = await eleRes.json();
      elevations = (eleData.results || []).map(
        (r, i) => r.elevation ?? osmSpots[i].osmEle ?? 0
      );
    }
  } catch (_) {}

  // 4. Local analysis instead of AI
  const spots = osmSpots.map((s, i) => {
    const elevation = Math.round(elevations[i] || 0);
    const analysis = analyzeSpot(s, elevation, lat, lon);
    return {
      id: i,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      type: s.type,
      elevation,
      ...analysis,
    };
  });

  // Sort by sunset score descending
  spots.sort((a, b) => b.sunsetScore - a.sunsetScore);
  spots.forEach((s, i) => {
    s.rank = i + 1;
  });

  return spots;
}

// ─── Local spot analysis (replaces AI) ───

function analyzeSpot(spot, elevation, userLat, userLon) {
  let sunsetScore = 50;

  // Elevation bonus
  let elevatedLabel = "Low";
  if (elevation > 300) {
    elevatedLabel = "High";
    sunsetScore += 20;
  } else if (elevation > 100) {
    elevatedLabel = "Mid";
    sunsetScore += 10;
  }

  // Type-based scoring
  const type = spot.type || "";
  let westFacingLabel = "Partial";
  let westFacingNote = "Open area";
  let obstructionLevel = "Low";
  let obstructionNote = "Minimal obstructions expected";
  let highlight = "Good local viewpoint";

  if (type === "viewpoint") {
    sunsetScore += 15;
    westFacingLabel = "Yes";
    westFacingNote = "Designated viewpoint with open views";
    obstructionLevel = "None";
    obstructionNote = "Clear sightlines expected";
    highlight = "Designated scenic viewpoint";
  } else if (type === "peak") {
    sunsetScore += 20;
    westFacingLabel = "Yes";
    westFacingNote = "Elevated peak with panoramic views";
    obstructionLevel = "None";
    obstructionNote = "Above surrounding terrain";
    highlight = "Elevated peak with wide horizon";
  } else if (type === "attraction") {
    sunsetScore += 5;
    westFacingNote = "Tourist attraction area";
    obstructionLevel = "Moderate";
    obstructionNote = "May have surrounding structures";
    highlight = "Popular attraction spot";
  } else if (type === "park") {
    sunsetScore += 8;
    westFacingNote = "Open park area";
    obstructionLevel = "Low";
    obstructionNote = "Trees may partially block views";
    highlight = "Green space with open sky";
  }

  sunsetScore = Math.max(0, Math.min(100, sunsetScore));

  return {
    westFacingLabel,
    westFacingNote,
    obstructionLevel,
    obstructionNote,
    sunsetScore,
    highlight,
    elevatedLabel,
  };
}
