const Employee = require("../model/adminModel"); // Assuming the EmployeeSchema is exported as Employee model
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const response = require("../utils/response");

class AdminController {
  // Barcha xodimlarni olish (Read - All)
  async getEmployees(req, res) {
    try {
      const employees = await Employee.find().select(
        "-password -unitHeadPassword"
      );
      if (!employees.length)
        return response.notFound(res, "Xodimlar topilmadi");
      response.success(res, "Barcha xodimlar", employees);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // Xodimni ID bo'yicha olish (Read - Single)
  async getEmployeeById(req, res) {
    try {
      const employee = await Employee.findById(req.params.id).select(
        "-password -unitHeadPassword"
      );
      if (!employee) return response.notFound(res, "Xodim topilmadi");
      response.success(res, "Xodim topildi", employee);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // Yangi xodim qo'shish (Create)
  async createEmployee(req, res) {
    try {
      const { login, password } = req.body;

      if (login) {
        const existingEmployee = await Employee.findOne({ login });
        if (existingEmployee) {
          return response.error(res, "Bu login allaqachon mavjud");
        }
      }

      if (password) {
        req.body.password = await bcrypt.hash(password, 10);
      }

      const employee = await Employee.create(req.body);

      // Javob yuborish
      response.created(res, "Xodim qo'shildi", employee);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // Xodimni yangilash (Update)
  async updateEmployee(req, res) {
    try {
      if (login) {
        const existingEmployee = await Employee.findOne({
          login,
          _id: { $ne: req.params.id },
        });
        if (existingEmployee) {
          return response.error(res, "Bu login allaqachon mavjud");
        }
      }

      const updateData = { ...req.body };

      // Parolni yangilash (faqat ofis xodimlari uchun va agar parol berilgan bo'lsa)
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedEmployee = await Employee.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!updatedEmployee)
        return response.error(res, "Xodim yangilashda xatolik");

      response.success(res, "Xodim yangilandi", updatedEmployee);
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // Xodimni o'chirish (Delete)
  async deleteEmployee(req, res) {
    try {
      const employee = await Employee.findByIdAndDelete(req.params.id);
      if (!employee) return response.error(res, "Xodim o'chirilmadi");
      response.success(res, "Xodim o'chirildi");
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }

  // Xodim kirishi (Login)
  async login(req, res) {
    try {
      const { login, password } = req.body;
      const employee = await Employee.findOne({ login });
      if (!employee) return response.error(res, "Login yoki parol xato");

      const isMatch = bcrypt.compare(password, employee.password);
      if (!isMatch) return response.error(res, "Login yoki parol xato");

      const token = jwt.sign(
        {
          id: employee._id,
          login: employee.login,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1w" }
      );

      response.success(res, "Kirish muvaffaqiyatli", {
        employee,
        token,
      });
    } catch (err) {
      response.serverError(res, err.message, err);
    }
  }
}

module.exports = new AdminController();
