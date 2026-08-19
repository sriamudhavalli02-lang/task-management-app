require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================

const MONGO_URI = process.env.MONGO_URI;

const JWT_SECRET =
  process.env.JWT_SECRET || "task-management-secret-2026";

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env");
  process.exit(1);
}

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://task-management-app-1.onrender.com",
    ],
    credentials: true,
  })
);
app.use(express.json());


// ==========================================
// MONGODB CONNECTION
// ==========================================

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully ✅");
  })
  .catch((err) => {
    console.error("MongoDB connection error ❌");
    console.error(err.message);
  });

// ==========================================
// USER SCHEMA
// ==========================================

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

// ==========================================
// TASK SCHEMA
// ==========================================

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },

    dueDate: {
      type: Date,
      default: null,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model("Task", taskSchema);

// ==========================================
// JWT AUTHENTICATION
// ==========================================

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization token required",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Invalid authorization format",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Token missing",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message: "Task Management API is running 🚀",
  });
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Task Management API is healthy 🚀",
    database:
      mongoose.connection.readyState === 1
        ? "MongoDB Connected"
        : "MongoDB Disconnected",
  });
});

// ==========================================
// REGISTER
// ==========================================

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const savedUser = await user.save();

    return res.status(201).json({
      message: "User registered successfully ✅",
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
      },
    });
  } catch (error) {
    console.error("Register error ❌");
    console.error(error.message);

    return res.status(500).json({
      message: "Error registering user",
      error: error.message,
    });
  }
});

// ==========================================
// LOGIN
// ==========================================

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.json({
      message: "Login successful ✅",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error ❌");
    console.error(error.message);

    return res.status(500).json({
      message: "Login error",
      error: error.message,
    });
  }
});

// ==========================================
// CREATE TASK
// ==========================================

app.post("/tasks", authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      dueDate,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    const task = new Task({
      title: title.trim(),
      description: description?.trim() || "",
      priority: priority || "Medium",
      status: status || "Pending",
      dueDate: dueDate || null,
      userId: req.user.userId,
    });

    const savedTask = await task.save();

    return res.status(201).json(savedTask);
  } catch (error) {
    console.error("Create task error ❌");
    console.error(error.message);

    return res.status(500).json({
      message: "Error creating task",
      error: error.message,
    });
  }
});

// ==========================================
// GET MY TASKS
// ==========================================

app.get("/tasks/my", authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find({
      userId: req.user.userId,
    }).sort({
      createdAt: -1,
    });

    return res.json(tasks);
  } catch (error) {
    console.error("Fetch tasks error ❌");
    console.error(error.message);

    return res.status(500).json({
      message: "Error fetching tasks",
      error: error.message,
    });
  }
});

// ==========================================
// GET SINGLE TASK
// ==========================================

app.get("/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    return res.json(task);
  } catch (error) {
    console.error("Fetch task error ❌");
    console.error(error.message);

    return res.status(500).json({
      message: "Error fetching task",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE TASK
// ==========================================

app.put("/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const updatedData = {
      title: req.body.title?.trim(),
      description: req.body.description?.trim() || "",
      priority: req.body.priority || "Medium",
      status: req.body.status || "Pending",
      dueDate: req.body.dueDate || null,
    };

    if (!updatedData.title) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.userId,
      },
      updatedData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    return res.json(task);
  } catch (error) {
    console.error("Update task error ❌");
    console.error(error.message);

    return res.status(500).json({
      message: "Error updating task",
      error: error.message,
    });
  }
});

// ==========================================
// PATCH TASK
// ==========================================

app.patch("/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.userId,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    return res.json(task);
  } catch (error) {
    console.error("Patch task error ❌");
    console.error(error.message);

    return res.status(500).json({
      message: "Error patching task",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE TASK
// ==========================================

app.delete("/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    return res.json({
      message: "Task deleted successfully ✅",
    });
  } catch (error) {
    console.error("Delete task error ❌");
    console.error(error.message);

    return res.status(500).json({
      message: "Error deleting task",
      error: error.message,
    });
  }
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log("=================================");
  console.log("🚀 TASK MANAGEMENT SERVER");
  console.log("=================================");
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log(`http://localhost:${PORT}/health`);
  console.log("=================================");
});