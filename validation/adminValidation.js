const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const addErrors = require("ajv-errors");
const mongoose = require("mongoose");
const response = require("../utils/response");

const adminValidation = (req, res, next) => {
  const ajv = new Ajv({ allErrors: true, verbose: true });
  addFormats(ajv);
  addErrors(ajv);

  const schema = {
    type: "object",
    properties: {
      firstName: {
        type: "string",
        minLength: 2,
        maxLength: 50,
        errorMessage: "Ism 2-50 ta belgi oralig‘ida bo‘lishi kerak",
      },
      lastName: {
        type: "string",
        minLength: 2,
        maxLength: 50,
        errorMessage: "Familya 2-50 ta belgi oralig‘ida bo‘lishi kerak",
      },
      phone: {
        type: "string",
        pattern: "^\\+998\\d{9}$",
        errorMessage:
          "Telefon raqami formati noto‘g‘ri (masalan, +998901234567)",
      },
      login: {
        type: "string",
        minLength: 4,
        maxLength: 20,
        pattern: "^[a-zA-Z0-9]+$",
        errorMessage:
          "Login faqat harflar va raqamlardan iborat bo‘lishi kerak",
      },
      password: {
        type: "string",
        minLength: 6,
        maxLength: 50,
        errorMessage: "Parol 6-50 ta belgi oralig‘ida bo‘lishi kerak",
      },
      role: {
        type: "string",
        enum: ["owner", "admin"],
        errorMessage: "Rol faqat 'owner' yoki 'admin' bo‘lishi mumkin",
      },
    },
    required: ["firstName", "lastName", "phone"],
    additionalProperties: false,
    errorMessage: {
      required: {
        firstName: "Ism kiritish shart",
        lastName: "Familya kiritish shart",
        phone: "Telefon raqam kiritish shart",
      },
      additionalProperties: "Ruxsat etilmagan maydon kiritildi",
    },
  };

  const validate = ajv.compile(schema);
  const valid = validate(req.body);

  if (!valid) {
    const errorMessages = validate.errors[0].message;
    return response.error(res, errorMessages);
  }

  next();
};

module.exports = adminValidation;
