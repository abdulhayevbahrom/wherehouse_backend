const { Schema, model } = require("mongoose");

const agentSchema = new Schema({
  fullname: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  login: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    trim: true,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

module.exports = model("agents", agentSchema);
