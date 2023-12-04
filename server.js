const express = require('express');
const app = express();

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
const { MongoClient } = require('mongodb');

let db;
const url = 'mongodb+srv://minji:minji0219@cluster0.lyybb93.mongodb.net/?retryWrites=true&w=majority';
new MongoClient(url).connect().then((client) => {
  console.log('DB연결성공');
  db = client.db('forum');
  app.listen(8080, () => {
    console.log('서버실행중');
  });
}).catch((err) => {
  console.log(err);
});


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/news', (req, res) => {
  db.collection('post').insertOne({ title: '어쩌구' });
  // res.send('데이터~');
});
app.get('/list', async (req, res) => {
  let result = await db.collection('post').find().toArray();
  res.render('list.ejs', { posts: result });
});

app.get('/time', (req, res) => {
  res.render('time.ejs', { time: new Date() });
});
