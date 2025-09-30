const Transaction = require("../model/transactionModel");
const Ombor = require("../model/omborModel");
const Agent = require("../model/agentModel");
const response = require("../utils/response");

// Bir nechta mahsulotni agentga berish
exports.giveProductsToAgent = async (req, res) => {
  try {
    const { agentId, products, paidAmount } = req.body;

    // Agentni topish
    const agent = await Agent.findById(agentId);
    if (!agent) return response.notFound(res, "Agent topilmadi");

    let totalTransactionPrice = 0;
    const productDetails = [];

    for (const item of products) {
      const { productId, quantity, salePrice } = item; // salePrice ham keladi!

      // Ombor ichidagi mahsulotni topish
      const ombor = await Ombor.findOne({ "products._id": productId });
      if (!ombor) return response.notFound(res, "Mahsulot topilmadi");

      const productIndex = ombor.products.findIndex(
        (p) => p._id.toString() === productId
      );
      const product = ombor.products[productIndex];
      if (!product) return response.notFound(res, "Mahsulot topilmadi");

      // Yetarli mahsulot borligini tekshirish
      if (product.quantity < quantity) {
        return response.error(res, "Omborda yetarli mahsulot mavjud emas");
      }

      // 💡 Foyda logikasi:
      // Ombor narxi: product.price
      // Sotuv narxi: salePrice (agentga beriladigan narx)
      const totalPrice = salePrice * quantity;
      const profit = (salePrice - product.price) * quantity;

      totalTransactionPrice += totalPrice;

      // Ombordagi miqdorni kamaytirish
      product.quantity -= quantity;
      ombor.products[productIndex] = product;
      await ombor.save();

      productDetails.push({
        product: productId,
        quantity,
        unitPrice: product.price, // kirim narxi
        salePrice, // sotuv narxi
        totalPrice,
        profit, // foyda
      });
    }

    // Qarzni hisoblash
    const remainingDebt = totalTransactionPrice - paidAmount;

    // Transaction yaratish
    const transaction = new Transaction({
      agent: agentId,
      products: productDetails,
      totalPrice: totalTransactionPrice,
      paidAmount,
      remainingDebt,
    });
    await transaction.save();

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
    const transactions = await Transaction.find().populate("agent");
    if (!transactions.length)
      return response.notFound(res, "Transactionlar topilmadi");
    return response.success(res, "Transactionlar ro'yxati", transactions);
  } catch (error) {
    return response.serverError(res, "Server xatosi", error.message);
  }
};
