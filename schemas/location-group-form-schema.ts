import * as z from "zod";

export const LocationGroupFormSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required",
  }),
  locationIds: z.array(z.string()).optional(),
});
