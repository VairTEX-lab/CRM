const express = require("express");
const cors = require("cors");
const authRouter = require("./routes/auth");
const companiesRouter = require("./routes/companies");
const contactsRouter = require("./routes/contacts");
const dealsRouter = require("./routes/deals");
const requireAuth = require("./middleware/requireAuth");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use(requireAuth);

app.use("/companies", companiesRouter);
app.use("/contacts", contactsRouter);
app.use("/deals", dealsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  return res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
