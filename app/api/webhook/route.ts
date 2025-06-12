import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
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
      return new NextResponse("Invalid webhook signature", { status: 400 });
    }

    event = JSON.parse(body);
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  // Handle the payment.authorized or order.paid event
  if (event.event === "payment.authorized" || event.event === "order.paid") {
    const payment = event.payload.payment.entity;
    const orderId = payment.notes?.orderId; // Assuming orderId was passed in notes during order creation

    if (!orderId) {
      return new NextResponse("Order ID not found in webhook", { status: 400 });
    }

    // Extract address from payment notes or fallback to existing address
    const address = payment.notes?.address || "";
    const phone = payment.contact || "";

    try {
      const order = await db.order.update({
        where: {
          id: orderId,
        },
        data: {
          isPaid: true,
          address: address,
          phone: phone,
        },
        include: {
          orderItems: true,
        },
      });

      // Update product stock
      const updatedItems = await Promise.all(
        order.orderItems.map(async (orderItem: any) => {
          const product = await db.product.findUnique({
            where: {
              id: orderItem.productId,
            },
          });

          if (!product) return null;

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

      return new NextResponse(null, { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new NextResponse("Something went wrong!", { status: 500 });
    }
  }

  return new NextResponse(null, { status: 200 });
}
