const Transaction = require("../model/transactionModel");
const Ombor = require("../model/omborModel");
const Agent = require("../model/agentModel");
const response = require("../utils/response");
const mongoose = require("mongoose");

// exports.giveProductsToAgent = async (req, res) => {
//   try {
//     const { agentId, products, paidAmount } = req.body;

//     if (!agentId || !products || !products.length) {
//       return res.status(400).json({ error: "Ma'lumotlar yetarli emas" });
//     }

//     const agent = await Agent.findById(agentId);
//     if (!agent) return response.notFound(res, "Agent topilmadi");

//     let totalProductsPrice = 0;

//     for (const item of products) {
//       const { productId, quantity, salePrice } = item;

//       const ombor = await Ombor.findOne({ "products._id": productId });
//       if (!ombor) return response.notFound(res, "Omborda mahsulot topilmadi");

//       const productIndex = ombor.products.findIndex(
//         (p) => p._id.toString() === productId
//       );

//       if (productIndex === -1)
//         return response.notFound(res, "Mahsulot topilmadi");

//       const product = ombor.products[productIndex];

//       if (product.quantity < quantity) {
//         return res
//           .status(400)
//           .json({ error: `${product.title} uchun yetarli miqdor yo‘q` });
//       }

//       product.quantity -= quantity;
//       ombor.products[productIndex] = product;
//       await ombor.save();

//       totalProductsPrice += salePrice * quantity;
//     }

//     const remainingDebt = totalProductsPrice - paidAmount;

//     // 🔥 Faqat transactionda qarz yoziladi
//     const transaction = await Transaction.create({
//       agent: agentId,
//       products: products.map((p) => ({
//         product: p.productId,
//         price: p.salePrice,
//         quantity: p.quantity,
//         totalPrice: p.salePrice * p.quantity,
//       })),
//       paidAmount,
//       remainingDebt,
//     });

//     const populatedTransaction = await Transaction.findById(transaction._id)
//       .populate("agent")
//       .populate("products.product");

//     return response.created(
//       res,
//       "Mahsulotlar agentga berildi",
//       populatedTransaction
//     );
//   } catch (error) {
//     return response.serverError(res, "Server xatosi", error.message);
//   }
// };

// Agentning qarzini to'lash

exports.giveProductsToAgent = async (req, res) => {
  try {
    const { agentId, products, paidAmount } = req.body;

    if (!agentId || !products || !products.length) {
      return res.status(400).json({ error: "Ma'lumotlar yetarli emas" });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) return response.notFound(res, "Agent topilmadi");

    let totalProductsPrice = 0;

    for (const item of products) {
      const { productId, quantity, salePrice } = item;

      // 🔹 Avval bazaviy productni topamiz
      const omborDoc = await Ombor.findOne({ "products._id": productId });
      if (!omborDoc)
        return response.notFound(res, "Omborda mahsulot topilmadi");

      const baseProduct = omborDoc.products.find(
        (p) => p._id.toString() === productId
      );
      if (!baseProduct) return response.notFound(res, "Mahsulot topilmadi");

      let remainingQty = quantity;

      // 🔹 Barcha omborlardan shu title + price bo‘yicha mahsulotlarni yig‘amiz
      const allOmborlar = await Ombor.find({
        "products.title": new RegExp(`^${baseProduct.title.trim()}$`, "i"),
        "products.price": baseProduct.price,
      });

      for (const ombor of allOmborlar) {
        for (let p of ombor.products) {
          if (
            p.title.trim().toLowerCase() ===
              baseProduct.title.trim().toLowerCase() &&
            p.price === baseProduct.price &&
            remainingQty > 0
          ) {
            if (p.quantity >= remainingQty) {
              p.quantity -= remainingQty;
              remainingQty = 0;
            } else {
              remainingQty -= p.quantity;
              p.quantity = 0;
            }
          }
        }
        await ombor.save(); // har bir omborni alohida saqlaymiz
        if (remainingQty <= 0) break; // yetarli bo‘lsa to‘xtatamiz
      }

      if (remainingQty > 0) {
        return response.badRequest(
          res,
          `${baseProduct.title} yetarli emas, ${remainingQty} dona yetishmadi`
        );
      }

      totalProductsPrice += salePrice * quantity;
    }

    const remainingDebt = totalProductsPrice - paidAmount;

    // 🔹 Transaction yozib qo‘yamiz
    const transaction = await Transaction.create({
      agent: agentId,
      products: products.map((p) => ({
        product: p.productId,
        price: p.salePrice,
        quantity: p.quantity,
        totalPrice: p.salePrice * p.quantity,
      })),
      paidAmount,
      remainingDebt,
    });

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate("agent")
      .populate("products.product");

    return response.created(
      res,
      "Mahsulotlar agentga berildi",
      populatedTransaction
    );
  } catch (error) {
    return response.serverError(res, "Server xatosi", error.message);
  }
};

exports.payDebt = async (req, res) => {
  try {
    const { agentId, amount } = req.body;

    if (!agentId || !amount || amount <= 0) {
      return res.status(400).json({ error: "To'lov summasi noto'g'ri" });
    }

    // Agentni topamiz
    const agent = await Agent.findById(agentId);
    if (!agent) return res.status(404).json({ error: "Agent topilmadi" });

    let remainingPayment = amount;

    // Avval agentning initialDebt ni kamaytiramiz
    if (agent.initialDebt > 0) {
      if (remainingPayment >= agent.initialDebt) {
        remainingPayment -= agent.initialDebt;
        agent.initialDebt = 0;
      } else {
        agent.initialDebt -= remainingPayment;
        remainingPayment = 0;
      }
    }

    // Transaction qarzlarini yopish (agar initialDebt tugagan bo‘lsa)
    if (remainingPayment > 0) {
      const transactions = await Transaction.find({
        agent: agentId,
        remainingDebt: { $gt: 0 },
      }).sort({ date: 1 });

      for (let trx of transactions) {
        if (remainingPayment <= 0) break;

        if (remainingPayment >= trx.remainingDebt) {
          remainingPayment -= trx.remainingDebt;
          trx.paidAmount += trx.remainingDebt;
          trx.remainingDebt = 0;
        } else {
          trx.remainingDebt -= remainingPayment;
          trx.paidAmount += remainingPayment;
          remainingPayment = 0;
        }
        await trx.save();
      }
    }

    await agent.save();

    return res.json({
      message: "To'lov muvaffaqiyatli amalga oshirildi",
      payment: amount,
      usedForDebt: amount - remainingPayment,
      remainingPayment,
      currentDebt: agent.initialDebt,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Server xatosi", details: err.message });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.aggregate([
      // Agentni qo‘shish
      {
        $lookup: {
          from: "agents",
          localField: "agent",
          foreignField: "_id",
          as: "agent",
        },
      },
      { $unwind: "$agent" },
      {
        $lookup: {
          from: "ombors",
          localField: "products.product", // Transaction.products.product
          foreignField: "products._id", // Ombor ichidagi products._id
          as: "omborDocs",
        },
      },
      {
        $unwind: { path: "$products", preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          "products.title": {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: { $arrayElemAt: ["$omborDocs.products", 0] },
                      as: "p",
                      cond: { $eq: ["$$p._id", "$products.product"] },
                    },
                  },
                  as: "pp",
                  in: "$$pp.title",
                },
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          agent: { $first: "$agent" },
          paidAmount: { $first: "$paidAmount" },
          remainingDebt: { $first: "$remainingDebt" },
          date: { $first: "$date" },
          products: { $push: "$products" },
        },
      },
    ]);

    if (!transactions.length) {
      return response.notFound(res, "Transactionlar topilmadi");
    }

    return response.success(res, "Transactionlar ro'yxati", transactions);
  } catch (error) {
    return response.serverError(res, "Server xatosi", error.message);
  }
};

// exports.getDebtors = async (req, res) => {
//   try {
//     const debtors = await Agent.aggregate([
//       // Transactionlarni qo‘shamiz
//       {
//         $lookup: {
//           from: "transactions",
//           localField: "_id",
//           foreignField: "agent",
//           as: "transactions",
//         },
//       },

//       // umumiy remainingDebt hisoblash
//       {
//         $addFields: {
//           totalRemainingDebt: {
//             $sum: "$transactions.remainingDebt",
//           },
//         },
//       },

//       // umumiy qarz = initialDebt + transaction qarzlari
//       {
//         $addFields: {
//           totalDebt: {
//             $add: ["$initialDebt", "$totalRemainingDebt"],
//           },
//         },
//       },

//       // faqat qarzdorlarni olish
//       {
//         $match: {
//           totalDebt: { $gt: 0 },
//         },
//       },

//       // transactionlarni ochib mahsulotlar bilan join qilish
//       {
//         $unwind: {
//           path: "$transactions",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $unwind: {
//           path: "$transactions.products",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "ombors",
//           localField: "transactions.products.product",
//           foreignField: "products._id",
//           as: "omborDocs",
//         },
//       },
//       {
//         $addFields: {
//           "transactions.products.title": {
//             $arrayElemAt: [
//               {
//                 $map: {
//                   input: {
//                     $filter: {
//                       input: { $arrayElemAt: ["$omborDocs.products", 0] },
//                       as: "p",
//                       cond: {
//                         $eq: ["$$p._id", "$transactions.products.product"],
//                       },
//                     },
//                   },
//                   as: "pp",
//                   in: "$$pp.title",
//                 },
//               },
//               0,
//             ],
//           },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id",
//           fullname: { $first: "$fullname" },
//           phone: { $first: "$phone" },
//           login: { $first: "$login" },
//           initialDebt: { $first: "$initialDebt" },
//           totalRemainingDebt: { $first: "$totalRemainingDebt" },
//           totalDebt: { $first: "$totalDebt" },
//           transactions: { $push: "$transactions" },
//         },
//       },
//     ]);

//     if (!debtors.length) {
//       return response.notFound(res, "Qarzdorlar topilmadi");
//     }

//     return response.success(res, "Qarzdorlar ro‘yxati", debtors);
//   } catch (error) {
//     return response.serverError(res, "Server xatosi", error.message);
//   }
// };

exports.getDebtors = async (req, res) => {
  try {
    // 1. Barcha agentlarni olish
    const agents = await Agent.find().lean();

    const results = [];

    for (let agent of agents) {
      // Agentning barcha transactionlari
      const transactions = await Transaction.find({ agent: agent._id }).lean();

      // Jami mahsulot puli
      const totalProductsPrice = transactions.reduce(
        (sum, t) =>
          sum + (t.products?.reduce((s, p) => s + (p.totalPrice || 0), 0) || 0),
        0
      );

      // Jami to‘lovlar
      const totalPayments = transactions.reduce(
        (sum, t) => sum + (t.paidAmount || 0),
        0
      );

      // Hozirgi qarz = initialDebt + (mahsulot narxi - to‘lov)
      const debt = agent.initialDebt + totalProductsPrice - totalPayments;

      if (debt > 0) {
        results.push({
          agentId: agent._id,
          fullname: agent.fullname,
          phone: agent.phone,
          totalProductsPrice,
          totalPayments,
          debt,
        });
      }
    }

    return response.success(res, "Qarzdor agentlar ro‘yxati", results);
  } catch (error) {
    return response.serverError(res, "Server xatosi", error.message);
  }
};

// get agent debts
exports.getAgentDebts = async (req, res) => {
  try {
    const { agentId } = req.params;

    const transactions = await Transaction.aggregate([
      { $match: { agent: new mongoose.Types.ObjectId(agentId) } },
      {
        $unwind: "$products",
      },
      {
        $lookup: {
          from: "ombors",
          let: { productId: "$products.product" },
          pipeline: [
            { $unwind: "$products" },
            { $match: { $expr: { $eq: ["$products._id", "$$productId"] } } },
            { $project: { "products.title": 1 } },
          ],
          as: "productDocs",
        },
      },
      {
        $addFields: {
          "products.title": {
            $arrayElemAt: ["$productDocs.products.title", 0],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          agent: { $first: "$agent" },
          products: { $push: "$products" },
          paidAmount: { $first: "$paidAmount" },
          remainingDebt: { $first: "$remainingDebt" },
          date: { $first: "$date" },
        },
      },
    ]);
    return response.success(res, "Agent qarzi", transactions);
  } catch (error) {
    return response.serverError(res, "Server xatosi", error.message);
  }
};
