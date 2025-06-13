import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

import { db } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("x-razorpay-signature") as string;

  let event;

  try {
    // Verify the webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Webhook signature verification failed", {
        expectedSignature,
        signature,
      });
      return new NextResponse("Invalid webhook signature", { status: 400 });
    }

    event = JSON.parse(body);
  } catch (error: any) {
    console.error("Webhook parsing error:", error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  // Log the event for debugging
  console.log("Webhook event received:", event);

  // Handle only the order.paid event to avoid duplicates
  if (event.event === "order.paid") {
    const payment = event.payload.payment.entity;
    const orderId = payment.notes?.orderId;

    if (!orderId) {
      console.error("Order ID not found in webhook", { payment });
      return new NextResponse("Order ID not found in webhook", { status: 400 });
    }

    // Check if the order is already paid to prevent duplicate processing
    const existingOrder = await db.order.findUnique({
      where: { id: orderId },
    });

    if (existingOrder?.isPaid) {
      console.log(`Order ${orderId} is already paid, skipping processing`);
      return new NextResponse(null, { status: 200 });
    }

    // Log the notes to debug the address issue
    console.log("Payment notes:", payment.notes);
    console.log("Raw address string:", payment.notes?.address);

    let addressString = "";
    try {
      if (payment.notes?.address) {
        const address = JSON.parse(payment.notes.address);
        console.log("Parsed address:", address);
        addressString = [
          address.address || "",
          address.landmark || "",
          address.town || "",
          address.district || "",
          address.state || "",
          address.zipCode || "",
        ]
          .filter((c) => c)
          .join(", ");
      }
    } catch (error) {
      console.error("Error parsing address:", error);
      addressString = "";
    }

    try {
      const order = await db.order.update({
        where: {
          id: orderId,
        },
        data: {
          isPaid: true,
          address: addressString,
          phone: payment.contact || "",
        },
        include: {
          orderItems: true,
        },
      });

      console.log("Order updated:", order);

      const updatedItems = await Promise.all(
        order.orderItems.map(async (orderItem) => {
          const product = await db.product.findUnique({
            where: {
              id: orderItem.productId,
            },
          });

          if (!product) {
            console.warn(`Product not found for orderItem: ${orderItem.id}`);
            return null;
          }

          const newStock = Math.max(0, product.stock - orderItem.quantity);

          const updatedProduct = await db.product.update({
            where: {
              id: product.id,
            },
            data: {
              stock: newStock,
            },
          });

          return updatedProduct;
        })
      );

      console.log("Updated products:", updatedItems);

      return new NextResponse(null, { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new NextResponse("Something went wrong!", { status: 500 });
    }
  }

  console.log("Unhandled event type:", event.event);
  return new NextResponse(null, { status: 200 });
}
