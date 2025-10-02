const router = require("express").Router();

const AdminController = require("../controller/adminController");
const ExpenseController = require("../controller/expensesController");
const OmborController = require("../controller/omborController");
const AgentController = require("../controller/agentController");
const transactionController = require("../controller/transactionController");
const SupplierController = require("../controller/supplierController");
const DashboardController = require("../controller/dashboardController");

const agentValidation = require("../validation/agentValidation");
const adminValidation = require("../validation/adminValidation");
const agentMiddleware = require("../middleware/agentMiddleware");

// Dashbord

router.get("/dashboard", DashboardController.getDashboard);

// ADMINS

router.post("/admin/login", AdminController.login);
router.get("/admin/all", AdminController.getEmployees);
router.get("/admin/:id", AdminController.getEmployeeById);
router.post("/admin/create", adminValidation, AdminController.createEmployee);
router.put("/admin/update/:id", AdminController.updateEmployee);
router.delete("/admin/delete/:id", AdminController.deleteEmployee);

// EXPENSES

router.get("/expense/all", ExpenseController.getExpenses);
router.post("/expense/create", ExpenseController.createExpense);
router.put("/expense/update/:id", ExpenseController.updateExpense);
router.delete("/expense/delete/:id", ExpenseController.deleteExpense);

// OMBOR

router.get("/ombor/all", OmborController.getAll);
router.get("/ombor/supplier/:id", OmborController.getBySupplier);
router.post("/ombor/create", OmborController.create);
router.put("/ombor/update/:id", OmborController.update);
router.delete("/ombor/delete/:id", OmborController.delete);
router.post("/ombor/pay/:supplierId/:omborId", OmborController.paySupplierDebt);

// AGENTS

router.get("/agent/all", AgentController.getAllAgents);
router.post("/agent/create", agentValidation, AgentController.createAgent);
router.put("/agent/update/:id", AgentController.updateAgent);
router.delete("/agent/delete/:id", AgentController.deleteAgent);
router.post("/agent/login", AgentController.login);
router.get("/agent/myData/:id", agentMiddleware, AgentController.getAgentData);

// TRANSACTIONS

router.post("/transaction/give", transactionController.giveProductsToAgent);
router.post("/transaction/pay", transactionController.payDebt);
router.get("/transaction/all", transactionController.getAllTransactions);
router.get("/debtors", transactionController.getDebtors);
// SUPPLIERS

router.get("/supplier/all", SupplierController.getAll);
router.get("/supplier/suppliers", SupplierController.getSuppliers);
router.put("/supplier/update/:id", SupplierController.updateSupplier);

module.exports = router;
