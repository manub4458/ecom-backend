import { db } from "@/lib/db";
import { ReviewSchema } from "@/schemas/review-form-schema";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { productId: string } }
) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin":
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      "http://localhost:3001" ||
      "https://favobliss.vercel.app",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  try {
    const body = await request.json();
    const validatedData = ReviewSchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse(
        JSON.stringify({ errors: validatedData.error.format() }),
        { status: 400, headers }
      );
    }

    const { userName, rating, text, images, userId } = validatedData.data;

    if (!params.productId) {
      return new NextResponse("Product ID is required", {
        status: 400,
        headers,
      });
    }

    const product = await db.product.findUnique({
      where: { id: params.productId },
    });

    if (!product) {
      return new NextResponse("Product does not exist", {
        status: 404,
        headers,
      });
    }

    const review = await db.review.create({
      data: {
        productId: params.productId,
        userName,
        userId,
        rating,
        text,
        images: {
          create: images.map((url) => ({ url })),
        },
      },
      include: {
        images: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(review, { headers });
  } catch (error: any) {
    console.log("[REVIEWS_POST]", error);
    return new NextResponse("Internal server error", { status: 500, headers });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin":
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      "http://localhost:3001" ||
      "https://favobliss.vercel.app",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  try {
    if (!params.productId) {
      return new NextResponse("Product ID is required", {
        status: 400,
        headers,
      });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const skip = (page - 1) * limit;

    const reviews = await db.review.findMany({
      where: {
        productId: params.productId,
      },
      include: {
        images: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [
        { rating: "desc" }, // Sort by rating (highest first)
        { createdAt: "desc" }, // Then by createdAt (newest first)
      ],
      skip,
      take: limit,
    });

    return NextResponse.json(reviews, { headers });
  } catch (error) {
    console.log("[REVIEWS_GET]", error);
    return new NextResponse("Internal server error", { status: 500, headers });
  }
}
