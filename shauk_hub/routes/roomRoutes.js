import express from "express";
import Room from "../models/Room.js";

const router = express.Router();

// Create Room
router.post("/", async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json({ message: "Room created", room });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Rooms
router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find().populate("members").populate("createdBy");
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Rooms by Hobby
router.get("/hobby/:hobby", async (req, res) => {
  try {
    const rooms = await Room.find({ hobby: req.params.hobby });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
