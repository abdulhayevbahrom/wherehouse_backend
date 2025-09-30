const Agent = require("../model/agentModel");
const responses = require("../utils/response");
const jwt = require("jsonwebtoken");
const Transactions = require("../model/transactionModel");
const mongoose = require("mongoose");

class AgentController {
  async getAllAgents(req, res) {
    try {
      const agents = await Agent.find();
      if (!agents.length) return responses.notFound(res, "Agentlar topilmadi");
      return responses.success(res, "Agentlar ro'yxati", agents);
    } catch (error) {
      return responses.serverError(res, "Server xatosi", error.message);
    }
  }

  async createAgent(req, res) {
    try {
      const { login } = req.body;

      const existingAgent = await Agent.findOne({ where: { login } }); // Adjust based on your ORM (e.g., Sequelize, Mongoose)
      if (existingAgent) {
        return responses.error(res, "Bu login allaqachon mavjud");
      }

      // Create new agent if no duplicate is found
      const agent = await Agent.create(req.body);
      if (!agent) {
        return responses.error(res, "Agent qo'shilmadi");
      }

      return responses.created(res, "Agent qo'shildi", agent);
    } catch (error) {
      return responses.serverError(res, "Server xatosi", error.message);
    }
  }

  // delete
  async deleteAgent(req, res) {
    try {
      const { id } = req.params;
      let result = await Agent.findByIdAndDelete(id);
      if (!result) return responses.notFound(res, "Agent topilmadi");
      return responses.success(res, "Agent muvaffaqiyatli o'chirildi");
    } catch (error) {
      return responses.serverError(res, "Server xatosi", error.message);
    }
  }

  // update
  async updateAgent(req, res) {
    try {
      const { id } = req.params;
      const updated = await Agent.findByIdAndUpdate(id, req.body, {
        new: true,
      });
      if (!updated) return responses.notFound(res, "Agent topilmadi");
      return responses.success(res, "Agent yangilandi", updated);
    } catch (error) {
      return responses.serverError(res, "Server xatosi", error.message);
    }
  }

  // login
  async login(req, res) {
    try {
      const { login, password } = req.body;
      const agent = await Agent.findOne({ login, password });
      if (!agent) return responses.error(res, "Login yoki parol xato");

      // create token
      const token = jwt.sign(
        {
          id: agent._id,
          login: agent.login,
          phone: agent.phone,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1w" }
      );

      return responses.success(res, "Agent kirish muvaffaqiyatli", {
        agent,
        token,
      });
    } catch (error) {
      return responses.serverError(res, "Server xatosi", error.message);
    }
  }

  // get by id
  // async getAgentData(req, res) {
  //   try {
  //     let { id } = req.params;

  //     const agentData = await Transactions.find({ agent: id }).populate([
  //       "products.product",
  //     ]);

  //     return responses.success(res, "Agent ma'lumotlari", agentData);
  //   } catch (err) {
  //     responses.serverError(res, "Server xatosi", err.message);
  //   }
  // }

  // get by id
  async getAgentData(req, res) {
    try {
      let { id } = req.params;

      const agentData = await Transactions.aggregate([
        { $match: { agent: new mongoose.Types.ObjectId(id) } },
        { $unwind: "$products" },
        {
          $lookup: {
            from: "ombors",
            localField: "products.product", // Transaction.products.product
            foreignField: "products._id", // Ombor.products._id
            as: "omborDoc",
          },
        },
        { $unwind: { path: "$omborDoc", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            products: {
              product: "$products.product",
              quantity: "$products.quantity",
              totalPrice: "$products.totalPrice",
              title: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: "$omborDoc.products",
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
              price: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: "$omborDoc.products",
                          as: "p",
                          cond: { $eq: ["$$p._id", "$products.product"] },
                        },
                      },
                      as: "pp",
                      in: "$$pp.price",
                    },
                  },
                  0,
                ],
              },
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

      return responses.success(res, "Agent ma'lumotlari", agentData);
    } catch (err) {
      responses.serverError(res, "Server xatosi", err.message);
    }
  }
}

module.exports = new AgentController();
