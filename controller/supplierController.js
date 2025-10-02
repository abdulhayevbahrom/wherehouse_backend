const Suppliers = require("../model/supplierModel");
const response = require("../utils/response");

class SupplierController {
  async getAll(req, res) {
    try {
      const suppliers = await Suppliers.find();
      if (!suppliers.length)
        return response.notFound(res, "Foydalanuvchilar topilmadi");
      return response.success(res, "Foydalanuvchilar ro'yxati", suppliers);
    } catch (error) {
      return response.serverError(res, "Server xatosi", error.message);
    }
  }

  // Supplierlarni olish (qarzdor/haqdor holati bilan)
  async getSuppliers(req, res) {
    try {
      const suppliers = await Suppliers.find({ balance: { $ne: 0 } }).lean();

      const result = suppliers.map((s) => ({
        ...s,
        status: s.balance < 0 ? "qarzdor" : "haqdor",
      }));

      return response.success(res, "Supplierlar ro'yxati", result);
    } catch (error) {
      return response.serverError(res, error.message, error);
    }
  }

  // update
  async updateSupplier(req, res) {
    try {
      const { id } = req.params;
      const updated = await Suppliers.findByIdAndUpdate(id, req.body, {
        new: true,
      });
      if (!updated) return response.notFound(res, "Supplier topilmadi");
      return response.success(res, "Supplier yangilandi", updated);
    } catch (error) {
      return response.serverError(res, "Server xatosi", error.message);
    }
  }
}

module.exports = new SupplierController();
