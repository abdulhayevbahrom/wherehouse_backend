const Suppliers = require("../model/supplierModel");
const Ombor = require("../model/omborModel");
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

  // async getSuppliersDebts(req, res) {
  //   try {
  //     // 1. Barcha supplierlarni olish
  //     const suppliers = await Suppliers.find().lean();

  //     // 2. Har bir supplier bo‘yicha hisoblash
  //     const results = [];

  //     for (let sup of suppliers) {
  //       // jami to‘lov (payments summasi)
  //       const totalPayments =
  //         sup.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  //       // Ombordagi barcha kirimlarni olish
  //       const ombor = await Ombor.find({ supplier: sup._id }).lean();

  //       // jami mahsulotlar puli
  //       const totalProductsPrice = ombor.reduce(
  //         (sum, o) => sum + (o.totalPrice || 0),
  //         0
  //       );

  //       // qarz hisoblash
  //       const debt = sup.initialDebt + totalProductsPrice - totalPayments;

  //       results.push({
  //         supplierId: sup._id,
  //         fullname: sup.fullname,
  //         phone: sup.phone,
  //         totalPayments,
  //         totalProductsPrice,
  //         debt: debt > 0 ? debt : 0, // qarz manfiy bo‘lsa 0
  //       });
  //     }
  //     return response.success(res, "Supplierlar ro'yxati", results);
  //   } catch (error) {
  //     return response.serverError(res, "Server xatosi", error.message);
  //   }
  // }

  // async payToSupplier(req, res) {
  //   try {
  //     const { supplierId, amount } = req.body; // to‘lov summasi

  //     if (!supplierId || !amount || amount <= 0) {
  //       return res.status(400).json({ error: "To'lov summasi noto'g'ri" });
  //     }

  //     // 1. Supplierni topamiz
  //     const supplier = await Suppliers.findById(supplierId);
  //     if (!supplier) return response.notFound(res, "Supplier topilmadi");

  //     // 2. To‘lovni payments ga qo‘shish
  //     supplier.payments.push({ amount, date: new Date() });

  //     // supplier.balance -= amount; // balansdan chiqib ketdi
  //     await supplier.save();

  //     return response.success(res, "To'lov muvaffaqiyatli amalga oshirildi");
  //   } catch (err) {
  //     response.serverError(res, "Server xatosi", err.message);
  //   }
  // }

  async getSuppliersDebts(req, res) {
    try {
      // 1. Barcha supplierlarni olish
      const suppliers = await Suppliers.find().lean();

      // 2. Har bir supplier bo‘yicha hisoblash
      const results = [];

      for (let sup of suppliers) {
        // jami to‘lov (payments summasi)
        const totalPayments =
          sup.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

        // Ombordagi barcha kirimlarni olish
        const ombor = await Ombor.find({ supplier: sup._id }).lean();

        // jami mahsulotlar puli
        const totalProductsPrice = ombor.reduce(
          (sum, o) => sum + (o.totalPrice || 0),
          0
        );

        // qarz hisoblash
        const debt = sup.initialDebt + totalProductsPrice - totalPayments;

        // ❗ faqat qarz bo‘lsa qo‘shamiz
        if (debt > 0) {
          results.push({
            supplierId: sup._id,
            fullname: sup.fullname,
            phone: sup.phone,
            totalPayments,
            totalProductsPrice,
            debt,
            initialDebt: sup.initialDebt,
            payments: sup.payments || [],
          });
        }
      }

      return response.success(res, "Qarzdor supplierlar ro'yxati", results);
    } catch (error) {
      return response.serverError(res, "Server xatosi", error.message);
    }
  }

  // async payToSupplier(req, res) {
  //   try {
  //     const { supplierId, amount } = req.body; // to‘lov summasi

  //     if (!supplierId || !amount || amount <= 0) {
  //       return res.status(400).json({ error: "To'lov summasi noto'g'ri" });
  //     }

  //     // 1. Supplierni topamiz
  //     const supplier = await Suppliers.findById(supplierId);
  //     if (!supplier) return response.notFound(res, "Supplier topilmadi");

  //     let remainingPayment = amount;

  //     // 2. Avval initialDebt ni kamaytirish
  //     if (supplier.initialDebt > 0) {
  //       if (remainingPayment >= supplier.initialDebt) {
  //         // initialDebt to‘liq yopildi
  //         remainingPayment -= supplier.initialDebt;
  //         supplier.initialDebt = 0;
  //       } else {
  //         // faqat qisman yopildi
  //         supplier.initialDebt -= remainingPayment;
  //         remainingPayment = 0;
  //       }
  //     }

  //     // 3. Payments ga yozib qo‘yamiz (butun summa yoziladi, tarix uchun)
  //     // supplier.payments.push({ amount, date: new Date() });

  //     // 4. Saqlash
  //     await supplier.save();

  //     return response.success(res, "To'lov muvaffaqiyatli amalga oshirildi", {
  //       initialDebt: supplier.initialDebt,
  //       payment: amount,
  //       usedForDebt: amount - remainingPayment,
  //       remainingPayment,
  //     });
  //   } catch (err) {
  //     response.serverError(res, "Server xatosi", err.message);
  //   }
  // }

  async payToSupplier(req, res) {
    try {
      const { supplierId, amount } = req.body; // to‘lov summasi

      if (!supplierId || !amount || amount <= 0) {
        return res.status(400).json({ error: "To'lov summasi noto'g'ri" });
      }

      // 1. Supplierni topamiz
      const supplier = await Suppliers.findById(supplierId);
      if (!supplier) return response.notFound(res, "Supplier topilmadi");

      let remainingPayment = amount;
      let usedForDebt = 0;

      // 2. Avval initialDebt ni kamaytirish
      if (supplier.initialDebt > 0) {
        if (remainingPayment >= supplier.initialDebt) {
          // initialDebt to‘liq yopildi
          usedForDebt = supplier.initialDebt;
          remainingPayment -= supplier.initialDebt;
          supplier.initialDebt = 0;
        } else {
          // faqat qisman yopildi
          usedForDebt = remainingPayment;
          supplier.initialDebt -= remainingPayment;
          remainingPayment = 0;
        }
      }

      // 3. Agar qarzdan ortgan bo‘lsa payments ga yoziladi
      if (remainingPayment > 0) {
        supplier.payments.push({ amount: remainingPayment, date: new Date() });
      }

      // 4. Saqlash
      await supplier.save();

      return response.success(res, "To'lov muvaffaqiyatli amalga oshirildi", {
        initialDebt: supplier.initialDebt,
        payment: amount,
        usedForDebt,
        addedToPayments: remainingPayment,
      });
    } catch (err) {
      response.serverError(res, "Server xatosi", err.message);
    }
  }
}

module.exports = new SupplierController();
