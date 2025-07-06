import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { storeId: string } }
) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin":
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      "http://localhost:3000" ||
      "https://favobliss.vercel.app",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  try {
    if (!params.storeId) {
      return new NextResponse("Store ID is required", { status: 400, headers });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim();
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    if (!query) {
      return new NextResponse("Search query is required", {
        status: 400,
        headers,
      });
    }

    const skip = (page - 1) * limit;
    const categoryLimit = Math.floor(limit / 3);
    const subCategoryLimit = Math.floor(limit / 3);
    const productLimit = Math.ceil(limit / 3);

    // Search for categories
    const categories = await db.category.findMany({
      where: {
        storeId: params.storeId,
        name: { contains: query, mode: "insensitive" },
      },
      include: {
        billboard: true,
        subCategories: {
          include: {
            billboard: true,
            childSubCategories: {
              include: {
                billboard: true,
                childSubCategories: {
                  include: {
                    billboard: true,
                    childSubCategories: true,
                  },
                },
              },
            },
          },
        },
      },
      take: categoryLimit,
    });

    // Transform categories
    const transformedCategories = categories.map((category) => ({
      ...category,
      subCategories: category.subCategories
        .filter((sub) => sub.parentId === null)
        .map((sub) => ({
          ...sub,
          childSubCategories: sub.childSubCategories.map((child) => ({
            ...child,
            childSubCategories: child.childSubCategories.map((grandchild) => ({
              ...grandchild,
              childSubCategories: grandchild.childSubCategories || [],
            })),
          })),
        })),
    }));

    // Search for subcategories (only name matches)
    const subCategories = await db.subCategory.findMany({
      where: {
        storeId: params.storeId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          {
            childSubCategories: {
              some: {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  {
                    childSubCategories: {
                      some: {
                        OR: [
                          { name: { contains: query, mode: "insensitive" } },
                          {
                            childSubCategories: {
                              some: {
                                name: { contains: query, mode: "insensitive" },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      include: {
        billboard: true,
        category: true,
        parent: true,
        childSubCategories: {
          include: {
            billboard: true,
            childSubCategories: {
              include: {
                billboard: true,
                childSubCategories: true,
              },
            },
          },
        },
      },
      take: subCategoryLimit,
    });

    // Search for products
    const products = await db.product.findMany({
      where: {
        storeId: params.storeId,
        isArchieved: false,
        name: { contains: query, mode: "insensitive" },
      },
      include: {
        category: true,
        subCategory: {
          include: {
            parent: true,
            billboard: true,
          },
        },
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
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: productLimit,
    });

    // Combine results
    const searchResults = {
      categories: transformedCategories,
      subCategories,
      products,
      pagination: {
        page,
        limit,
        totalCategories: categories.length,
        totalSubCategories: subCategories.length,
        totalProducts: products.length,
      },
    };

    return NextResponse.json(searchResults, { headers });
  } catch (error) {
    console.log("[SEARCH_GET]", error);
    return new NextResponse("Internal server error", { status: 500, headers });
  }
}
