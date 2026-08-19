import React, { useEffect, useMemo, useState } from "react";
import "./index.css";
const API_URL = "http://localhost:5000";

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  /* =========================
     THEME
  ========================= */

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("taskflow-theme") === "dark";
  });

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);

    localStorage.setItem(
      "taskflow-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((old) => !old);
  };

  /* =========================
     AUTH
  ========================= */

  const [authMode, setAuthMode] = useState("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  /* =========================
     TASK STATE
  ========================= */

  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("Pending");
  const [dueDate, setDueDate] = useState("");

  const [editingId, setEditingId] = useState(null);

  /* =========================
     FILTERS
  ========================= */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  /* =========================
     UI
  ========================= */

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* =========================
     RESPONSE HELPER
  ========================= */

  const getResponseData = async (response) => {
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      return {
        message: text.startsWith("<")
          ? "Backend URL problem. Check localhost:5000."
          : text || "Invalid server response",
      };
    }
  };

  /* =========================
     MESSAGE
  ========================= */

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 3500);
  };

  /* =========================
     RESET
  ========================= */

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setStatus("Pending");
    setDueDate("");
    setEditingId(null);
  };

  /* =========================
     LOGOUT
  ========================= */

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken("");
    setUser(null);
    setTasks([]);
    resetForm();
    setMessage("");
  };

  /* =========================
     REGISTER
  ========================= */

  const register = async (e) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim(),
          password: registerPassword,
        }),
      });

      const data = await getResponseData(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed"
        );
      }

      setRegisterName("");
      setRegisterEmail("");
      setRegisterPassword("");

      setAuthMode("login");

      showMessage(
        "Registration successful ✅ Please login.",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     LOGIN
  ========================= */

  const login = async (e) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const data = await getResponseData(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed"
        );
      }

      localStorage.setItem("token", data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      setToken(data.token);
      setUser(data.user);

      setLoginEmail("");
      setLoginPassword("");
      setMessage("");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     GET TASKS
  ========================= */

  const getTasks = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_URL}/tasks/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await getResponseData(response);

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to fetch tasks"
        );
      }

      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  useEffect(() => {
    if (token) {
      getTasks();
    }
  }, [token]);

  /* =========================
     CREATE / UPDATE TASK
  ========================= */

  const handleTaskSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      showMessage("Please login again.", "error");
      return;
    }

    if (!title.trim()) {
      showMessage(
        "Please enter task title ❌",
        "error"
      );
      return;
    }

    setLoading(true);

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        dueDate: dueDate || null,
      };

      const url = editingId
        ? `${API_URL}/tasks/${editingId}`
        : `${API_URL}/tasks`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      });

      const data = await getResponseData(response);

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Task operation failed"
        );
      }

      if (editingId) {
        setTasks((oldTasks) =>
          oldTasks.map((task) =>
            task._id === editingId ? data : task
          )
        );

        showMessage(
          "Task updated successfully ✅",
          "success"
        );
      } else {
        setTasks((oldTasks) => [
          data,
          ...oldTasks,
        ]);

        showMessage(
          "Task created successfully 🎉",
          "success"
        );
      }

      resetForm();
    } catch (error) {
      console.error(error);
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     EDIT TASK
  ========================= */

  const editTask = (task) => {
    setEditingId(task._id);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setPriority(task.priority || "Medium");
    setStatus(task.status || "Pending");

    setDueDate(
      task.dueDate
        ? task.dueDate.slice(0, 10)
        : ""
    );

    setTimeout(() => {
      document
        .getElementById("create-task")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  /* =========================
     DELETE TASK
  ========================= */

  const deleteTask = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/tasks/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await getResponseData(response);

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Delete failed"
        );
      }

      setTasks((oldTasks) =>
        oldTasks.filter(
          (task) => task._id !== id
        )
      );

      showMessage(
        "Task deleted successfully 🗑️",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  /* =========================
     QUICK COMPLETE
  ========================= */

  const completeTask = async (task) => {
    if (task.status === "Completed") return;

    try {
      const response = await fetch(
        `${API_URL}/tasks/${task._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: task.title,
            description: task.description || "",
            priority: task.priority,
            status: "Completed",
            dueDate: task.dueDate || null,
          }),
        }
      );

      const data = await getResponseData(response);

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to complete task"
        );
      }

      setTasks((oldTasks) =>
        oldTasks.map((item) =>
          item._id === task._id ? data : item
        )
      );

      showMessage(
        "Task completed! 🎉",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  /* =========================
     FILTERED TASKS
  ========================= */

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const searchText = search
        .toLowerCase()
        .trim();

      const matchesSearch =
        (task.title || "")
          .toLowerCase()
          .includes(searchText) ||
        (task.description || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" ||
        task.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    tasks,
    search,
    statusFilter,
    priorityFilter,
  ]);

  /* =========================
     STATISTICS
  ========================= */

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const pendingTasks = tasks.filter(
    (task) => task.status === "Pending"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const productivity =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks / totalTasks) * 100
        );

  const pendingPercent =
    totalTasks === 0
      ? 0
      : Math.round(
          (pendingTasks / totalTasks) * 100
        );

  const inProgressPercent =
    totalTasks === 0
      ? 0
      : Math.round(
          (inProgressTasks / totalTasks) * 100
        );

  const completedPercent =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks / totalTasks) * 100
        );

  const firstName =
    user?.name?.split(" ")[0] || "User";

  /* =========================
     DUE DATE
  ========================= */

  const isOverdue = (task) => {
    if (
      !task.dueDate ||
      task.status === "Completed"
    ) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);

    return due < today;
  };

  /* =========================
     AUTH SCREEN
  ========================= */

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-background-circle circle-one" />
        <div className="auth-background-circle circle-two" />

        <button
          type="button"
          className="theme-toggle auth-theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {darkMode ? "☀️" : "🌙"}
        </button>

        <div className="auth-card">
          <div className="logo">
            🚀 <span>TaskFlow</span>
          </div>

          <div className="auth-icon">
            {authMode === "login"
              ? "👋"
              : "✨"}
          </div>

          <h1>
            {authMode === "login"
              ? "Welcome Back"
              : "Create Account"}
          </h1>

          <p className="auth-subtitle">
            {authMode === "login"
              ? "Login to continue managing your tasks."
              : "Start organizing your work today."}
          </p>

          {message && (
            <div
              className={`message ${
                messageType === "error"
                  ? "error-message"
                  : ""
              }`}
            >
              {message}
            </div>
          )}

          {authMode === "login" ? (
            <form onSubmit={login}>
              <label>Email</label>

              <input
                type="email"
                placeholder="Enter your email"
                value={loginEmail}
                onChange={(e) =>
                  setLoginEmail(e.target.value)
                }
                required
              />

              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) =>
                  setLoginPassword(e.target.value)
                }
                required
              />

              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading
                  ? "Logging in..."
                  : "Login →"}
              </button>
            </form>
          ) : (
            <form onSubmit={register}>
              <label>Name</label>

              <input
                type="text"
                placeholder="Enter your name"
                value={registerName}
                onChange={(e) =>
                  setRegisterName(e.target.value)
                }
                required
              />

              <label>Email</label>

              <input
                type="email"
                placeholder="Enter your email"
                value={registerEmail}
                onChange={(e) =>
                  setRegisterEmail(e.target.value)
                }
                required
              />

              <label>Password</label>

              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={registerPassword}
                onChange={(e) =>
                  setRegisterPassword(e.target.value)
                }
                minLength={6}
                required
              />

              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading
                  ? "Creating..."
                  : "Create Account →"}
              </button>
            </form>
          )}

          <div className="auth-switch">
            {authMode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setMessage("");
                  }}
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setMessage("");
                  }}
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     DASHBOARD
  ========================= */

  return (
    <div className="app-layout">

      <aside
        className={`sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >

        <div className="brand">
          <span className="brand-icon">
            🚀
          </span>

          <span>TaskFlow</span>

          <button
            className="mobile-close"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav">

          <a
            href="#dashboard"
            className="active"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <span>🏠</span>
            Dashboard
          </a>

          <a
            href="#tasks"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <span>📋</span>
            My Tasks
          </a>

          <a
            href="#analytics"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <span>📊</span>
            Analytics
          </a>

          <a
            href="#create-task"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <span>➕</span>
            Add Task
          </a>

        </nav>

        <div className="sidebar-bottom">

          <div className="user-box">

            <div className="avatar">
              {user?.name
                ?.charAt(0)
                ?.toUpperCase() || "U"}
            </div>

            <div className="user-details">
              <strong>
                {user?.name || "User"}
              </strong>

              <small>
                {user?.email || ""}
              </small>
            </div>

          </div>

          <button
            className="logout-btn"
            type="button"
            onClick={logout}
          >
            🚪 Logout
          </button>

        </div>

      </aside>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      <main
        className="main-content"
        id="dashboard"
      >

        {/* HEADER */}

        <header className="top-header">

          <div className="header-left">

            <button
              className="menu-btn"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              ☰
            </button>

            <div>

              <p className="welcome-text">
                Welcome, {firstName}! 👋
              </p>

              <h1>Task Manager</h1>

              <p className="header-subtitle">
                Stay organized. Stay productive.
              </p>

            </div>

          </div>

          <div className="header-actions">

            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            <div className="profile">

              <div className="profile-avatar">
                {user?.name
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}
              </div>

              <div>

                <strong>
                  {user?.name || "User"}
                </strong>

                <small>● Online</small>

              </div>

            </div>

            {/* UPDATED LOGOUT BUTTON */}

            <button
              type="button"
              className="mobile-logout"
              onClick={logout}
            >
              🚪 Logout
            </button>

          </div>

        </header>

        {/* HERO */}

        <section className="hero-card">

          <div>

            <span className="hero-badge">
              ✨ PRODUCTIVITY HUB
            </span>

            <h2>
              Make today
              <br />
              <span>productive.</span>
            </h2>

            <p>
              Organize your tasks, track your
              progress and get things done.
            </p>

            <button
              className="hero-btn"
              onClick={() =>
                document
                  .getElementById("create-task")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              + Create New Task
            </button>

          </div>

          <div className="hero-illustration">

            <div className="floating-card card-one">
              ✓
            </div>

            <div className="hero-check">
              🚀
            </div>

            <div className="floating-card card-two">
              📈
            </div>

          </div>

        </section>

        {/* STATS */}

        <section
          className="stats-grid"
          id="analytics"
        >

          <div className="stat-card blue-card">

            <div className="stat-icon">
              📋
            </div>

            <div>
              <span>Total Tasks</span>
              <strong>{totalTasks}</strong>
              <small>All your tasks</small>
            </div>

          </div>

          <div className="stat-card orange-card">

            <div className="stat-icon">
              ⏳
            </div>

            <div>
              <span>Pending</span>
              <strong>{pendingTasks}</strong>
              <small>Waiting tasks</small>
            </div>

          </div>

          <div className="stat-card purple-card">

            <div className="stat-icon">
              ⚡
            </div>

            <div>
              <span>In Progress</span>
              <strong>{inProgressTasks}</strong>
              <small>Active tasks</small>
            </div>

          </div>

          <div className="stat-card green-card">

            <div className="stat-icon">
              ✅
            </div>

            <div>
              <span>Completed</span>
              <strong>{completedTasks}</strong>
              <small>Finished tasks</small>
            </div>

          </div>

        </section>

        {/* OVERVIEW + DISTRIBUTION */}

        <section className="analytics-grid">

          <div className="analytics-card overview-card">

            <div className="card-title-row">

              <div>

                <span className="section-label">
                  OVERVIEW
                </span>

                <h2>Task Overview</h2>

                <p>
                  Your current task progress
                </p>

              </div>

              <div className="completion-ring">

                <div>

                  <strong>
                    {productivity}%
                  </strong>

                  <span>Completed</span>

                </div>

              </div>

            </div>

            <div className="overview-numbers">

              <div>
                <span>Total</span>
                <strong>{totalTasks}</strong>
              </div>

              <div>
                <span>Pending</span>
                <strong>{pendingTasks}</strong>
              </div>

              <div>
                <span>In Progress</span>
                <strong>
                  {inProgressTasks}
                </strong>
              </div>

              <div>
                <span>Completed</span>
                <strong>
                  {completedTasks}
                </strong>
              </div>

            </div>

          </div>

          <div className="analytics-card distribution-card">

            <div>

              <span className="section-label">
                DISTRIBUTION
              </span>

              <h2>Task Distribution</h2>

              <p>Tasks by status</p>

            </div>

            <div className="distribution-body">

              <div
                className="distribution-chart"
                style={{
                  background:
                    totalTasks === 0
                      ? "conic-gradient(#e5e7eb 0deg 360deg)"
                      : `conic-gradient(
                          #f59e0b 0deg ${
                            pendingPercent * 3.6
                          }deg,
                          #6366f1 ${
                            pendingPercent * 3.6
                          }deg ${
                            (pendingPercent +
                              inProgressPercent) *
                            3.6
                          }deg,
                          #22c55e ${
                            (pendingPercent +
                              inProgressPercent) *
                            3.6
                          }deg 360deg
                        )`,
                }}
              >

                <div className="chart-center">

                  <strong>
                    {totalTasks}
                  </strong>

                  <span>Tasks</span>

                </div>

              </div>

              <div className="legend">

                <div>
                  <span className="legend-dot pending-dot" />
                  <span>Pending</span>
                  <strong>
                    {pendingPercent}%
                  </strong>
                </div>

                <div>
                  <span className="legend-dot progress-dot" />
                  <span>In Progress</span>
                  <strong>
                    {inProgressPercent}%
                  </strong>
                </div>

                <div>
                  <span className="legend-dot completed-dot" />
                  <span>Completed</span>
                  <strong>
                    {completedPercent}%
                  </strong>
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* PRODUCTIVITY */}

        <section className="productivity-card">

          <div className="productivity-top">

            <div>

              <span className="section-label">
                PRODUCTIVITY
              </span>

              <h3>
                {productivity >= 70
                  ? "You're doing amazing! 🔥"
                  : productivity >= 40
                  ? "You're making great progress! 💪"
                  : "Let's get things moving! 🚀"}
              </h3>

              <p>
                {completedTasks} of{" "}
                {totalTasks} tasks completed
              </p>

            </div>

            <div className="productivity-number">
              {productivity}%
            </div>

          </div>

          <div className="progress-bar">

            <div
              className="progress-fill"
              style={{
                width: `${productivity}%`,
              }}
            />

          </div>

        </section>

        {/* MESSAGE */}

        {message && (
          <div
            className={`message dashboard-message ${
              messageType === "error"
                ? "error-message"
                : ""
            }`}
          >
            {message}
          </div>
        )}

        {/* TASKS */}

        <section
          className="tasks-section"
          id="tasks"
        >

          <div className="section-heading">

            <div>

              <span className="section-label">
                WORKSPACE
              </span>

              <h2>Your Tasks 📋</h2>

              <p>
                Manage and organize your work
              </p>

            </div>

            <button
              type="button"
              className="jump-create-btn"
              onClick={() =>
                document
                  .getElementById(
                    "create-task"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              + New Task
            </button>

          </div>

          {/* FILTERS */}

          <div className="filters">

            <div className="search-wrapper">

              <span>🔍</span>

              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
            >

              <option value="All">
                All Status
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="In Progress">
                In Progress
              </option>

              <option value="Completed">
                Completed
              </option>

            </select>

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(
                  e.target.value
                )
              }
            >

              <option value="All">
                All Priority
              </option>

              <option value="Low">
                Low
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="High">
                High
              </option>

            </select>

          </div>

          {/* TASK LIST */}

          <div className="task-list">

            {filteredTasks.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  📝
                </div>

                <h3>
                  No tasks yet
                </h3>

                <p>
                  Add your first task and
                  start being productive.
                </p>

                <button
                  type="button"
                  className="empty-create-btn"
                  onClick={() =>
                    document
                      .getElementById(
                        "create-task"
                      )
                      ?.scrollIntoView({
                        behavior: "smooth",
                      })
                  }
                >
                  + Create First Task
                </button>

              </div>

            ) : (

              filteredTasks.map((task) => (

                <div
                  className={`task-card ${
                    isOverdue(task)
                      ? "overdue-card"
                      : ""
                  }`}
                  key={task._id}
                >

                  <div className="task-check">

                    <button
                      type="button"
                      onClick={() =>
                        completeTask(task)
                      }
                      className={
                        task.status ===
                        "Completed"
                          ? "checked"
                          : ""
                      }
                      title={
                        task.status ===
                        "Completed"
                          ? "Completed"
                          : "Mark as completed"
                      }
                    >
                      {task.status ===
                      "Completed"
                        ? "✓"
                        : ""}
                    </button>

                  </div>

                  <div className="task-main">

                    <div className="task-title-row">

                      <h3>
                        {task.title}
                      </h3>

                      <span
                        className={`priority ${
                          task.priority
                            ?.toLowerCase() ||
                          "medium"
                        }`}
                      >
                        {task.priority}
                      </span>

                      {isOverdue(task) && (
                        <span className="overdue-badge">
                          ⚠ Overdue
                        </span>
                      )}

                    </div>

                    {task.description && (
                      <p className="task-description">
                        {task.description}
                      </p>
                    )}

                    <div className="task-meta">

                      <span
                        className={`status ${
                          task.status
                            ?.toLowerCase()
                            .replace(
                              /\s+/g,
                              "-"
                            ) ||
                          "pending"
                        }`}
                      >
                        {task.status}
                      </span>

                      {task.dueDate && (
                        <span
                          className={
                            isOverdue(task)
                              ? "due-overdue"
                              : ""
                          }
                        >
                          📅{" "}
                          {new Date(
                            task.dueDate
                          ).toLocaleDateString()}
                        </span>
                      )}

                    </div>

                  </div>

                  <div className="task-actions">

                    {task.status !==
                      "Completed" && (

                      <button
                        type="button"
                        className="complete-btn"
                        onClick={() =>
                          completeTask(
                            task
                          )
                        }
                      >
                        ✓ Complete
                      </button>

                    )}

                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() =>
                        editTask(task)
                      }
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() =>
                        deleteTask(
                          task._id
                        )
                      }
                    >
                      🗑️
                    </button>

                  </div>

                </div>

              ))

            )}

          </div>

        </section>

        {/* CREATE TASK */}

        <section
          className="task-form-card"
          id="create-task"
        >

          <div className="card-heading">

            <span className="section-label">
              {editingId
                ? "EDIT MODE"
                : "NEW TASK"}
            </span>

            <h2>
              {editingId
                ? "Edit Task ✏️"
                : "Add New Task ➕"}
            </h2>

            <p>
              {editingId
                ? "Update your task details."
                : "Create a new task and keep your work organized."}
            </p>

          </div>

          <form
            className="task-form"
            onSubmit={handleTaskSubmit}
          >

            <div className="form-grid">

              <div className="form-group">

                <label>Title</label>

                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label>Due Date</label>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) =>
                    setDueDate(
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

            <div className="form-group">

              <label>Description</label>

              <textarea
                placeholder="Add more details about this task..."
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
              />

            </div>

            <div className="form-grid">

              <div className="form-group">

                <label>Status</label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value
                    )
                  }
                >

                  <option value="Pending">
                    Pending
                  </option>

                  <option value="In Progress">
                    In Progress
                  </option>

                  <option value="Completed">
                    Completed
                  </option>

                </select>

              </div>

              <div className="form-group">

                <label>Priority</label>

                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(
                      e.target.value
                    )
                  }
                >

                  <option value="Low">
                    Low
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="High">
                    High
                  </option>

                </select>

              </div>

            </div>

            <div className="form-buttons">

              <button
                type="submit"
                className="create-btn"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : editingId
                  ? "Update Task ✓"
                  : "Add Task →"}
              </button>

              {editingId && (

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetForm}
                >
                  Cancel
                </button>

              )}

            </div>

          </form>

        </section>

        {/* FOOTER */}

        <footer className="footer">

          <span>
            🚀 TaskFlow
          </span>

          <span>
            Stay productive. Get things done. ❤️
          </span>

        </footer>

      </main>

    </div>
  );
}

export default App;