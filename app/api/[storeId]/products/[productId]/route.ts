import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProductSchema } from "@/schemas/product-form-schema";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { storeId: string; productId: string } }
) {
  try {
    const session = await auth();
    const body = await request.json();
    const validatedData = ProductSchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse("Invalid attributes", { status: 400 });
    }

    const {
      name,
      slug,
      price,
      about,
      description,
      sizeAndFit,
      materialAndCare,
      enabledFeatures,
      isFeatured,
      isArchieved,
      stock,
      categoryId,
      subCategoryId,
      sizeId,
      colorId,
      productImages,
      specifications,
    } = validatedData.data;

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized Access", { status: 401 });
    }

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    if (!params.productId) {
      return new NextResponse("Product Id is required", { status: 401 });
    }

    const storeById = await db.store.findUnique({
      where: { id: params.storeId },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    if (subCategoryId) {
      const subCategory = await db.subCategory.findUnique({
        where: { id: subCategoryId },
      });
      if (!subCategory) {
        return new NextResponse("Invalid subcategory", { status: 400 });
      }
      if (subCategory.categoryId !== categoryId) {
        return new NextResponse(
          "Subcategory must belong to the selected category",
          { status: 400 }
        );
      }
    }

    if (specifications && specifications.length > 0) {
      const specificationFieldIds = specifications.map(
        (spec) => spec.specificationFieldId
      );
      const specificationFields = await db.specificationField.findMany({
        where: {
          id: { in: specificationFieldIds },
          storeId: params.storeId,
        },
      });

      if (specificationFields.length !== specificationFieldIds.length) {
        return new NextResponse(
          "One or more specification fields are invalid",
          { status: 400 }
        );
      }
    }

    const product = await db.product.update({
      where: { id: params.productId },
      data: {
        name,
        slug,
        price,
        about,
        description,
        sizeAndFit,
        materialAndCare,
        enabledFeatures,
        isFeatured,
        isArchieved,
        stock,
        categoryId,
        subCategoryId,
        sizeId,
        colorId,
        productImages: {
          deleteMany: {},
          create: productImages.map((url) => ({ url })),
        },
        productSpecifications: {
          deleteMany: {},
          create: specifications?.map((spec) => ({
            specificationFieldId: spec.specificationFieldId,
            value: spec.value,
          })),
        },
      },
      include: {
        productSpecifications: true,
      },
    });

    return NextResponse.json(product);
  } catch (error: any) {
    console.log("[PRODUCT_PATCH]", error);
    if (error.code === "P2002") {
      return new NextResponse("Slug already exists", { status: 400 });
    }
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { storeId: string; productId: string } }
) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized Access", { status: 401 });
    }

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    if (!params.productId) {
      return new NextResponse("Product Id is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: { id: params.storeId },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    const product = await db.product.delete({
      where: { id: params.productId },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.log("[PRODUCT_DELETE]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    if (!params.productId) {
      return new NextResponse("Product Id is required", { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const includeRelated = searchParams.get("includeRelated") === "true";
    const categoryId = searchParams.get("categoryId");

    console.log("Fetching product:", params.productId, "with filters:", {
      includeRelated,
      categoryId,
    });

    const where: any = {
      id: params.productId,
      isArchieved: false,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const product = await db.product.findUnique({
      where,
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
    });

    if (!product) {
      return new NextResponse("Product not found", { status: 404 });
    }

    let relatedProducts: any[] = [];
    if (includeRelated && product.categoryId) {
      relatedProducts = await db.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: {
            not: product.id,
          },
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
        take: 4,
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    const response = {
      ...product,
      ...(includeRelated && { relatedProducts }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.log("[PRODUCT_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
