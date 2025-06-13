import Razorpay from "razorpay";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
  request: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const {
      products,
      orderId,
    }: { products: { id: string; quantity: number }[]; orderId: string } =
      await request.json();

    if (!products || products.length === 0) {
      return new NextResponse("Product Ids are required", { status: 401 });
    }

    const productIds = products.map((product) => product.id);

    const allProducts = await db.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const lineItems = allProducts.map((product) => ({
      quantity: products.find((item) => product.id === item.id)?.quantity || 1,
      amount: product.price * 100, // Razorpay expects amount in paise
      name: product.about,
    }));

    const totalAmount = lineItems.reduce(
      (total, item) => total + item.amount * item.quantity,
      0
    );

    const order = await db.order.create({
      data: {
        storeId: params.storeId,
        isPaid: false,
        orderItems: {
          create: products.map((product) => ({
            product: {
              connect: {
                id: product.id,
              },
            },
            quantity: product.quantity,
          })),
        },
      },
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount,
      currency: "INR",
      receipt: orderId,
      notes: {
        orderId: order.id,
      },
    });

    return NextResponse.json(
      {
        orderId: razorpayOrder.id,
        amount: totalAmount,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID!,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.log("PAYMENT_ERROR", error);
    return new NextResponse("Internal server Error", { status: 500 });
  }
}
