const express = require("express");
const app = express();
const { MongoClient, ObjectId } = require("mongodb");
const methodOverride = require("method-override");

app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let db;
const url =
  "mongodb+srv://minji:minji0219@cluster0.lyybb93.mongodb.net/?retryWrites=true&w=majority";
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
    app.listen(8080, () => {
      console.log("서버실행중");
    });
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/news", (req, res) => {
  db.collection("post").insertOne({ title: "어쩌구" });
  // res.send('데이터~');
});
app.get("/list", async (req, res) => {
  let result = await db.collection("post").find().toArray();
  res.render("list.ejs", { posts: result });
});

app.get("/write", (req, res) => {
  res.render("write.ejs");
});

app.post("/add", async (req, res) => {
  try {
    if (req.body.title === "") {
      res.send(404);
    } else {
      await db
        .collection("post")
        .insertOne({ title: req.body.title, content: req.body.content });
      res.redirect("/list");
    }
  } catch (e) {
    res.status(500).send("서버에러남");
  }
});

app.get("/detail/:id", async (req, res) => {
  try {
    let result = await db
      .collection("post")
      .findOne({ _id: new ObjectId(req.params.id) });
    res.render("detail.ejs", { detail: result });
  } catch (e) {
    res.status(400).send("이상한 url입력함");
  }
});

app.get("/edit/:id", async (req, res) => {
  let result = await db
    .collection("post")
    .findOne({ _id: new ObjectId(req.params.id) });
  res.render("edit.ejs", { posts: result });
});

app.put("/edit", async (req, res) => {
  try {
    await db
      .collection("post")
      .updateOne(
        { _id: new ObjectId(req.body.id) },
        { $set: { title: req.body.title, content: req.body.content } }
      );
    res.redirect("/list");
  } catch (e) {}
});
