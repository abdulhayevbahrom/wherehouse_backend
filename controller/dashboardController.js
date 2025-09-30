const moment = require("moment");
const Expense = require("../model/expenseModel");
const Sale = require("../model/transactionModel");
const Ombor = require("../model/omborModel");
const response = require("../utils/response");

exports.getDashboard = async (req, res) => {
  try {
    const { month } = req.query;
    const start = moment(month, "YYYY-MM").startOf("month").toDate();
    const end = moment(month, "YYYY-MM").endOf("month").toDate();

    // Harajatlar summasi
    const expenses = await Expense.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$type", // kirim va chiqim bo‘yicha guruhlash
          total: { $sum: "$amount" },
        },
      },
    ]);

    const sales = await Sale.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
        },
      },
      {
        $unwind: "$products",
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$products.totalPrice" }, // jami sotuv summasi
          totalQuantity: { $sum: "$products.quantity" }, // jami sotilgan dona
        },
      },
    ]);

    // Qarz summasi (joriy oy uchun)
    const debts = await Ombor.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }, // sanani createdAt bo‘yicha filterlash
          debtAmount: { $gt: 0 }, // faqat qarzi borlarini olish
        },
      },
      {
        $group: {
          _id: null,
          totalDebt: { $sum: "$debtAmount" }, // jami qarz summasi
        },
      },
    ]);

    // Jami agentlar qarzi (oy bo‘yicha emas, umumiy)
    const agentsDebt = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalAgentDebt: { $sum: "$remainingDebt" }, // barcha transactionlar qarzini qo‘shish
        },
      },
    ]);

    // Jami ombor summasi
   const totalStockValue = await Ombor.aggregate([
     { $unwind: "$products" },
     {
       $group: {
         _id: null,
         totalValue: {
           $sum: { $multiply: ["$products.quantity", "$products.price"] },
         },
       },
     },
   ]);

    const kirim = expenses.find((e) => e._id === "kirim")?.total || 0;
    const chiqim = expenses.find((e) => e._id === "chiqim")?.total || 0;

    let datas = {
      expenses: {
        kirim,
        chiqim,
      },
      sales: {
        totalSales: sales[0]?.totalSales || 0,
        totalQuantity: sales[0]?.totalQuantity || 0,
      },
      debts: debts[0]?.totalDebt || 0,
      agentsDebt: agentsDebt[0]?.totalAgentDebt || 0,
      totalStockValue: totalStockValue[0]?.totalValue || 0,
    };

    response.success(res, "Ma'lumotlar muvaffaqiyatli olindi", datas);
  } catch (err) {
    response.serverError(res, err.message, err);
  }
};
