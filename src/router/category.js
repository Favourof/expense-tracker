const express = require("express");
const { verifyToken } = require("../middleWare/verifyToken");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controller/category");
const {
  validateCreateCategory,
  validateUpdateCategory,
} = require("../validation/categoryValidator");

const router = express.Router();

router.get("/", verifyToken, listCategories);
router.post("/", verifyToken, validateCreateCategory, createCategory);
router.patch("/:id", verifyToken, validateUpdateCategory, updateCategory);
router.delete("/:id", verifyToken, deleteCategory);

module.exports = router;
