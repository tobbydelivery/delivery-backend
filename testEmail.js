require("dotenv").config();
const { sendEmail } = require("./src/services/notification.service");

sendEmail({
  to: "olasunkonmitobiloba@gmail.com",
  subject: "Test Email from Tobby Delivery",
  html: "<h1>Your notification system is working!</h1>"
}).then(() => {
  console.log("Done!");
  process.exit();
});