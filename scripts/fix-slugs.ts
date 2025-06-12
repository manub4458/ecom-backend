import { MongoClient, ObjectId } from "mongodb";
import slugify from "slugify";

// Replace with your MongoDB connection string from .env
const uri =
  process.env.DATABASE_URL ||
  "mongodb+srv://piyushthakur:piyush@cluster0.wqwnd2u.mongodb.net/ecommerce-admin";
const client = new MongoClient(uri);

async function generateUniqueSlug(
  name: string,
  collection: any,
  excludeId?: string
): Promise<string> {
  let baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = {
      slug,
      ...(excludeId && { _id: { $ne: new ObjectId(excludeId) } }),
    };
    const existing = await collection.findOne(query);
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function updateSlugs() {
  try {
    await client.connect();
    const db = client.db("ecommerce-admin");

    // Update Products
    const productsCollection = db.collection("Product");
    const products = await productsCollection.find().toArray();
    for (const product of products) {
      if (!product.slug) {
        const slug = await generateUniqueSlug(
          product.name,
          productsCollection,
          product._id.toString()
        );
        await productsCollection.updateOne(
          { _id: product._id },
          { $set: { slug } }
        );
        console.log(`Updated product: ${product.name} -> ${slug}`);
      }
    }

    // Update Categories
    const categoriesCollection = db.collection("Category");
    const categories = await categoriesCollection.find().toArray();
    for (const category of categories) {
      if (!category.slug) {
        const slug = await generateUniqueSlug(
          category.name,
          categoriesCollection,
          category._id.toString()
        );
        await categoriesCollection.updateOne(
          { _id: category._id },
          { $set: { slug } }
        );
        console.log(`Updated category: ${category.name} -> ${slug}`);
      }
    }

    // Update SubCategories
    const subCategoriesCollection = db.collection("SubCategory");
    const subCategories = await subCategoriesCollection.find().toArray();
    for (const subCategory of subCategories) {
      if (!subCategory.slug) {
        const slug = await generateUniqueSlug(
          subCategory.name,
          subCategoriesCollection,
          subCategory._id.toString()
        );
        await subCategoriesCollection.updateOne(
          { _id: subCategory._id },
          { $set: { slug } }
        );
        console.log(`Updated subcategory: ${subCategory.name} -> ${slug}`);
      }
    }

    console.log("Slug update completed successfully.");
  } catch (error) {
    console.error("Error updating slugs:", error);
  } finally {
    await client.close();
  }
}

updateSlugs();
