const express = require("express");
const cors = require("cors");
const blogs = require("./blogs.json");
const app = express();
const port = 5000;
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello world from server ..");
});

app.get("/data", (req, res) => {
  res.send("more data coming soon");
});

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});

app.get("/blogs", (req, res) => {
  res.send(blogs);
});

app.get("/blogs/:id", (req, res) => {
  const id = parseInt(req.params.id);
  console.log("I need data for", id);
  const blog = blogs.find((blog) => blog.id === id) || {};
  res.send(blog);
});
