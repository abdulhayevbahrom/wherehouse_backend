const { Schema, model } = require("mongoose");

const supplierSchema = new Schema(
  {
    fullname: { type: String, required: true },
    phone: { type: String },

    // jami balans: qarz (-), haqdor (+)
    balance: {
      type: Number,
      default: 0,
    },
    initialDebt: {
      // <--- dasturdan avvalgi qarz
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = model("Supplier", supplierSchema);
