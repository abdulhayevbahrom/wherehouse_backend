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
}

module.exports = new SupplierController();
