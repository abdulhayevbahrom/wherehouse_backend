const response = require("../utils/response");
const jwt = require("jsonwebtoken");
const Agent = require("../model/agentModel");

const agentMiddleware = async (req, res, next) => {
  try {
    const token = req?.headers?.authorization?.split(" ")[1];
    if (!token) return response.unauthorized(res, "Token topilmadi");

    let result = jwt.verify(token, process.env.JWT_SECRET_KEY);

    result = await Agent.findById(result.id);

    if (!result) return response.unauthorized(res, "Token yaroqsiz");

    req.admin = result;
    next();
  } catch (err) {
    response.unauthorized(res, err.message);
  }
};

module.exports = agentMiddleware;
