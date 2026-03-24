const PDFDocument = require("pdfkit");

const generateInvoice = (order, res) => {
  const doc = new PDFDocument({ margin: 50 });

  // Pipe PDF to response
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.trackingNumber}.pdf`);
  doc.pipe(res);

  // ===== HEADER =====
  doc.fontSize(24).fillColor("#2c3e50").text("TOBBY DELIVERY", { align: "center" });
  doc.fontSize(10).fillColor("#7f8c8d").text("Fast. Reliable. Trusted.", { align: "center" });
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#2c3e50").stroke();
  doc.moveDown();

  // ===== INVOICE TITLE =====
  doc.fontSize(18).fillColor("#2c3e50").text("DELIVERY INVOICE", { align: "center" });
  doc.moveDown(0.5);

  // ===== ORDER INFO =====
  doc.fontSize(11).fillColor("#2c3e50");
  doc.text(`Tracking Number: ${order.trackingNumber}`, { align: "right" });
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: "right" });
  doc.text(`Status: ${order.status.toUpperCase()}`, { align: "right" });
  doc.text(`Payment: ${order.paymentStatus.toUpperCase()}`, { align: "right" });
  doc.moveDown();

  // ===== SENDER & RECIPIENT =====
  const col1 = 50;
  const col2 = 300;
  const startY = doc.y;

  doc.fontSize(12).fillColor("#2c3e50").text("FROM:", col1, startY);
  doc.fontSize(10).fillColor("#34495e");
  doc.text(order.sender.name, col1, doc.y);
  doc.text(order.sender.phone, col1, doc.y);
  if (order.sender.email) doc.text(order.sender.email, col1, doc.y);
  doc.text(order.sender.address, col1, doc.y, { width: 200 });

  doc.fontSize(12).fillColor("#2c3e50").text("TO:", col2, startY);
  doc.fontSize(10).fillColor("#34495e");
  doc.text(order.recipient.name, col2, startY + 20);
  doc.text(order.recipient.phone, col2, doc.y);
  if (order.recipient.email) doc.text(order.recipient.email, col2, doc.y);
  doc.text(order.recipient.address, col2, doc.y, { width: 200 });

  doc.moveDown(4);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#bdc3c7").stroke();
  doc.moveDown();

  // ===== PACKAGE DETAILS =====
  doc.fontSize(12).fillColor("#2c3e50").text("PACKAGE DETAILS");
  doc.moveDown(0.5);

  const tableTop = doc.y;
  doc.fontSize(10).fillColor("#7f8c8d");
  doc.text("Description", 50, tableTop);
  doc.text("Weight", 200, tableTop);
  doc.text("Fragile", 300, tableTop);
  doc.text("Dimensions", 400, tableTop);

  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#bdc3c7").stroke();
  doc.moveDown(0.3);

  doc.fontSize(10).fillColor("#2c3e50");
  doc.text(order.package.description, 50, doc.y);
  doc.text(`${order.package.weight || "N/A"} kg`, 200, doc.y);
  doc.text(order.package.fragile ? "Yes" : "No", 300, doc.y);
  doc.text(order.package.dimensions || "N/A", 400, doc.y);

  doc.moveDown(2);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#bdc3c7").stroke();
  doc.moveDown();

  // ===== PRICING =====
  doc.fontSize(12).fillColor("#2c3e50").text("PAYMENT SUMMARY");
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor("#34495e");
  doc.text(`Delivery Fee:`, 350, doc.y);
  doc.text(`₦${order.price || 0}`, 500, doc.y, { align: "right" });
  doc.moveDown(0.5);

  doc.moveTo(350, doc.y).lineTo(550, doc.y).strokeColor("#2c3e50").stroke();
  doc.moveDown(0.3);

  doc.fontSize(12).fillColor("#2c3e50").text("TOTAL:", 350, doc.y);
  doc.fontSize(12).fillColor("#27ae60").text(`₦${order.price || 0}`, 500, doc.y, { align: "right" });

  doc.moveDown(2);

  // ===== FOOTER =====
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#2c3e50").stroke();
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor("#7f8c8d").text("Thank you for choosing Tobby Delivery!", { align: "center" });
  doc.text("For support, contact: support@tobbydelivery.com", { align: "center" });

  doc.end();
};

module.exports = { generateInvoice };