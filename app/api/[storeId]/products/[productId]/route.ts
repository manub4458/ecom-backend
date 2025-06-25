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
      return new NextResponse(
        JSON.stringify({ errors: validatedData.error.format() }),
        { status: 400 }
      );
    }

    const {
      name,
      slug,
      brand,
      about,
      description,
      sizeAndFit,
      materialAndCare,
      enabledFeatures,
      expressDelivery,
      warranty,
      isFeatured,
      isArchieved,
      categoryId,
      subCategoryId,
      variants,
      specifications,
    } = validatedData.data;

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized Access", { status: 401 });
    }

    if (!params.storeId) {
      return new NextResponse("Store ID is required", { status: 400 });
    }

    if (!params.productId) {
      return new NextResponse("Product ID is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: { id: params.storeId },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    // Validate category
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return new NextResponse("Invalid category", { status: 400 });
    }

    // Validate subcategory if provided
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

    // Validate specifications
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

    // Validate variants
    for (const variant of variants) {
      if (variant.sizeId) {
        const size = await db.size.findUnique({
          where: { id: variant.sizeId },
        });
        if (!size) {
          return new NextResponse("Invalid size in variant", { status: 400 });
        }
      }
      if (variant.colorId) {
        const color = await db.color.findUnique({
          where: { id: variant.colorId },
        });
        if (!color) {
          return new NextResponse("Invalid color in variant", { status: 400 });
        }
      }
      if (variant.sku && !variant.id) {
        // Only check SKU uniqueness for new variants (no id)
        const existingVariant = await db.variant.findFirst({
          where: {
            sku: variant.sku,
          },
        });
        if (existingVariant) {
          return new NextResponse(`SKU ${variant.sku} already exists`, {
            status: 400,
          });
        }
      }
    }

    // Update product
    const product = await db.product.update({
      where: { id: params.productId },
      data: {
        name,
        slug,
        brand,
        about,
        description,
        sizeAndFit,
        materialAndCare,
        enabledFeatures,
        expressDelivery,
        warranty,
        isFeatured,
        isArchieved,
        categoryId,
        subCategoryId,
        productSpecifications: {
          deleteMany: {}, // Remove existing specs
          create: specifications?.map((spec) => ({
            specificationFieldId: spec.specificationFieldId,
            value: spec.value,
          })),
        },
        variants: {
          upsert: variants.map((variant) => ({
            where: { id: variant.id || "non-existent-id" }, // Use id if provided
            update: {
              price: variant.price,
              mrp: variant.mrp,
              stock: variant.stock,
              sku: variant.sku || undefined,
              sizeId: variant.sizeId || undefined,
              colorId: variant.colorId || undefined,
              images: {
                deleteMany: {},
                create: variant.images.map((url) => ({ url })),
              },
            },
            create: {
              price: variant.price,
              mrp: variant.mrp,
              stock: variant.stock,
              sku: variant.sku || undefined,
              sizeId: variant.sizeId || undefined,
              colorId: variant.colorId || undefined,
              images: {
                create: variant.images.map((url) => ({ url })),
              },
            },
          })),
          deleteMany: {
            id: {
              notIn: variants.filter((v) => v.id).map((v) => v.id as string),
            },
          },
        },
      },
      include: {
        variants: {
          include: {
            images: true,
          },
        },
        productSpecifications: true,
      },
    });

    return NextResponse.json(product);
  } catch (error: any) {
    console.log("[PRODUCT_PATCH]", error);
    if (error.code === "P2002") {
      return new NextResponse("Slug or SKU already exists", { status: 400 });
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
      return new NextResponse("Store ID is required", { status: 400 });
    }

    if (!params.productId) {
      return new NextResponse("Product ID is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: { id: params.storeId },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    // Delete the product and its related data within a transaction
    const product = await db.$transaction(async (prisma) => {
      // Delete product specifications
      await prisma.productSpecification.deleteMany({
        where: { productId: params.productId },
      });

      // Delete the product (variants and order items will cascade)
      return await prisma.product.delete({
        where: { id: params.productId },
      });
    });

    return NextResponse.json(product);
  } catch (error: any) {
    console.log("[PRODUCT_DELETE]", error);
    if (error.code === "P2023") {
      return new NextResponse("Invalid product ID", { status: 400 });
    }
    if (error.code === "P2025") {
      return new NextResponse("Product not found", { status: 404 });
    }
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    if (!params.productId) {
      return new NextResponse("Product ID is required", { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const includeRelated = searchParams.get("includeRelated") === "true";
    const categoryId = searchParams.get("categoryId");

    const product = await db.product.findUnique({
      where: {
        id: params.productId,
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

    if (!product) {
      return new NextResponse("Product not found", { status: 404 });
    }

    let relatedProducts: any[] = [];
    if (includeRelated && product.categoryId) {
      relatedProducts = await db.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: product.id },
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
