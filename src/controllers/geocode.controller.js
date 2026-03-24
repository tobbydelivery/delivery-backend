const axios = require("axios");

const geocode = async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Address is required" });

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const response = await axios.get(url, { headers: { "User-Agent": "DeliveryBackend/1.0" } });

    if (response.data.length === 0) {
      return res.status(404).json({ error: "Address not found" });
    }

    const { lat, lon, display_name } = response.data[0];
    res.json({ address: display_name, latitude: parseFloat(lat), longitude: parseFloat(lon), coordinates: [parseFloat(lon), parseFloat(lat)] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { geocode };
