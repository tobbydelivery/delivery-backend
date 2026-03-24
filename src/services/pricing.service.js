const toRad = (value) => (value * Math.PI) / 180;

const calculateDistance = (coord1, coord2) => {
  const R = 6371;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculatePrice = ({ distanceKm, weight = 1, fragile = false, express = false }) => {
  const BASE_PRICE = 500;
  const PRICE_PER_KM = 50;
  const PRICE_PER_KG = 100;
  const FRAGILE_SURCHARGE = 500;
  const EXPRESS_MULTIPLIER = 1.5;

  let price = BASE_PRICE;
  price += distanceKm * PRICE_PER_KM;
  price += weight * PRICE_PER_KG;
  if (fragile) price += FRAGILE_SURCHARGE;
  if (express) price *= EXPRESS_MULTIPLIER;

  return Math.ceil(price);
};

const getDeliveryEstimate = (distanceKm, express = false) => {
  if (express) {
    if (distanceKm <= 10) return "1-2 hours";
    if (distanceKm <= 50) return "3-5 hours";
    return "Same day";
  } else {
    if (distanceKm <= 10) return "2-4 hours";
    if (distanceKm <= 50) return "Same day";
    if (distanceKm <= 200) return "1-2 days";
    return "2-3 days";
  }
};

module.exports = { calculateDistance, calculatePrice, getDeliveryEstimate };