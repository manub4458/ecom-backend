import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const { name, billboardId, bannerImage } = await request.json();
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized Access", { status: 401 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!billboardId) {
      return new NextResponse("Billboard Id is required", { status: 400 });
    }

    if (!bannerImage) {
      return new NextResponse("Banner image is required", { status: 400 });
    }

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: {
        id: params.storeId,
      },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    const category = await db.category.create({
      data: {
        name,
        billboardId,
        bannerImage,
        storeId: params.storeId,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.log("[CATEGORIES_POST]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    const categories = await db.category.findMany({
      where: {
        storeId: params.storeId,
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
                    childSubCategories: true, // Limit recursion to 3 levels
                  },
                },
              },
            },
          },
        },
      },
    });

    // Transform subCategories to include only top-level subcategories
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

    return NextResponse.json(transformedCategories);
  } catch (error) {
    console.log("[CATEGORIES_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
