const https = require("https");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

const initializePayment = async ({ email, amount, orderId, callbackUrl }) => {
  return new Promise((resolve, reject) => {
    const params = JSON.stringify({
      email,
      amount: amount * 100,
      reference: `TBD_${orderId}_${Date.now()}`,
      callback_url: callbackUrl || `${process.env.BASE_URL}/api/payments/verify`,
      metadata: {
        orderId,
        custom_fields: [
          {
            display_name: "Order ID",
            variable_name: "order_id",
            value: orderId
          }
        ]
      }
    });

    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: "/transaction/initialize",
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json"
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(JSON.parse(data)));
    });

    req.on("error", reject);
    req.write(params);
    req.end();
  });
};

const verifyPayment = async (reference) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(JSON.parse(data)));
    });

    req.on("error", reject);
    req.end();
  });
};

module.exports = { initializePayment, verifyPayment };