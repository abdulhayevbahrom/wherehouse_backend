const Ombor = require("../model/omborModel.js");
const response = require("../utils/response");
const Supplier = require("../model/supplierModel");

class OmborController {
  async getAll(req, res) {
    try {
      // const products = await Ombor.aggregate([
      //   {
      //     $lookup: {
      //       from: "suppliers",
      //       localField: "supplier",
      //       foreignField: "_id",
      //       as: "supplier",
      //     },
      //   },
      //   { $unwind: "$supplier" },
      //   { $unwind: { path: "$products", preserveNullAndEmptyArrays: false } }, // product bo‘lsa chiqaradi
      //   {
      //     $match: {
      //       "products.quantity": { $gt: 0 }, // quantity 0 bo‘lmaganlarni oladi
      //     },
      //   },
      //   {
      //     $project: {
      //       _id: "$products._id",
      //       title: "$products.title",
      //       quantity: "$products.quantity",
      //       price: "$products.price",
      //       total: { $multiply: ["$products.quantity", "$products.price"] },
      //       supplier: "$supplier",
      //       totalPrice: "$totalPrice",
      //       paidAmount: "$paidAmount",
      //       debtAmount: { $subtract: ["$totalPrice", "$paidAmount"] },
      //     },
      //   },
      // ]);

      const products = await Ombor.aggregate([
        {
          $lookup: {
            from: "suppliers",
            localField: "supplier",
            foreignField: "_id",
            as: "supplier",
          },
        },
        { $unwind: "$supplier" },
        { $unwind: { path: "$products", preserveNullAndEmptyArrays: false } },
        {
          $match: {
            "products.quantity": { $gt: 0 },
          },
        },
        {
          $group: {
            _id: {
              title: { $trim: { input: "$products.title" } },
              price: "$products.price",
              supplier: "$supplier._id",
            },
            quantity: { $sum: "$products.quantity" },
            total: {
              $sum: { $multiply: ["$products.quantity", "$products.price"] },
            },
            supplier: { $first: "$supplier" },
            productId: { $first: "$products._id" }, // faqat 1 ta mahsulot id oladi
          },
        },
        {
          $project: {
            _id: "$productId",
            title: "$_id.title",
            price: "$_id.price",
            quantity: 1,
            total: 1,
            supplier: 1,
          },
        },
      ]);

      if (!products.length) {
        return response.notFound(res, "Mahsulotlar topilmadi");
      }

      return response.success(res, "Mahsulotlar ro'yxati", products);
    } catch (error) {
      return response.serverError(res, "Server xatosi", error.message);
    }
  }

  // get by supplier id
  async getBySupplier(req, res) {
    try {
      let { id } = req.params;
      let data = await Ombor.find({
        supplier: id,
        products: { $ne: [] },
        debtAmount: { $ne: 0 },
      });

      if (!data.length) {
        return response.notFound(res, "Mahsulotlar topilmadi");
      }
      return response.success(res, "Mahsulotlar ro'yxati", data);
    } catch (error) {
      return response.serverError(res, "Server xatosi", error.message);
    }
  }

  // create
  async create(req, res) {
    try {
      const { supplier, products, paidAmount } = req.body;

      // Jami summa hisoblash
      const totalPrice = products?.reduce(
        (sum, p) => sum + p.price * p.quantity,
        0
      );

      let supplierDoc;

      if (supplier._id) {
        // Mavjud supplier bo'lsa
        supplierDoc = await Supplier.findById(supplier._id);
        if (!supplierDoc) {
          return response.notFound(res, "Taminotchi topilmadi");
        }
      } else {
        // Yangi supplier bo'lsa (fullname, phone)
        supplierDoc = await Supplier.findOne({ phone: supplier.phone });
        if (!supplierDoc) {
          supplierDoc = await Supplier.create({
            fullname: supplier.fullname,
            phone: supplier.phone,
          });
        }
      }

      // Ombor yozuvini yaratish
      const ombor = await Ombor.create({
        supplier: supplierDoc._id,
        products: products.map((p) => ({ ...p, org_qty: p.quantity })),
        totalPrice,
        paidAmount,
      });

      // Supplier balansini yangilash
      supplierDoc.balance += paidAmount - totalPrice;
      await supplierDoc.save();

      return response.created(res, "Mahsulot muvaffaqiyatli qo'shildi", ombor);
    } catch (error) {
      return response.serverError(res, error.message, error);
    }
  }

  // delete
  async delete(req, res) {
    try {
      const { id } = req.params;
      let result = await Ombor.findByIdAndDelete(id);
      if (!result) return response.notFound(res, "Mahsulot topilmadi");
      return response.success(res, "Mahsulot muvaffaqiyatli o'chirildi");
    } catch (error) {
      return response.serverError(res, "Server xatosi", error.message);
    }
  }

  // update
  async update(req, res) {
    try {
      const { id } = req.params;
      const updated = await Ombor.findByIdAndUpdate(id, req.body, {
        new: true,
      });
      if (!updated) return response.notFound(res, "Mahsulot topilmadi");
      return response.success(res, "Mahsulot yangilandi", updated);
    } catch (error) {
      return response.serverError(res, "Server xatosi", error.message);
    }
  }

  async paySupplierDebt(req, res) {
    try {
      const { supplierId, omborId } = req.params;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return response.error(res, "To'lov summasi noto'g'ri");
      }

      // Supplierni olish
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) return response.notFound(res, "Supplier topilmadi");

      // Omborni olish
      const ombor = await Ombor.findById(omborId);
      if (!ombor) return response.notFound(res, "Ombor yozuvi topilmadi");

      // Ombordagi qarzdan ko‘p to‘lab bo‘lmaydi
      if (amount > ombor.debtAmount) {
        return response.error(res, "Qarzdan ko'p to'lash mumkin emas");
      }

      // Omborni yangilash
      ombor.paidAmount += amount;
      ombor.debtAmount = ombor.totalPrice - ombor.paidAmount;
      await ombor.save();

      // Supplier balansini yangilash
      supplier.balance += amount; // qarz kamayadi → balans oshadi
      await supplier.save();

      return response.success(res, "To'lov muvaffaqiyatli bajarildi", {
        supplier,
        ombor,
      });
    } catch (error) {
      return response.serverError(res, error.message, error);
    }
  }
}

module.exports = new OmborController();
