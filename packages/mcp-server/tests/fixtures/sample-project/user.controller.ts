import { Router } from "express";

const router = Router();

router.get("/api/users", (req, res) => {
  res.json([]);
});

router.get("/api/users/:id", (req, res) => {
  res.json({});
});

router.post("/api/users", (req, res) => {
  res.status(201).json({});
});

export default router;
