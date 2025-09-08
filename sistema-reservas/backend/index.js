const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get("/test", (req, res) => {
  res.send("Hello Test!");
});

app.get("/api/prisma-time", async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT NOW() as now`;
    res.json(result[0]);
  } catch (error) {

    res.status(500).json({ error: "Error con Prisma", details: error.message });
  }
});

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
