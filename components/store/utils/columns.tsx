"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellActions } from "./cell-actions";
import { CategoryCellActions } from "./category-cell-actions";
import { SizeCellActions } from "./size-cell-actions";
import { ColorCellActions } from "./color-cell-actions";
import { ProductCellActions } from "./product-cell-actions";
import { SubCategoryCellActions } from "./subcategory-cell-actions";
import { ReviewCellActions } from "./review-cell-actions";
import { LocationCellActions } from "./location-cell-actions";
import { BrandCellActions } from "./brand-cell-actions";

export type Billboard = {
  id: string;
  label: string;
  createdAt: string;
};

export type ReviewColumn = {
  id: string;
  productName: string;
  userName: string;
  rating: number;
  text: string;
  imageCount: number;
  createdAt: string;
  productId: string;
};

export type BrandColumn = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export const reviewColumns: ColumnDef<ReviewColumn>[] = [
  {
    accessorKey: "productName",
    header: "Product Name",
  },
  {
    accessorKey: "userName",
    header: "User Name",
  },
  {
    accessorKey: "rating",
    header: "Rating",
  },
  {
    accessorKey: "text",
    header: "Review Text",
    cell: ({ row }) => (
      <div className="max-w-xs truncate">{row.original.text}</div>
    ),
  },
  {
    accessorKey: "imageCount",
    header: "Images",
    cell: ({ row }) => <div>{row.original.imageCount} image(s)</div>,
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
  },
  {
    id: "actions",
    cell: ({ row }) => <ReviewCellActions data={row.original} />,
  },
];

export const brandColumns: ColumnDef<BrandColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "slug",
    header: "Slug",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
  },
  {
    id: "actions",
    cell: ({ row }) => <BrandCellActions data={row.original} />,
  },
];

export const columns: ColumnDef<Billboard>[] = [
  {
    accessorKey: "label",
    header: "Label",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellActions data={row.original} />,
  },
];

export type CategoryColumn = {
  id: string;
  name: string;
  billboardLabel: string;
  createdAt: string;
  subCategories?: { id: string; name: string; billboardLabel: string }[];
};

export const categoryColumns: ColumnDef<CategoryColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "billboardLabel",
    header: "Billboard",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CategoryCellActions data={row.original} />,
  },
];

export type SubCategoryColumn = {
  id: string;
  name: string;
  billboardLabel: string;
  categoryName: string;
  parentName?: string; // Added for parent subcategory
  createdAt: string;
};

export const subCategoryColumns: ColumnDef<SubCategoryColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "billboardLabel",
    header: "Billboard",
  },
  {
    accessorKey: "categoryName",
    header: "Category",
  },
  {
    accessorKey: "parentName",
    header: "Parent Subcategory",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <SubCategoryCellActions data={row.original} />,
  },
];

export type SizeColumn = {
  id: string;
  name: string;
  value: string;
  createdAt: string;
};

export const sizeColumns: ColumnDef<SizeColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "value",
    header: "Value",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <SizeCellActions data={row.original} />,
  },
];

export type LocationColumn = {
  id: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
  createdAt: string;
  isCodAvailable: boolean;
};

export const locationColumns: ColumnDef<LocationColumn>[] = [
  {
    accessorKey: "pincode",
    header: "Pincode",
  },
  {
    accessorKey: "city",
    header: "City",
  },
  {
    accessorKey: "state",
    header: "State",
  },
  {
    accessorKey: "country",
    header: "Country",
  },
  {
    accessorKey: "isCodAvailable",
    header: "COD Available",
    cell: ({ row }) => (row.original.isCodAvailable ? "Yes" : "No"),
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
  },
  {
    id: "actions",
    cell: ({ row }) => <LocationCellActions data={row.original} />,
  },
];

export type ColorColumn = {
  id: string;
  name: string;
  value: string;
  createdAt: string;
};

export const colorColumns: ColumnDef<ColorColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "value",
    header: "Value",
    cell: ({ row }) => (
      <div className="flex items-center gap-x-2">
        {row.original.value}
        <div
          className="h-5 w-6 rounded-full"
          style={{ backgroundColor: row.original.value }}
        />
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <ColorCellActions data={row.original} />,
  },
];

export type ProductColumn = {
  id: string;
  name: string;
  isFeatured: boolean;
  isArchieved: boolean;
  price: string;
  stock: number;
  category: string;
  subCategory?: string;
  size: string;
  color?: string;
  createdAt: string;
};

export const productColumns: ColumnDef<ProductColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "price",
    header: "Price",
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "subCategory",
    header: "Subcategory",
  },
  {
    accessorKey: "stock",
    header: "Stock",
  },
  {
    accessorKey: "size",
    header: "Size",
  },
  {
    accessorKey: "isArchieved",
    header: "Archived",
  },
  {
    accessorKey: "isFeatured",
    header: "Featured",
  },
  // {
  //   accessorKey: "specifications",
  //   header: "Specifications",
  // },
  // {
  //   accessorKey: "color",
  //   header: "Color",
  //   cell: ({ row }) => (
  //     <div className="flex items-center">
  //       <div
  //         className="h-5 w-6 rounded-full"
  //         style={{ backgroundColor: row.original.color }}
  //       />
  //     </div>
  //   ),
  // },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <ProductCellActions data={row.original} />,
  },
];

export type OrderColumn = {
  id: string;
  phone: string;
  address: string;
  isPaid: boolean;
  products: string;
  totalPrice: string;
  createdAt: string;
};

export const orderColumns: ColumnDef<OrderColumn>[] = [
  {
    accessorKey: "products",
    header: "Products",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "address",
    header: "Address",
  },
  {
    accessorKey: "totalPrice",
    header: "Total Price",
  },
  {
    accessorKey: "isPaid",
    header: "Paid",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
];
