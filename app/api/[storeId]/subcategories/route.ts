import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SubCategorySchema } from "@/schemas/subcategory-form-schema";
import { NextResponse } from "next/server";

// Helper to prevent cycles
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

export async function POST(
  request: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const session = await auth();
    const body = await request.json();
    const validatedData = SubCategorySchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse("Invalid data provided", { status: 400 });
    }

    const { name, billboardId, bannerImage, categoryId, parentId } =
      validatedData.data;

    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized Access", { status: 401 });
    }

    if (!params.storeId) {
      return new NextResponse("Store Id is required", { status: 400 });
    }

    const storeById = await db.store.findUnique({
      where: { id: params.storeId },
    });

    if (!storeById) {
      return new NextResponse("Store does not exist", { status: 404 });
    }

    // Validate parentId
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
      if (!(await isValidParent(null, parentId))) {
        return new NextResponse("Invalid parent subcategory: creates a cycle", {
          status: 400,
        });
      }
    }

    const subCategory = await db.subCategory.create({
      data: {
        name,
        billboardId,
        bannerImage,
        categoryId,
        parentId,
        storeId: params.storeId,
      },
    });

    return NextResponse.json(subCategory);
  } catch (error) {
    console.log("[SUBCATEGORIES_POST]", error);
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

    const subCategories = await db.subCategory.findMany({
      where: {
        storeId: params.storeId,
      },
      include: {
        billboard: true,
        category: true,
        parent: true,
        childSubCategories: true,
      },
    });

    return NextResponse.json(subCategories);
  } catch (error) {
    console.log("[SUBCATEGORIES_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
