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

    if (!params.productId) {
      return new NextResponse("Product ID is required", { status: 400 });
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
      if (variant.sku && !variant.id) {
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

      if (variant.hsn && !variant.id) {
        const existingVariant = await db.variant.findFirst({
          where: {
            hsn: variant.hsn,
          },
        });
        if (existingVariant) {
          return new NextResponse(`HSN ${variant.hsn} already exists`, {
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

    const product = await db.product.update({
      where: { id: params.productId },
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
        metaTitle,
        metaDescription,
        metaKeywords,
        openGraphImage,
        productSpecifications: {
          deleteMany: {},
          create: specifications?.map((spec) => ({
            specificationFieldId: spec.specificationFieldId,
            value: spec.value,
          })),
        },
        variants: {
          upsert: variants.map((variant) => ({
            where: { id: variant.id || "non-existent-id" },
            update: {
              stock: variant.stock,
              sku: variant.sku || undefined,
              hsn: variant.hsn || undefined,
              sizeId: variant.sizeId === null ? null : variant.sizeId,
              colorId: variant.colorId === null ? null : variant.colorId,
              images: {
                deleteMany: {},
                create: variant.media.map((image) => ({
                  url: image.url,
                  mediaType: image.mediaType || "IMAGE", // Default to IMAGE for compatibility
                })),
              },
              variantPrices: {
                deleteMany: {},
                create: variant.variantPrices?.map((vp) => ({
                  locationId: vp.locationId,
                  price: vp.price,
                  mrp: vp.mrp,
                })),
              },
            },
            create: {
              stock: variant.stock,
              sku: variant.sku || undefined,
              hsn: variant.hsn || undefined,
              sizeId: variant.sizeId === null ? null : variant.sizeId,
              colorId: variant.colorId === null ? null : variant.colorId,
              images: {
                create: variant.media.map((image) => ({
                  url: image.url,
                  mediaType: image.mediaType || "IMAGE", // Default to IMAGE for compatibility
                })),
              },
              variantPrices: {
                create: variant.variantPrices?.map((vp) => ({
                  locationId: vp.locationId,
                  price: vp.price,
                  mrp: vp.mrp,
                })),
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
    console.log("[PRODUCT_PATCH]", error);
    if (error.code === "P2002") {
      return new NextResponse("Slug or SKU or HSN already exists", {
        status: 400,
      });
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

    const product = await db.$transaction(async (prisma) => {
      await prisma.productSpecification.deleteMany({
        where: { productId: params.productId },
      });

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
    const locationId = searchParams.get("locationId");

    const product = await db.product.findUnique({
      where: {
        id: params.productId,
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
              where: locationId ? { locationId } : undefined,
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
                where: locationId ? { locationId } : undefined,
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
