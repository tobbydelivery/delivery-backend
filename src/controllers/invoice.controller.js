const Order = require("../models/Order");
const { generateInvoice } = require("../services/invoice.service");
const { sendEmail } = require("../services/notification.service");
const PDFDocument = require("pdfkit");

const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("createdBy", "name email")
      .populate("assignedAgent", "name email");

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Only allow admin or order owner
    if (req.user.role !== "admin" && order.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    generateInvoice(order, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const emailInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("createdBy", "name email")
      .populate("assignedAgent", "name email");

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Generate PDF buffer
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(chunks);

      await sendEmail({
        to: order.createdBy.email,
        subject: `Invoice - Order #${order.trackingNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>📄 Your Invoice is Ready!</h2>
            <p>Dear ${order.createdBy.name},</p>
            <p>Please find your invoice for order <strong>#${order.trackingNumber}</strong> attached.</p>
            <p>Thank you for choosing Tobby Delivery!</p>
          </div>
        `,
        attachments: [
          {
            filename: `invoice-${order.trackingNumber}.pdf`,
            content: pdfBuffer
          }
        ]
      });

      res.json({ message: "Invoice sent to email successfully" });
    });

    generateInvoice(order, doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { downloadInvoice, emailInvoice };