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

    // Calculate the start date based on the time frame
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

    // Aggregate sales by product
    const whereOrder: any = {
      storeId: params.storeId,
      isPaid: true, // Only count paid orders
    };

    if (timeFrame !== "all time") {
      whereOrder.createdAt = { gte: startDate };
    }

    const hotProducts = await db.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: whereOrder,
        ...(categoryId && {
          product: { categoryId, isArchieved: false },
        }),
      },
      _sum: {
        quantity: true, // Sum the quantities sold
      },
      orderBy: {
        _sum: {
          quantity: "desc", // Sort by total quantity sold
        },
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    // Extract product IDs
    const productIds = hotProducts.map((item) => item.productId);

    if (productIds.length === 0) {
      console.log("No hot deal products found");
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
        size: true,
        color: true,
        productImages: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Combine sales data with product details, preserving order from hotProducts
    const result = hotProducts
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          return {
            ...product,
            totalSold: item._sum.quantity, // Add sales volume
          };
        }
        return null;
      })
      .filter((item) => item !== null);

    console.log(`Found ${result.length} hot deal products`);

    return NextResponse.json(result);
  } catch (error) {
    console.log("[HOT_DEALS_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
