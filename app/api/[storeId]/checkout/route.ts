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
    }: {
      products: {
        id: string;
        quantity: number;
        price: number;
        locationId?: string | null;
      }[];
      orderId: string;
    } = await request.json();

    if (!products || products.length === 0) {
      return new NextResponse("Variant IDs are required", { status: 400 });
    }

    if (!orderId) {
      return new NextResponse("Order ID is required", { status: 400 });
    }

    const variantIds = products.map((product) => product.id);

    // Fetch variants for validation
    const allVariants = await db.variant.findMany({
      where: {
        id: {
          in: variantIds,
        },
      },
      include: {
        product: true,
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

    // Calculate line items using location-based price from products
    const lineItems = products.map((product) => {
      const variant = allVariants.find((v) => v.id === product.id);
      return {
        quantity: product.quantity,
        amount: product.price * 100, // Convert price to paise
        name: `${variant?.product.name} (${variant?.size?.value || ""}, ${
          variant?.color?.name || ""
        })`,
      };
    });

    const totalAmount = lineItems.reduce(
      (total, item) => total + item.amount * item.quantity,
      0
    );

    if (totalAmount <= 0) {
      return new NextResponse("Total amount must be greater than zero", {
        status: 400,
      });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const razorCheckout = await razorpay.orders.create({
      amount: totalAmount,
      currency: "INR",
      receipt: orderId,
      notes: {
        id: orderId,
        locationIds: JSON.stringify(products.map((p) => p.locationId)), // Include locationIds
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
