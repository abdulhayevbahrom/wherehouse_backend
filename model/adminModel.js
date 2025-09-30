const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Ism kiritilishi shart"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Familya kiritilishi shart"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Telefon raqami kiritilishi shart"],
      trim: true,
      match: [/^\+998\d{9}$/, "Telefon raqami formati noto'g'ri"],
    },
    login: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin"],
      default: "admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admins", EmployeeSchema);
