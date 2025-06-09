import * as z from "zod";

export const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().min(0, "Price must be non-negative"),
  about: z.string().min(1, "About is required"),
  description: z.string().min(1, "Description is required"),
  sizeAndFit: z.array(z.string()).optional(),
  materialAndCare: z.array(z.string()).optional(),
  isFeatured: z.boolean().default(false),
  isArchieved: z.boolean().default(false),
  stock: z.number().min(0, "Stock must be non-negative").default(0),
  categoryId: z.string().min(1, "Category is required"),
  subCategoryId: z.string().optional(), // Supports top-level or child subcategories
  sizeId: z.string().optional(),
  colorId: z.string().optional(),
  productImages: z
    .array(z.string().url("Invalid URL"))
    .min(1, "At least one image is required"),
});
