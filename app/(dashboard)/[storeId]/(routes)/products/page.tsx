import { Metadata } from "next";
import { format } from "date-fns";
import { db } from "@/lib/db";

import { ProductColumn } from "@/components/store/utils/columns";
import { ProductClient } from "@/components/store/utils/product-client";

// Helper to get hierarchical subcategory name
const getSubCategoryName = (subCategory: any, subCategories: any[]): string => {
  if (!subCategory?.parentId) return subCategory?.name || "None";
  const parent = subCategories.find((sub) => sub.id === subCategory.parentId);
  return parent
    ? `${getSubCategoryName(parent, subCategories)} > ${subCategory.name}`
    : subCategory.name;
};

export const metadata: Metadata = {
  title: "Store | Products",
};

const ProductsPage = async ({ params }: { params: { storeId: string } }) => {
  const products = await db.product.findMany({
    where: {
      storeId: params.storeId,
    },
    include: {
      category: true,
      subCategory: true,
      size: true,
      color: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const subCategories = await db.subCategory.findMany({
    where: {
      storeId: params.storeId,
    },
    include: {
      parent: true,
    },
  });

  const formattedProducts: ProductColumn[] = products.map((item) => ({
    id: item.id,
    name: item.name,
    isFeatured: item.isFeatured,
    isArchieved: item.isArchieved,
    price: item.price.toString(),
    stock: item.stock,
    category: item.category.name,
    subCategory: getSubCategoryName(item.subCategory, subCategories),
    size: item.size?.name || "None",
    color: item.color?.value || "None",
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ProductClient data={formattedProducts} />
      </div>
    </div>
  );
};

export default ProductsPage;
