import { Router } from "express";

const router = Router();

router.get("/api/users", async (req, res) => {
  res.json([]);
});

router.get("/api/users/:id", async (req, res) => {
  res.json({});
});

router.post("/api/users", async (req, res) => {
  res.json({});
});

export default router;
