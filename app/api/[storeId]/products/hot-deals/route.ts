import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const timeFrame = searchParams.get("timeFrame") || "30 days";

    console.log("Received filters:", {
      categoryId,
      page,
      limit,
      timeFrame,
    });

    // Calculate start date based on time frame
    let startDate = new Date();
    if (timeFrame === "7 days") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeFrame === "30 days") {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeFrame === "90 days") {
      startDate.setDate(startDate.getDate() - 90);
    } else if (timeFrame !== "all time") {
      return new NextResponse("Invalid time frame", { status: 400 });
    }

    // Filter for orders
    const whereOrder: any = {
      storeId: params.storeId,
      isPaid: true,
    };

    if (timeFrame !== "all time") {
      whereOrder.createdAt = { gte: startDate };
    }

    // Get relevant order IDs first
    const orders = await db.order.findMany({
      where: whereOrder,
      select: { id: true },
    });
    const orderIds = orders.map((order) => order.id);

    // Exit early if no orders found
    if (orderIds.length === 0) {
      console.log("No orders found in the specified time frame");
      return NextResponse.json([]);
    }

    // Aggregate sales by product through variants
    const orderItems = await db.orderItem.findMany({
      where: {
        orderId: { in: orderIds },
        variant: {
          product: {
            isArchieved: false,
            ...(categoryId ? { categoryId } : {}),
          },
        },
      },
      select: {
        quantity: true,
        variant: {
          select: {
            productId: true,
          },
        },
      },
    });

    // Aggregate quantities by product ID
    const productSales = new Map<string, number>();
    for (const item of orderItems) {
      const productId = item.variant.productId;
      const total = productSales.get(productId) || 0;
      productSales.set(productId, total + item.quantity);
    }

    // Sort products by total sold
    const sortedProducts = Array.from(productSales.entries())
      .map(([productId, totalSold]) => ({ productId, totalSold }))
      .sort((a, b) => b.totalSold - a.totalSold);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedProducts = sortedProducts.slice(
      startIndex,
      startIndex + limit
    );
    const productIds = paginatedProducts.map((p) => p.productId);

    // Exit early if no products found
    if (productIds.length === 0) {
      console.log("No hot deal products found after filtering");
      return NextResponse.json([]);
    }

    // Fetch product details
    const products = await db.product.findMany({
      where: {
        id: { in: productIds },
        storeId: params.storeId,
        isArchieved: false,
      },
      include: {
        category: true,
        subCategory: {
          include: {
            parent: true,
            billboard: true,
          },
        },
        // size: true,
        // color: true,
        variants: {
          include: {
            size: true,
            color: true,
            images: true,
          },
        },
        productSpecifications: {
          include: {
            specificationField: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    });

    // Combine sales data with product details
    const result = paginatedProducts
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return product ? { ...product, totalSold: item.totalSold } : null;
      })
      .filter(Boolean);

    console.log(`Found ${result.length} hot deal products`);
    return NextResponse.json(result);
  } catch (error) {
    console.log("[HOT_DEALS_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
