import * as z from "zod";

export const LocationFormSchema = z.object({
  pincode: z.string().min(1, {
    message: "Pincode is required",
  }),
  city: z.string().min(1, {
    message: "City is required",
  }),
  state: z.string().min(1, {
    message: "State is required",
  }),
  country: z.string().min(1, {
    message: "Country is required",
  }),
  isCodAvailable: z.boolean({
    required_error: "Cash on Delivery availability is required",
  }),
  deliveryDays: z.number().min(1, {
    message: "Delivery days must be at least 1",
  }),
});
