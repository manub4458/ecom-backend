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
      return new NextResponse("Variant IDs are required", { status: 400 });
    }

    const variantIds = products.map((product) => product.id);

    // Fetch variants instead of products
    const allVariants = await db.variant.findMany({
      where: {
        id: {
          in: variantIds,
        },
      },
      include: {
        product: true, // Include product for name/about
        size: true,
        color: true,
      },
    });

    // Validate all requested variants exist
    if (allVariants.length !== variantIds.length) {
      return new NextResponse("Some variants not found", { status: 400 });
    }

    // Check stock availability
    for (const product of products) {
      const variant = allVariants.find((v) => v.id === product.id);
      if (!variant || variant.stock < product.quantity) {
        return new NextResponse(
          `Insufficient stock for variant ${product.id}`,
          { status: 400 }
        );
      }
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const lineItems = allVariants.map((variant) => ({
      quantity: products.find((p) => p.id === variant.id)?.quantity || 1,
      amount: variant.price * 100, // Razorpay expects amount in paise
      name: `${variant.product.name} (${variant.size?.value || ""}, ${
        variant.color?.name || ""
      })`,
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
            variant: {
              connect: {
                id: product.id, // Connect variantId
              },
            },
            quantity: product.quantity,
          })),
        },
      },
    });

    const razorCheckout = await razorpay.orders.create({
      amount: totalAmount,
      currency: "INR",
      receipt: orderId,
      notes: {
        id: order.id,
      },
    });

    return NextResponse.json(
      {
        orderId: razorCheckout.id,
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
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
