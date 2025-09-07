const request = require("supertest");
const app = require("../index");

describe("API Tests", () => {
  it("GET /test → should return Hello Test!", async () => {
    const res = await request(app).get("/test");
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("Hello Test!");
  });

  const maybeIt = process.env.CI ? it.skip : it;

  maybeIt("GET /api/prisma-time → should connect to DB and return result", async () => {
    const res = await request(app).get("/api/prisma-time");
    expect(res.statusCode).toBe(200);

    if (res.body.error) {
      throw new Error("Prisma error: " + res.body.error);
    }

    expect(res.body).toHaveProperty("now");
  });
});
