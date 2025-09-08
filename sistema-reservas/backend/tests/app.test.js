const request = require("supertest");
const { PrismaClient } = require("@prisma/client");
const app = require("../index");

jest.mock("@prisma/client", () => {
  const mClient = {
    $queryRaw: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mClient) };
});

describe("API Tests", () => {
  const prisma = new PrismaClient();

  it("GET /test → should return Hello Test!", async () => {
    const res = await request(app).get("/test");
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("Hello Test!");
  });

  it("GET /api/prisma-time → should return DB time", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ now: "2025-09-07T12:00:00Z" }]);

    const res = await request(app).get("/api/prisma-time");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("now");
  });

  it("GET /api/prisma-time → should handle error", async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get("/api/prisma-time");
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty("error", "Error con Prisma");
  });

  it("Server should call listen outside test env and log", () => {
    const listenMock = jest.fn((port, cb) => cb && cb()); // simula callback
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    jest.doMock("express", () => {
      const expressMock = () => ({
        use: jest.fn(),
        get: jest.fn(),
        listen: listenMock,
      });
      expressMock.json = jest.fn();
      return expressMock;
    });

    jest.isolateModules(() => {
      require("../index");
    });

    expect(listenMock).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Servidor corriendo en http://localhost:")
    );

    process.env.NODE_ENV = originalEnv;
    jest.dontMock("express");
    logSpy.mockRestore();
  });
});
