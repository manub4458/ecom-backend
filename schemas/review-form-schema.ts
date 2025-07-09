import { z } from "zod";

export const ReviewSchema = z.object({
  userName: z.string().min(1, "User name is required"),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  text: z.string().min(1, "Review text is required"),
  images: z.array(z.string().url("Invalid image URL")).optional().default([]),
  userId: z.string().min(1, "User ID is required"),
});
