const Category = require("../model/Category");
const Transaction = require("../model/Transaction");
const mongoose = require("mongoose");

const normalizeName = (value) => value.trim().toLowerCase();

const listCategories = async (req, res) => {
  try {
    const userId = req.user;
    const { type } = req.query;
    const match = { userId: new mongoose.Types.ObjectId(userId) };
    if (type) match.type = type;

    const categories = await Category.find(match).sort({ name: 1 });

    const parentMap = new Map();
    const childrenMap = new Map();

    categories.forEach((cat) => {
      if (cat.parentId) {
        const key = cat.parentId.toString();
        if (!childrenMap.has(key)) childrenMap.set(key, []);
        childrenMap.get(key).push(cat);
      } else {
        parentMap.set(cat._id.toString(), { ...cat.toObject(), subCategories: [] });
      }
    });

    parentMap.forEach((parent, id) => {
      if (childrenMap.has(id)) {
        parent.subCategories = childrenMap.get(id);
      }
    });

    res.status(200).json({ items: Array.from(parentMap.values()) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const userId = req.user;
    const { name, type, parentId, isDefault } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    let parent = null;
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ message: "Invalid parentId" });
      }
      parent = await Category.findOne({
        _id: parentId,
        userId: new mongoose.Types.ObjectId(userId),
        type,
      });
      if (!parent) {
        return res.status(404).json({ message: "Parent category not found" });
      }
    }

    const doc = await Category.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: normalizeName(name),
      type,
      parentId: parent ? parent._id : null,
      isDefault: Boolean(isDefault),
    });

    res.status(201).json({ message: "Category created", category: doc });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Category already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const userId = req.user;
    const { id } = req.params;
    const { name, isDefault } = req.body;

    const update = {};
    if (name) update.name = normalizeName(name);
    if (isDefault !== undefined) update.isDefault = Boolean(isDefault);

    const updated = await Category.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(userId) },
      { $set: update },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category updated", category: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Category already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const userId = req.user;
    const { id } = req.params;

    const hasChildren = await Category.exists({
      parentId: id,
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (hasChildren) {
      return res.status(400).json({ message: "Category has subcategories" });
    }

    const usedInTransactions = await Transaction.exists({
      userId: new mongoose.Types.ObjectId(userId),
      $or: [{ categoryId: id }, { subcategoryId: id }],
      isDeleted: false,
    });
    if (usedInTransactions) {
      return res.status(400).json({ message: "Category is used in transactions" });
    }

    const deleted = await Category.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
