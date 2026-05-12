const { admin, initializeFirebase } = require("../config/firebase");

initializeFirebase();

// Send to single device
const sendPushNotification = async ({ token, title, body, data = {} }) => {
  try {
    if (!token) return { success: false, error: "No device token" };

    const message = {
      notification: { title, body },
      data: { ...data, click_action: "FLUTTER_NOTIFICATION_CLICK" },
      token,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "stex_notifications"
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Push sent: ${title}`);
    return { success: true, messageId: response };
  } catch (err) {
    console.error("Push notification error:", err.message);
    return { success: false, error: err.message };
  }
};

// Send to multiple devices
const sendPushToMultiple = async ({ tokens, title, body, data = {} }) => {
  try {
    if (!tokens || tokens.length === 0) return { success: false, error: "No tokens" };

    const message = {
      notification: { title, body },
      data,
      tokens,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "stex_notifications"
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Push sent to ${response.successCount} devices`);
    return { success: true, successCount: response.successCount, failureCount: response.failureCount };
  } catch (err) {
    console.error("Multicast push error:", err.message);
    return { success: false, error: err.message };
  }
};

// Send to topic (e.g. all users)
const sendPushToTopic = async ({ topic, title, body, data = {} }) => {
  try {
    const message = {
      notification: { title, body },
      data,
      topic,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "stex_notifications"
        }
      }
    };

    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (err) {
    console.error("Topic push error:", err.message);
    return { success: false, error: err.message };
  }
};

// Order status push notifications
const sendOrderStatusPush = async ({ deviceToken, status, trackingNumber }) => {
  const messages = {
    pending: {
      title: "📦 Order Received!",
      body: `Your order ${trackingNumber} has been received and is being processed.`
    },
    picked_up: {
      title: "🚚 Package Picked Up!",
      body: `Your package ${trackingNumber} has been picked up by our agent.`
    },
    in_transit: {
      title: "🚀 Package In Transit!",
      body: `Your package ${trackingNumber} is on its way to the destination.`
    },
    delivered: {
      title: "✅ Package Delivered!",
      body: `Your package ${trackingNumber} has been delivered successfully!`
    },
    cancelled: {
      title: "❌ Order Cancelled",
      body: `Your order ${trackingNumber} has been cancelled. Contact support for help.`
    },
    delayed: {
      title: "⚠️ Delivery Delayed",
      body: `Your package ${trackingNumber} has been delayed. We apologize for the inconvenience.`
    }
  };

  const msg = messages[status];
  if (!msg || !deviceToken) return;

  return sendPushNotification({
    token: deviceToken,
    title: msg.title,
    body: msg.body,
    data: { trackingNumber, status }
  });
};

// Welcome push notification
const sendWelcomePush = async ({ deviceToken, name }) => {
  return sendPushNotification({
    token: deviceToken,
    title: "🚚 Welcome to STeX Logistics!",
    body: `Hi ${name}! Your account is ready. Book your first delivery now!`,
    data: { screen: "Home" }
  });
};

module.exports = {
  sendPushNotification,
  sendPushToMultiple,
  sendPushToTopic,
  sendOrderStatusPush,
  sendWelcomePush
};
