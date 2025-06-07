import { SubCategoryForm } from "@/components/store/forms/subcategory-form";
import { db } from "@/lib/db";

const SubCategoryPage = async ({
  params,
}: {
  params: { subCategoryId: string; storeId: string };
}) => {
  let subCategory = null;

  if (params.subCategoryId !== "create") {
    try {
      subCategory = await db.subCategory.findUnique({
        where: {
          id: params.subCategoryId,
        },
        include: {
          billboard: true,
          category: true,
        },
      });
    } catch (error) {
      console.error("[SUBCATEGORY_PAGE] Error fetching subcategory:", error);
    }
  }

  const billboards = await db.billBoard.findMany({
    where: {
      storeId: params.storeId,
    },
  });

  const categories = await db.category.findMany({
    where: {
      storeId: params.storeId,
    },
  });

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SubCategoryForm
          data={subCategory}
          billboards={billboards}
          categories={categories}
        />
      </div>
    </div>
  );
};

export default SubCategoryPage;
