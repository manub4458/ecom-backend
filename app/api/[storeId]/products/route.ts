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
      brandId,
      about,
      description,
      sizeAndFit,
      materialAndCare,
      enabledFeatures,
      expressDelivery,
      warranty,
      isFeatured,
      isNewArrival,
      isArchieved,
      categoryId,
      subCategoryId,
      variants,
      specifications,
      metaTitle,
      metaDescription,
      metaKeywords,
      openGraphImage,
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

    const category = await db.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return new NextResponse("Invalid category", { status: 400 });
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

    if (brandId) {
      const brand = await db.brand.findUnique({
        where: { id: brandId, storeId: params.storeId },
      });
      if (!brand) {
        return new NextResponse("Invalid brand", { status: 400 });
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

    for (const variant of variants) {
      if (variant.sizeId !== null && variant.sizeId) {
        const size = await db.size.findUnique({
          where: { id: variant.sizeId },
        });
        if (!size) {
          return new NextResponse("Invalid size in variant", { status: 400 });
        }
      }
      if (variant.colorId !== null && variant.colorId) {
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
      if (variant.variantPrices && variant.variantPrices.length > 0) {
        const locationIds = variant.variantPrices.map((vp) => vp.locationId);
        const locations = await db.location.findMany({
          where: {
            id: { in: locationIds },
            storeId: params.storeId,
          },
        });
        if (locations.length !== locationIds.length) {
          return new NextResponse(
            "One or more location IDs in variant prices are invalid",
            { status: 400 }
          );
        }
      }
    }

    const product = await db.product.create({
      data: {
        name,
        slug,
        brandId,
        about,
        description,
        sizeAndFit,
        materialAndCare,
        enabledFeatures,
        expressDelivery,
        warranty,
        isFeatured,
        isNewArrival,
        isArchieved,
        categoryId,
        subCategoryId,
        storeId: params.storeId,
        metaTitle,
        metaDescription,
        metaKeywords,
        openGraphImage,
        variants: {
          create: variants.map((variant) => ({
            stock: variant.stock,
            sku: variant.sku || undefined,
            sizeId: variant.sizeId === null ? null : variant.sizeId,
            colorId: variant.colorId === null ? null : variant.colorId,
            images: {
              create: variant.images.map((url) => ({ url })),
            },
            variantPrices: {
              create: variant.variantPrices?.map((vp) => ({
                locationId: vp.locationId,
                price: vp.price,
                mrp: vp.mrp,
              })),
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
        brand: true,
        variants: {
          include: {
            images: true,
            variantPrices: {
              include: {
                location: true,
              },
            },
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
  const headers = {
    "Access-Control-Allow-Origin":
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      "http://localhost:3000" ||
      "http://localhost:3001" ||
      "https://favobliss.vercel.app",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  try {
    if (!params.storeId) {
      return new NextResponse("Store ID is required", { status: 400, headers });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const categoryId = searchParams.get("categoryId");
    const subCategoryId = searchParams.get("subCategoryId");
    const brandId = searchParams.get("brandId");
    const colorId = searchParams.get("colorId");
    const sizeId = searchParams.get("sizeId");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const price = searchParams.get("price");
    const locationId = searchParams.get("locationId");
    const pincode = searchParams.get("pincode");
    const isFeatured = searchParams.get("isFeatured");
    const variantIds = searchParams.get("variantIds")?.split(",");

    console.log("Received filters:", {
      slug,
      categoryId,
      subCategoryId,
      brandId,
      colorId,
      sizeId,
      type,
      page,
      limit,
      price,
      locationId,
      pincode,
      isFeatured,
      variantIds,
    });

    let resolvedLocationId = locationId;
    if (pincode && !locationId) {
      const location = await db.location.findUnique({
        where: { pincode, storeId: params.storeId },
      });
      if (!location) {
        console.log("Invalid pincode", pincode);
        return new NextResponse("Invalid pincode", { status: 404, headers });
      }
      resolvedLocationId = location.id;
    }

    // Validate subCategoryId if provided
    if (subCategoryId) {
      const subCategory = await db.subCategory.findUnique({
        where: { id: subCategoryId, storeId: params.storeId },
      });
      if (!subCategory) {
        console.log("Invalid subCategoryId", subCategoryId);
        return new NextResponse("Invalid subcategory ID", {
          status: 404,
          headers,
        });
      }
      // Optionally, ensure subCategory belongs to categoryId if both are provided
      if (categoryId && subCategory.categoryId !== categoryId) {
        console.log("Subcategory does not belong to specified category", {
          subCategoryId,
          categoryId,
        });
        return new NextResponse(
          "Subcategory does not belong to specified category",
          { status: 400, headers }
        );
      }
    }

    if (slug) {
      const product = await db.product.findUnique({
        where: {
          slug,
          storeId: params.storeId,
          isArchieved: false,
        },
        include: {
          brand: true,
          category: true,
          subCategory: {
            include: {
              parent: true,
            },
          },
          variants: {
            include: {
              size: true,
              color: true,
              images: true,
              variantPrices: {
                where: resolvedLocationId
                  ? { locationId: resolvedLocationId }
                  : undefined,
                include: {
                  location: true,
                },
              },
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
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      });

      if (!product) {
        return new NextResponse("Product not found", { status: 404, headers });
      }

      const ratings = product.reviews.map((review) => review.rating);
      const numberOfRatings = ratings.length;
      const averageRating =
        numberOfRatings > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / numberOfRatings
          : 0;

      const { reviews, ...productWithoutReviews } = product;
      const productWithRatings = {
        ...productWithoutReviews,
        averageRating: Number(averageRating.toFixed(2)),
        numberOfRatings,
      };

      return NextResponse.json(productWithRatings, { headers });
    }

    const where: any = {
      storeId: params.storeId,
      isArchieved: false,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (subCategoryId) {
      where.subCategoryId = subCategoryId;
    }

    if (brandId) {
      where.brandId = brandId;
    }

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

    if (isFeatured) {
      if (isFeatured === "true") {
        where.isFeatured = true;
      } else if (isFeatured === "false") {
        where.isFeatured = false;
      }
    }

    if (variantIds && variantIds.length > 0) {
      where.variants = {
        some: {
          id: { in: variantIds },
        },
      };
    }

    if (price && resolvedLocationId) {
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
            variantPrices: {
              some: {
                locationId: resolvedLocationId,
                price: {
                  ...(minPrice && { gte: minPrice }),
                  ...(maxPrice && { lte: maxPrice }),
                },
              },
            },
          },
        };
      }
    }

    const skip = (page - 1) * limit;

    const products = await db.product.findMany({
      where,
      include: {
        brand: true,
        category: true,
        subCategory: {
          include: {
            parent: true,
          },
        },
        variants: {
          include: {
            size: true,
            color: true,
            images: true,
            variantPrices: {
              where: resolvedLocationId
                ? { locationId: resolvedLocationId }
                : undefined,
              include: {
                location: true,
              },
            },
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
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    const productsWithRatings = products.map((product) => {
      const ratings = product.reviews.map((review) => review.rating);
      const numberOfRatings = ratings.length;
      const averageRating =
        numberOfRatings > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / numberOfRatings
          : 0;

      const { reviews, ...productWithoutReviews } = product;
      return {
        ...productWithoutReviews,
        averageRating: Number(averageRating.toFixed(2)),
        numberOfRatings,
      };
    });

    console.log(
      `Found ${products.length} products for storeId: ${params.storeId}, brandId: ${brandId}, categoryId: ${categoryId}, subCategoryId: ${subCategoryId}`
    );

    return NextResponse.json(productsWithRatings, { headers });
  } catch (error) {
    console.log("[PRODUCTS_GET]", error);
    return new NextResponse("Internal server error", { status: 500, headers });
  }
}
