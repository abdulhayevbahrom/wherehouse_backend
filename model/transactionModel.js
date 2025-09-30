const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "agents", // Agent modeliga bog'lanadi
    required: true,
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ombor", // Ombor modeliga bog'lanadi
        required: true,
      },
      // sale price bu
      price: {
        type: Number,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      totalPrice: {
        type: Number,
        required: true,
      },
    },
  ],
  paidAmount: {
    type: Number,
    default: 0, // Agent tomonidan to'langan summa
  },
  remainingDebt: {
    type: Number,
    required: true, // Qarz miqdori
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Transaction", transactionSchema);
