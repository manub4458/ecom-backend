// app/api/[storeId]/categories/[categoryId]/route.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { storeId: string; categoryId: string } }
) {
  try {
    const session = await auth();
    const { name, billboardId, bannerImage } = await request.json();

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
      return new NextResponse("Banner Image is required", { status: 400 });
    }

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    if (!params.categoryId) {
      return new NextResponse("Category Id is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: {
        id: params.storeId,
      },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    const category = await db.category.update({
      where: {
        id: params.categoryId,
      },
      data: {
        name,
        billboardId,
        bannerImage,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.log("[CATEGORIES_PATCH]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { storeId: string; categoryId: string } }
) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized Access", { status: 401 });
    }

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    if (!params.categoryId) {
      return new NextResponse("Category Id is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: {
        id: params.storeId,
      },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    // Check for related products or subcategories
    const products = await db.product.findFirst({
      where: { categoryId: params.categoryId },
    });
    const subCategories = await db.subCategory.findFirst({
      where: { categoryId: params.categoryId },
    });

    if (products || subCategories) {
      return new NextResponse(
        "Cannot delete category with associated products or subcategories",
        { status: 400 }
      );
    }

    const category = await db.category.delete({
      where: {
        id: params.categoryId,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.log("[CATEGORIES_DELETE]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { categoryId: string } }
) {
  try {
    if (!params.categoryId) {
      return new NextResponse("Category Id is required", { status: 400 });
    }

    const category = await db.category.findUnique({
      where: {
        id: params.categoryId,
      },
      include: {
        billboard: true,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.log("[CATEGORY_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
