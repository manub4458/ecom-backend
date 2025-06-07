// app/api/[storeId]/subcategories/[subCategoryId]/route.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { storeId: string; subCategoryId: string } }
) {
  try {
    const session = await auth();
    const { name, billboardId, bannerImage, categoryId } = await request.json();

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

    if (!categoryId) {
      return new NextResponse("Category Id is required", { status: 400 });
    }

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    if (!params.subCategoryId) {
      return new NextResponse("Subcategory Id is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: {
        id: params.storeId,
      },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    const category = await db.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return new NextResponse("Category does not exist", { status: 404 });
    }

    const subCategory = await db.subCategory.update({
      where: {
        id: params.subCategoryId,
      },
      data: {
        name,
        billboardId,
        bannerImage,
        categoryId,
      },
    });

    return NextResponse.json(subCategory);
  } catch (error) {
    console.log("[SUBCATEGORIES_PATCH]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { storeId: string; subCategoryId: string } }
) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized Access", { status: 401 });
    }

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    if (!params.subCategoryId) {
      return new NextResponse("Subcategory Id is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: {
        id: params.storeId,
      },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    // Check for related products
    const products = await db.product.findFirst({
      where: { subCategoryId: params.subCategoryId },
    });

    if (products) {
      return new NextResponse(
        "Cannot delete subcategory with associated products",
        { status: 400 }
      );
    }

    const subCategory = await db.subCategory.delete({
      where: {
        id: params.subCategoryId,
      },
    });

    return NextResponse.json(subCategory);
  } catch (error) {
    console.log("[SUBCATEGORIES_DELETE]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { subCategoryId: string } }
) {
  try {
    if (!params.subCategoryId) {
      return new NextResponse("Subcategory Id is required", { status: 400 });
    }

    const subCategory = await db.subCategory.findUnique({
      where: {
        id: params.subCategoryId,
      },
      include: {
        billboard: true,
        category: true,
      },
    });

    return NextResponse.json(subCategory);
  } catch (error) {
    console.log("[SUBCATEGORY_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
