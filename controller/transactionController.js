const Transaction = require("../model/transactionModel");
const Ombor = require("../model/omborModel");
const Agent = require("../model/agentModel");
const response = require("../utils/response");

// Bir nechta mahsulotni agentga berish
exports.giveProductsToAgent = async (req, res) => {
  try {
    const { agentId, products, paidAmount } = req.body;

    for (const item of products) {
      const { productId, quantity, salePrice } = item; // salePrice ham keladi!

      // Ombor ichidagi mahsulotni topish
      const ombor = await Ombor.findOne({ "products._id": productId });

      const productIndex = ombor.products.findIndex(
        (p) => p._id.toString() === productId
      );
      const product = ombor.products[productIndex];

      product.quantity -= quantity;
      ombor.products[productIndex] = product;
      await ombor.save();
    }

    let result = await Transaction.create({
      agent: agentId,
      products: products.map((p) => ({
        product: p.productId,
        price: p.salePrice,
        quantity: p.quantity,
        totalPrice: p.salePrice * p.quantity,
      })),
      paidAmount: paidAmount,
      remainingDebt:
        products.reduce((acc, p) => acc + p.salePrice * p.quantity, 0) -
        paidAmount,
    });
    const transaction = await Transaction.findById(result.id).populate("agent");

    return response.created(res, "Mahsulotlar agentga berildi", transaction);
  } catch (error) {
    return response.serverError(res, "Server xatosi", error.message);
  }
};

// Agentning qarzini to'lash
exports.payDebt = async (req, res) => {
  try {
    const { transactionId, paymentAmount } = req.body;

    // Transactionni topish
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return response.notFound(res, "Transaction topilmadi");

    // Agar qarz allaqachon yopilgan bo'lsa
    if (transaction.remainingDebt <= 0) {
      return response.error(
        res,
        "Bu transaction bo'yicha qarz allaqachon yopilgan"
      );
    }

    // To'lovni hisoblash
    transaction.paidAmount += paymentAmount;
    transaction.remainingDebt -= paymentAmount;

    // Agar to'lov qarzdan ko'p kiritilsa, qarzni 0 qilib qo'yamiz
    if (transaction.remainingDebt < 0) {
      transaction.remainingDebt = 0;
    }

    await transaction.save();

    return response.success(
      res,
      "To'lov muvaffaqiyatli amalga oshirildi",
      transaction
    );
  } catch (error) {
    return response.serverError(res, "Server xatosi", error.message);
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
