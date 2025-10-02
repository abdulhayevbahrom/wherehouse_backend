const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const addErrors = require("ajv-errors");
const response = require("../utils/response");
const { init } = require("../model/agentModel");

const agentValidation = (req, res, next) => {
  const ajv = new Ajv({ allErrors: true, verbose: true });
  addFormats(ajv);
  addErrors(ajv);

  const schema = {
    type: "object",
    properties: {
      fullname: {
        type: "string",
        minLength: 2,
        maxLength: 50,
        errorMessage: "Ism 2-200 ta belgi oralig‘ida bo‘lishi kerak",
      },
      phone: {
        type: "string",
        minLength: 9,
        maxLength: 9,
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
      initialDebt: {
        type: "number",
        minimum: 0,
      },
    },
    required: ["fullname", "phone", "login", "password"],
    additionalProperties: false,
    errorMessage: {
      required: {
        fullname: "Ism kiritilishi shart",
        phone: "Telefon raqami kiritilishi shart",
        login: "Login kiritilishi shart",
        password: "Parol kiritilishi shart",
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

module.exports = agentValidation;
