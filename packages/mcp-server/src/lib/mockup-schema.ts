/**
 * Zod schemas for screen mockup YAML layout blocks.
 * Validates structured YAML that AI generates in screen-design.md section 1.
 */

import { z } from "zod";

export const ComponentType = z.enum([
  "text-input", "password-input", "textarea", "select", "checkbox", "radio",
  "button", "link", "table", "card", "nav", "sidebar", "search-bar",
  "pagination", "image-placeholder", "logo", "text", "icon-button",
  "number-input", "date-input", "toggle", "breadcrumb", "tabs", "stat-card",
  "chart-placeholder", "badge", "avatar", "alert",
]);

export const LayoutType = z.enum([
  "form", "dashboard", "list", "detail", "modal", "wizard",
]);

export const Viewport = z.enum(["desktop", "tablet", "mobile"]);

export const ButtonVariant = z.enum(["primary", "secondary", "danger"]);

export const ComponentSchema = z.object({
  n: z.number().int().positive(),
  type: ComponentType,
  label: z.string(),
  required: z.boolean().optional(),
  variant: ButtonVariant.optional(),
  width: z.enum(["sm", "md", "lg", "full"]).optional(),
  active: z.boolean().optional(),
}).passthrough();

export const RegionSchema = z.object({
  style: z.enum(["row", "grid"]).optional(),
  width: z.string().optional(),
  components: z.array(ComponentSchema),
}).passthrough();

export const ScreenLayoutSchema = z.object({
  layout_type: LayoutType,
  viewport: Viewport.default("desktop"),
  screen_id: z.string().regex(/^[A-Za-z0-9_-]+$/, "screen_id must be alphanumeric, hyphens, or underscores only").optional(),
  screen_name: z.string().optional(),
  regions: z.record(z.string(), RegionSchema),
}).passthrough().superRefine((data, ctx) => {
  // All n values must be unique across all regions
  const seen = new Set<number>();
  for (const [regionName, region] of Object.entries(data.regions)) {
    for (const comp of region.components) {
      if (seen.has(comp.n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate annotation number n=${comp.n} in region "${regionName}"`,
          path: ["regions", regionName],
        });
      }
      seen.add(comp.n);
    }
  }
});

export type ScreenLayout = z.infer<typeof ScreenLayoutSchema>;
export type ScreenComponent = z.infer<typeof ComponentSchema>;
export type ScreenRegion = z.infer<typeof RegionSchema>;
export type ComponentWidth = "sm" | "md" | "lg" | "full";
export type RegionStyle = "row" | "grid";
