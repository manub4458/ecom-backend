import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProductSchema } from "@/schemas/product-form-schema";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const body = await request.json();
    const validatedData = ProductSchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse("Invalid data provided", { status: 400 });
    }

    const {
      name,
      price,
      stock,
      categoryId,
      subCategoryId,
      sizeId,
      colorId,
      isFeatured,
      isArchieved,
      productImages,
      about,
      description,
      materialAndCare,
      sizeAndFit,
    } = validatedData.data;

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized Access", { status: 401 });
    }

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!productImages || !productImages.length) {
      return new NextResponse("Images are required", { status: 400 });
    }

    if (!categoryId) {
      return new NextResponse("Category Id is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: { id: params.storeId },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    const product = await db.product.create({
      data: {
        name,
        price,
        stock,
        categoryId,
        subCategoryId,
        sizeId,
        colorId,
        isFeatured,
        isArchieved,
        about,
        description,
        materialAndCare,
        sizeAndFit,
        storeId: params.storeId,
        productImages: {
          createMany: {
            data: productImages.map((image: { url: string }) => ({
              url: image.url,
            })),
          },
        },
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.log("[PRODUCTS_POST]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const subCategoryId = searchParams.get("subCategoryId") || undefined;
    const colorId = searchParams.get("colorId") || undefined;
    const sizeId = searchParams.get("sizeId") || undefined;
    const isFeatured = searchParams.get("isFeatured") || undefined;
    const limit = searchParams.get("limit") || undefined;
    const page = searchParams.get("page") || undefined;
    const priceRange = searchParams.get("price") || undefined;

    const minRange = priceRange ? priceRange.split("-")[0] : null;
    const maxRange = priceRange ? priceRange.split("-")[1] : null;

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    const products = await db.product.findMany({
      where: {
        storeId: params.storeId,
        categoryId,
        subCategoryId,
        colorId,
        sizeId,
        isFeatured: isFeatured ? true : undefined,
        price: {
          gte: minRange ? Number.parseInt(minRange) : 0,
          lte: maxRange ? Number.parseInt(maxRange) : 10000000,
        },
      },
      include: {
        productImages: true,
        category: true,
        subCategory: true,
        color: true,
        size: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip:
        page && limit
          ? (Number.parseInt(page) - 1) * Number.parseInt(limit)
          : undefined,
      take: limit ? Number.parseInt(limit) : undefined,
    });

    return NextResponse.json(products);
  } catch (error) {
    console.log("[PRODUCTS_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
