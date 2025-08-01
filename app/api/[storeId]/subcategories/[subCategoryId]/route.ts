import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SubCategorySchema } from "@/schemas/subcategory-form-schema";
import { NextResponse } from "next/server";

async function isValidParent(
  subCategoryId: string | null,
  parentId: string
): Promise<boolean> {
  if (!parentId) return true;
  let currentId = parentId;
  while (currentId) {
    if (currentId === subCategoryId) return false; // Cycle detected
    const parent = await db.subCategory.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    //@ts-ignore
    currentId = parent?.parentId || null;
  }
  return true;
}

export async function PATCH(
  request: Request,
  { params }: { params: { storeId: string; subCategoryId: string } }
) {
  try {
    const session = await auth();
    const body = await request.json();
    const validatedData = SubCategorySchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse("Invalid attributes", { status: 400 });
    }

    const { name, slug, billboardId, bannerImage, categoryId, parentId } =
      validatedData.data;

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
      where: { id: params.storeId },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    // Validate parentId
    if (parentId === params.subCategoryId) {
      return new NextResponse("A subcategory cannot be its own parent", {
        status: 400,
      });
    }

    if (parentId) {
      const parentSubCategory = await db.subCategory.findUnique({
        where: { id: parentId },
      });
      if (!parentSubCategory) {
        return new NextResponse("Invalid parent subcategory", { status: 400 });
      }
      if (parentSubCategory.categoryId !== categoryId) {
        return new NextResponse(
          "Parent subcategory must belong to the selected category",
          { status: 400 }
        );
      }
      if (!(await isValidParent(params.subCategoryId, parentId))) {
        return new NextResponse("Invalid parent subcategory: creates a cycle", {
          status: 400,
        });
      }
    }

    const subCategory = await db.subCategory.update({
      where: { id: params.subCategoryId },
      data: {
        name,
        slug,
        billboardId,
        bannerImage,
        categoryId,
        parentId,
      },
    });

    return NextResponse.json(subCategory);
  } catch (error: any) {
    console.log("[SUBCATEGORY_PATCH]", error);
    if (error.code === "P2002") {
      return new NextResponse("Slug already exists", { status: 400 });
    }
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
      where: { id: params.storeId },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    // Check for child subcategories
    const childSubCategories = await db.subCategory.findMany({
      where: { parentId: params.subCategoryId },
    });

    if (childSubCategories.length > 0) {
      return new NextResponse(
        "Cannot delete subcategory with child subcategories",
        { status: 400 }
      );
    }

    const subCategory = await db.subCategory.delete({
      where: { id: params.subCategoryId },
    });

    return NextResponse.json(subCategory);
  } catch (error) {
    console.log("[SUBCATEGORY_DELETE]", error);
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
      where: { id: params.subCategoryId },
      include: {
        billboard: true,
        category: true,
        parent: true,
        childSubCategories: true,
      },
    });

    return NextResponse.json(subCategory);
  } catch (error) {
    console.log("[SUBCATEGORY_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
