const axios = require("axios");
const { Client } = require("@googlemaps/google-maps-services-js");

const googleMapsClient = new Client({});

// Forward geocode - address to coordinates
const geocode = async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Address is required" });

    // Try Google Maps first
    try {
      const response = await googleMapsClient.geocode({
        params: {
          address: address,
          key: process.env.GOOGLE_MAPS_API_KEY,
          region: "ng" // Bias towards Nigeria
        }
      });

      if (response.data.results.length > 0) {
        const result = response.data.results[0];
        const { lat, lng } = result.geometry.location;
        
        return res.json({
          address: result.formatted_address,
          latitude: lat,
          longitude: lng,
          coordinates: [lng, lat],
          source: "google",
          placeId: result.place_id,
          components: result.address_components
        });
      }
    } catch (googleErr) {
      console.error("Google Maps error:", googleErr.message);
    }

    // Fallback to Nominatim
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=ng&limit=1`;
    const response = await axios.get(url, { headers: { "User-Agent": "STexLogistics/1.0" } });

    if (response.data.length === 0) {
      return res.status(404).json({ error: "Address not found" });
    }

    const { lat, lon, display_name } = response.data[0];
    res.json({
      address: display_name,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      coordinates: [parseFloat(lon), parseFloat(lat)],
      source: "nominatim"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reverse geocode - coordinates to address
const reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "Latitude and longitude are required" });

    // Try Google Maps first
    try {
      const response = await googleMapsClient.reverseGeocode({
        params: {
          latlng: { lat: parseFloat(lat), lng: parseFloat(lng) },
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.results.length > 0) {
        const result = response.data.results[0];
        return res.json({
          address: result.formatted_address,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          source: "google",
          components: result.address_components
        });
      }
    } catch (googleErr) {
      console.error("Google reverse geocode error:", googleErr.message);
    }

    // Fallback to Nominatim
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await axios.get(url, { headers: { "User-Agent": "STexLogistics/1.0" } });

    res.json({
      address: response.data.display_name,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      source: "nominatim"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Search places - autocomplete
const searchPlaces = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Query is required" });

    const response = await googleMapsClient.placeAutocomplete({
      params: {
        input: query,
        key: process.env.GOOGLE_MAPS_API_KEY,
        components: "country:ng",
        types: "geocode"
      }
    });

    const suggestions = response.data.predictions.map(p => ({
      description: p.description,
      placeId: p.place_id
    }));

    res.json({ suggestions });
  } catch (err) {
    // Fallback to Nominatim search
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(req.query.query)}&countrycodes=ng&limit=5`;
      const response = await axios.get(url, { headers: { "User-Agent": "STexLogistics/1.0" } });
      const suggestions = response.data.map(r => ({
        description: r.display_name,
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon)
      }));
      res.json({ suggestions });
    } catch (fallbackErr) {
      res.status(500).json({ error: err.message });
    }
  }
};

// Get place details by placeId
const getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.query;
    if (!placeId) return res.status(400).json({ error: "Place ID is required" });

    const response = await googleMapsClient.placeDetails({
      params: {
        place_id: placeId,
        key: process.env.GOOGLE_MAPS_API_KEY,
        fields: ["formatted_address", "geometry", "name", "address_components"]
      }
    });

    const result = response.data.result;
    res.json({
      address: result.formatted_address,
      name: result.name,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      coordinates: [result.geometry.location.lng, result.geometry.location.lat]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Calculate distance between two points
const calculateDistance = async (req, res) => {
  try {
    const { origin, destination } = req.query;
    if (!origin || !destination) return res.status(400).json({ error: "Origin and destination are required" });

    const response = await googleMapsClient.distancematrix({
      params: {
        origins: [origin],
        destinations: [destination],
        key: process.env.GOOGLE_MAPS_API_KEY,
        region: "ng",
        units: "metric"
      }
    });

    const element = response.data.rows[0].elements[0];
    if (element.status !== "OK") {
      return res.status(400).json({ error: "Could not calculate distance" });
    }

    res.json({
      origin: response.data.origin_addresses[0],
      destination: response.data.destination_addresses[0],
      distance: element.distance,
      duration: element.duration
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { geocode, reverseGeocode, searchPlaces, getPlaceDetails, calculateDistance };