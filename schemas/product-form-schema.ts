import * as z from "zod";

export const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(60, "Slug must be at most 60 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  price: z.number().min(0, "Price must be non-negative"),
  about: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  sizeAndFit: z.array(z.string()).optional(),
  materialAndCare: z.array(z.string()).optional(),
  enabledFeatures: z.array(z.string()).optional(),
  isFeatured: z.boolean().default(false),
  isArchieved: z.boolean().default(false),
  stock: z.number().min(0, "Stock must be non-negative").default(0),
  categoryId: z.string().min(1, "Category is required"),
  subCategoryId: z.string().optional(),
  sizeId: z.string().optional(),
  colorId: z.string().optional(),
  productImages: z
    .array(z.string().url("Invalid URL"))
    .min(1, "At least one image is required"),
  specifications: z
    .array(
      z.object({
        specificationFieldId: z
          .string()
          .min(1, "Specification field is required"),
        value: z.string().min(1, "Value is required"),
      })
    )
    .optional(),
});
