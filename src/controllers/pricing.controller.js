const axios = require("axios");
const { calculateDistance, calculatePrice, getDeliveryEstimate } = require("../services/pricing.service");

const getPriceEstimate = async (req, res) => {
  try {
    const { pickupAddress, deliveryAddress, weight, fragile, express } = req.body;

    if (!pickupAddress || !deliveryAddress) {
      return res.status(400).json({ error: "Pickup and delivery addresses are required" });
    }

    const geocode = async (address) => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
      const response = await axios.get(url, { headers: { "User-Agent": "DeliveryBackend/1.0" } });
      if (response.data.length > 0) {
        return { lat: parseFloat(response.data[0].lat), lng: parseFloat(response.data[0].lon) };
      }
      return null;
    };

    const pickupCoords = await geocode(pickupAddress);
    const deliveryCoords = await geocode(deliveryAddress);

    if (!pickupCoords || !deliveryCoords) {
      return res.status(400).json({ error: "Could not find one or both addresses" });
    }

    const distanceKm = calculateDistance(pickupCoords, deliveryCoords);
    const standardPrice = calculatePrice({ distanceKm, weight, fragile, express: false });
    const expressPrice = calculatePrice({ distanceKm, weight, fragile, express: true });

    res.json({
      pickup: pickupAddress,
      delivery: deliveryAddress,
      distanceKm: distanceKm.toFixed(2),
      pricing: {
        standard: {
          price: standardPrice,
          currency: "NGN",
          estimatedTime: getDeliveryEstimate(distanceKm, false)
        },
        express: {
          price: expressPrice,
          currency: "NGN",
          estimatedTime: getDeliveryEstimate(distanceKm, true)
        }
      },
      breakdown: {
        baseFee: 500,
        distanceFee: Math.ceil(distanceKm * 50),
        weightFee: Math.ceil((weight || 1) * 100),
        fragileFee: fragile ? 500 : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getPriceEstimate };