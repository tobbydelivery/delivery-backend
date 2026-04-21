const { initTracking } = require("../services/tracking.service");

module.exports = (io) => {
  initTracking(io);
};