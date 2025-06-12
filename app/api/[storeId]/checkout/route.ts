import { NextResponse } from "next/server";
import Razorpay from "razorpay";
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
      address,
    }: {
      products: {
        id: string;
        quantity: number;
        name: string;
        about: string;
        image: string;
        size: string;
      }[];
      address: any;
    } = await request.json();

    if (!products || products.length === 0) {
      return new NextResponse("Product IDs are required", { status: 400 });
    }

    if (!address) {
      return new NextResponse("Address is required", { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay credentials missing");
      return new NextResponse("Server configuration error", { status: 500 });
    }

    // Verify store exists
    const store = await db.store.findUnique({
      where: { id: params.storeId },
    });
    if (!store) {
      return new NextResponse(`Store not found for ID: ${params.storeId}`, {
        status: 404,
      });
    }

    // Verify products exist
    const productIds = products.map((product) => product.id);
    const allProducts = await db.product.findMany({
      where: {
        id: { in: productIds },
        storeId: params.storeId,
      },
    });
    if (allProducts.length !== productIds.length) {
      return new NextResponse(
        "Some products not found or don't belong to this store",
        { status: 400 }
      );
    }

    // Create order
    const order = await db.order.create({
      data: {
        storeId: params.storeId,
        isPaid: false,
        phone: address.phoneNumber || "",
        address: `${address.address}, ${address.town}, ${address.district}, ${address.state}, ${address.zipCode}`,
        orderItems: {
          create: products.map((product) => ({
            product: { connect: { id: product.id } },
            quantity: product.quantity,
          })),
        },
      },
    });

    console.log(`Order created in backend: ${order.id}`);

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const amount =
      allProducts.reduce((total, product) => {
        const quantity =
          products.find((item) => product.id === item.id)?.quantity || 1;
        return total + product.price * quantity;
      }, 0) * 100; // Convert to paise

    const options = {
      amount,
      currency: "INR",
      receipt: order.id,
      notes: { orderId: order.id },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    return NextResponse.json(
      {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        orderReceipt: order.id,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("RAZORPAY_PAYMENT_ERROR", {
      message: error.message,
      statusCode: error.statusCode,
      errorDetails: error,
    });
    return new NextResponse(
      error.meta?.cause || error.error?.description || "Internal server error",
      { status: error.statusCode || 500 }
    );
  }
}
