import { Metadata } from "next";
import { format } from "date-fns";
import { db } from "@/lib/db";

import { SubCategoryColumn } from "@/components/store/utils/columns";
import { SubCategoryClient } from "@/components/store/utils/subcategory-client";

export const metadata: Metadata = {
  title: "Store | Subcategories",
};

const SubCategoriesPage = async ({
  params,
}: {
  params: { storeId: string };
}) => {
  const subCategories = await db.subCategory.findMany({
    where: {
      storeId: params.storeId,
    },
    include: {
      billboard: true,
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedSubCategory: SubCategoryColumn[] = subCategories.map(
    (item: any) => ({
      id: item.id,
      name: item.name,
      billboardLabel: item.billboard.label,
      categoryName: item.category.name,
      createdAt: format(item.createdAt, "MMMM do, yyyy"),
    })
  );

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SubCategoryClient data={formattedSubCategory} />
      </div>
    </div>
  );
};

export default SubCategoriesPage;
