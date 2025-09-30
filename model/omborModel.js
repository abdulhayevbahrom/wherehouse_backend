const { Schema, model, Types } = require("mongoose");

const omborSchema = new Schema(
  {
    supplier: {
      type: Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    products: [
      {
        title: String,
        quantity: Number,
        price: Number,
        total: Number, // quantity * price
        org_qty: Number,
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    debtAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

omborSchema.pre("save", function (next) {
  this.debtAmount = this.totalPrice - this.paidAmount;
  next();
});

module.exports = model("Ombor", omborSchema);
