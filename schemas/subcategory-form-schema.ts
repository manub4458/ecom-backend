import * as z from "zod";

export const SubCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  billboardId: z.string().min(1, "Billboard is required"),
  bannerImage: z.string().url("Invalid URL").min(1, "Banner image is required"),
  categoryId: z.string().min(1, "Category is required"),
  parentId: z.string().optional(),
});
