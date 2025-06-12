import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/slugify";

async function updateSlugs() {
  try {
    // Update Products
    const products = await db.product.findMany();
    for (const product of products) {
      if (!product.slug) {
        const slug = await generateUniqueSlug(
          product.name,
          "Product",
          product.id
        );
        await db.product.update({
          where: { id: product.id },
          data: { slug },
        });
        console.log(`Updated product: ${product.name} -> ${slug}`);
      }
    }

    // Update Categories
    const categories = await db.category.findMany();
    for (const category of categories) {
      if (!category.slug) {
        const slug = await generateUniqueSlug(
          category.name,
          "Category",
          category.id
        );
        await db.category.update({
          where: { id: category.id },
          data: { slug },
        });
        console.log(`Updated category: ${category.name} -> ${slug}`);
      }
    }

    // Update SubCategories
    const subCategories = await db.subCategory.findMany();
    for (const subCategory of subCategories) {
      if (!subCategory.slug) {
        const slug = await generateUniqueSlug(
          subCategory.name,
          "SubCategory",
          subCategory.id
        );
        await db.subCategory.update({
          where: { id: subCategory.id },
          data: { slug },
        });
        console.log(`Updated subcategory: ${subCategory.name} -> ${slug}`);
      }
    }

    console.log("Slug update completed successfully.");
  } catch (error) {
    console.error("Error updating slugs:", error);
  } finally {
    await db.$disconnect();
  }
}

updateSlugs();
