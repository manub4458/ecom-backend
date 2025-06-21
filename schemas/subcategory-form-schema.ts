import * as z from "zod";

export const SubCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(60, "Slug must be at most 60 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  billboardId: z.string().min(1, "Billboard is required"),
  bannerImage: z.string().url("Invalid URL").min(1, "Banner image is required"),
  categoryId: z.string().min(1, "Category is required"),
  parentId: z.string().optional(),
});
