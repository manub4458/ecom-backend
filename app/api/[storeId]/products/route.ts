import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProductSchema } from "@/schemas/product-form-schema";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { storeId: string } }
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
      about,
      description,
      sizeAndFit,
      materialAndCare,
      enabledFeatures,
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

    // Validate specification fields if provided
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

    // Validate variants (sizeId and colorId if provided)
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
      if (variant.sku) {
        const existingVariant = await db.variant.findUnique({
          where: { sku: variant.sku },
        });
        if (existingVariant) {
          return new NextResponse(`SKU ${variant.sku} already exists`, {
            status: 400,
          });
        }
      }
    }

    const product = await db.product.create({
      data: {
        name,
        slug,
        about,
        description,
        sizeAndFit,
        materialAndCare,
        enabledFeatures,
        isFeatured,
        isArchieved,
        categoryId,
        subCategoryId,
        storeId: params.storeId,
        variants: {
          create: variants.map((variant) => ({
            price: variant.price,
            stock: variant.stock,
            sku: variant.sku || undefined,
            sizeId: variant.sizeId || undefined,
            colorId: variant.colorId || undefined,
            images: {
              create: variant.images.map((url) => ({ url })),
            },
          })),
        },
        productSpecifications: {
          create: specifications?.map((spec) => ({
            specificationFieldId: spec.specificationFieldId,
            value: spec.value,
          })),
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
    console.log("[PRODUCTS_POST]", error);
    if (error.code === "P2002") {
      return new NextResponse("Slug or SKU already exists", { status: 400 });
    }
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    if (!params.storeId) {
      return new NextResponse("Store ID is required", { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const categoryId = searchParams.get("categoryId");
    const colorId = searchParams.get("colorId");
    const sizeId = searchParams.get("sizeId");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const price = searchParams.get("price");

    console.log("Received filters:", {
      slug,
      categoryId,
      colorId,
      sizeId,
      type,
      page,
      limit,
      price,
    });

    if (slug) {
      const product = await db.product.findUnique({
        where: {
          slug,
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

      return NextResponse.json(product);
    }

    const where: any = {
      storeId: params.storeId,
      isArchieved: false,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Filter by colorId or sizeId through variants
    if (colorId || sizeId) {
      where.variants = {
        some: {
          ...(colorId && { colorId }),
          ...(sizeId && { sizeId }),
        },
      };
    }

    if (type) {
      where.type = type;
    }

    // Filter by price through variants
    if (price) {
      let minPrice: number | undefined;
      let maxPrice: number | undefined;

      if (price === "5000") {
        minPrice = 5000;
      } else {
        const [min, max] = price.split("-").map((p) => parseInt(p));
        if (max) {
          minPrice = min;
          maxPrice = max;
        }
      }

      if (minPrice || maxPrice) {
        where.variants = {
          some: {
            ...(where.variants?.some || {}),
            price: {
              ...(minPrice && { gte: minPrice }),
              ...(maxPrice && { lte: maxPrice }),
            },
          },
        };
      }
    }

    const skip = (page - 1) * limit;

    const products = await db.product.findMany({
      where,
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
      take: limit,
    });

    console.log(
      `Found ${products.length} products for categoryId: ${categoryId}`
    );

    return NextResponse.json(products);
  } catch (error) {
    console.log("[PRODUCTS_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
