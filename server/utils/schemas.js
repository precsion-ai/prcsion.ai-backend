import { z } from "zod";

export const priceRequestSchema = z.object({
    title: z.string().min(1, "title required"),
    description: z.string().min(1, "description required"),
    category: z.string().min(1, "category required"),
    brand: z.string().optional(),
    condition: z.string().optional(),
    size: z.string().optional(),
    material: z.string().optional()
});

export const priceResponseSchema = z.object({
    price: z.number().min(3).max(2000),
    currency: z.literal("USD"),
    confidence: z.number().min(0).max(1),
    lower: z.number().min(3).max(2000),
    upper: z.number().min(3).max(2000)
});



export const descriptionRequestSchema = z.object({
    title: z.string().min(1, "title required"),
    description: z.string().min(1, "description required"),
    style: z.enum(["minimal", "friendly", "streetwear", "professional"]).optional()
});

export const imageAnalyzeSchema = z.object({
    notes: z.string().max(600).optional()
});