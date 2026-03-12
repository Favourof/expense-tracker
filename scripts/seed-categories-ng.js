const mongoose = require("mongoose");
const env = require("../config/env");
const Category = require("../src/model/Category");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach((arg) => {
    const [key, value] = arg.split("=");
    if (key && value !== undefined) out[key] = value;
  });
  return out;
};

const defaults = {
  expense: {
    Food: ["Groceries", "Restaurants", "Snacks", "Drinks"],
    Transport: ["Fuel", "Ride-hailing", "Public transport", "Repairs"],
    Housing: ["Rent", "Electricity", "Water", "Internet", "Maintenance"],
    Utilities: ["Power", "Gas", "Waste", "Cable TV"],
    Health: ["Hospital", "Pharmacy", "Insurance"],
    Education: ["Tuition", "Books", "Courses"],
    Family: ["Childcare", "Support", "Gifts"],
    Lifestyle: ["Entertainment", "Gym", "Subscriptions"],
    Shopping: ["Clothing", "Accessories", "Electronics"],
    Business: ["Inventory", "Supplies", "Marketing"],
    Savings: ["Emergency fund", "Investments"],
    Giving: ["Tithes", "Charity"],
  },
  income: {
    Salary: ["Monthly salary", "Bonus"],
    Business: ["Sales", "Services"],
    Freelance: ["Projects", "Consulting"],
    Gifts: ["Family", "Friends"],
    Investments: ["Dividends", "Interest"],
  },
};

const seed = async () => {
  const args = parseArgs();
  const userId = args.userId || process.env.SEED_USER_ID;

  if (!userId) {
    console.error("Missing userId. Use userId=<id> or set SEED_USER_ID.");
    process.exit(1);
  }

  await mongoose.connect(env.mongoURL);

  const created = [];

  for (const [type, groups] of Object.entries(defaults)) {
    for (const [parentName, children] of Object.entries(groups)) {
      const parent = await Category.findOneAndUpdate(
        {
          userId,
          type,
          parentId: null,
          name: parentName.toLowerCase(),
        },
        {
          $setOnInsert: {
            userId,
            type,
            name: parentName.toLowerCase(),
            parentId: null,
            isDefault: true,
          },
        },
        { upsert: true, new: true }
      );
      created.push(parent);

      for (const childName of children) {
        const child = await Category.findOneAndUpdate(
          {
            userId,
            type,
            parentId: parent._id,
            name: childName.toLowerCase(),
          },
          {
            $setOnInsert: {
              userId,
              type,
              name: childName.toLowerCase(),
              parentId: parent._id,
              isDefault: true,
            },
          },
          { upsert: true, new: true }
        );
        created.push(child);
      }
    }
  }

  console.log(`Seeded ${created.length} categories for user ${userId}.`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
