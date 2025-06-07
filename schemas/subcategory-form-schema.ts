import * as z from "zod";

export const SubCategoryFormSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required",
  }),
  bannerImage: z.string().min(1, {
    message: "Banner Image is required",
  }),
  billboardId: z.string().min(1, {
    message: "Billboard is required",
  }),
  categoryId: z.string().min(1, {
    message: "Category is required",
  }),
});
