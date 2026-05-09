import { z } from "zod";

export const reportReasonSchema = z.enum([
  "SPAM",
  "HARASSMENT",
  "HATE",
  "VIOLENCE",
  "NSFW",
  "MISINFORMATION",
  "OTHER",
]);

const reportHelpers = {};

export default reportHelpers;
