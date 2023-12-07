const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');
const methodOverride = require('method-override');
const bcrypt = require('bcrypt');
require('dotenv').config();

app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const checkLogin = require('./checkLogin.js');

//세션 세팅하는 코드
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const MongoStore = require('connect-mongo');

//multer 세팅하는 코드
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = new S3Client({
  //지역 설정하기 아래는 서울 세팅됨
  region: 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'minjiforum',
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()); //업로드시 파일명 변경가능
    },
  }),
});

function consoleTime(req, res, next) {
  console.log(new Date());
  next();
}

function checkBlank(req, res, next) {
  if (req.body.username === '' || req.body.password === '') {
    res.send('아이디 또는 비밀번호가 빈칸입니다.');
  } else {
    next();
  }
}

app.use('/list', consoleTime);

app.use(passport.initialize());
app.use(
  session({
    //session 암호화 할때 쓸 비번
    secret: '암호화에 쓸 비번',
    //유저가 요청을 날릴 때 마다 session 갱신할지
    resave: false,
    //로그인 안해도 세션을 만들건지
    saveUninitialized: false,
    //세션 유지 시간 설정. 1시간
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({
      mongoUrl:
        'mongodb+srv://minji:minji0219@cluster0.lyybb93.mongodb.net/?retryWrites=true&w=majority',
      dbName: 'forum',
    }),
  })
);

app.use(passport.session());

//db 연결하는 코드
let connectDB = require('./database.js');
let db;
connectDB
  .then((client) => {
    console.log('DB연결성공');
    db = client.db('forum');
    app.listen(process.env.PORT, () => {
      console.log('서버실행중');
    });
  })
  .catch((err) => {
    console.log(err);
  });

app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.get('/list', async (req, res) => {
  let result = await db.collection('post').find().toArray();
  res.render('list.ejs', { posts: result, whole: result.length, user: req.user?._id });
});

//list에서 5개씩만 보여주기 기능
app.get('/list/:id', async (req, res) => {
  let num = req.params.id - 1;
  //skip: 위에서 num*5개 건너 뛰기, limt: 5개만 가져오기
  let whole = await db.collection('post').find().toArray();
  let result = await db
    .collection('post')
    .find()
    .skip(num * 5)
    .limit(5)
    .toArray();
  res.render('list.ejs', { posts: result, whole: whole.length });
});

app.get('/write', (req, res) => {
  res.render('write.ejs');
});

//글쓰기 기능 (write)
app.post('/add', checkLogin, upload.single('img1'), async (req, res) => {
  //s3가 주는 url
  console.log(req.file);

  try {
    if (req.body.title === '') {
      res.send(404);
    } else {
      await db.collection('post').insertOne({
        title: req.body.title,
        content: req.body.content,
        img: req.file ? req.file.location : null,
        user: req.user._id,
        username: req.user.username
      });
      res.redirect('/list');
    }
  } catch (e) {
    res.status(500).send('서버에러남');
  }

});

//글 상세페이지 보기 기능
app.get('/detail/:id', async (req, res) => {
  try {
    let result = await db
      .collection('post')
      .findOne({ _id: new ObjectId(req.params.id) });
    let comment = await db.collection('comment').find({ postId: req.params.id }).toArray();

    res.render('detail.ejs', { detail: result, comment: comment });
  } catch (e) {
    res.status(400).send('이상한 url입력함');
  }
});

//수정할 내용 보여주기 기능
app.get('/edit/:id', async (req, res) => {

  let result = await db
    .collection('post')
    .findOne({ _id: new ObjectId(req.params.id), user: new Object(req.user?._id) });
  result ? res.render('edit.ejs', { posts: result }) : res.send('수정 권한이 없습니다.');
});

//수정 기능(update)
app.put('/edit', async (req, res) => {
  try {
    await db
      .collection('post')
      .updateOne(
        { _id: new ObjectId(req.body.id) },
        { $set: { title: req.body.title, content: req.body.content } }
      );
    res.redirect('/list');
  } catch (e) {}
});

//삭제 기능(delete)
app.delete('/delete', async (req, res) => {
  try {
    const result = await db
      .collection('post')
      .deleteOne({ _id: new ObjectId(req.query.docid), user: new Object(req.user?._id) });

    if (result.deletedCount === 0) {
      res.status(400).send(false);
    } else {
      res.status(200).send(true);
    }
  } catch (e) {
    console.log(e);
  }
});

////////////
///로그인///
///////////

app.get('/signup', (req, res) => {
  res.render('signup.ejs');
});

//회원가입
app.post('/signup', checkBlank, async (req, res) => {
  //두번째 인수에는 몇번 꼬아줄지 설정하는 것. 보통 10으로 설정
  let 해시 = await bcrypt.hash(req.body.password, 10);

  let duplication = await db
    .collection('user')
    .findOne({ username: req.body.username });

  if (duplication) {
    res.send('아이디가 중복입니다.');
  } else {
    await db
      .collection('user')
      .insertOne({ username: req.body.username, password: 해시 });
    res.redirect('/');
  }
});

passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    //제출한 id, 비번 검사하는 코드 적는 곳
    let result = await db
      .collection('user')
      .findOne({ username: 입력한아이디 });
    if (!result) {
      return cb(null, false, { message: '아이디 DB에 없음' });
    }

    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: '비번불일치' });
    }
  })
);

//세션 만드는 코드. req.logIn() 코드실행 시 자동으로 실행됨.
passport.serializeUser((user, done) => {
  //내부코드를 비동기적으로 처리해주는 코드
  process.nextTick(() => {
    //아래 object 데이터 내용이 담긴 session document 만들어주고, 쿠키도 알아서 보내준다.
    done(null, { id: user._id, username: user.username });
  });
});

//쿠키 분석해주는 역할
passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection('user')
    .findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  process.nextTick(() => {
    return done(null, result);
  });
});

app.get('/login', (req, res) => {
  res.render('login.ejs');
});

//로그인
app.post('/login', checkBlank, async (req, res) => {
  //위의 코드를 실행시키는 함수
  //2번째 인수로 로그인 검사 후 액션의 코들 짜면 됨
  //error: 에러가 났을때. user: 로그인 성공했을 때. info: 로그인 실패했을 때의 이유
  passport.authenticate('local', (error, user, info) => {
    if (error) return res.status(500).json(error);
    if (!user) return res.status(401).json(info.message);
    //session 만드는 것
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  })(req, res);
});

app.get('/mypage', checkLogin, (req, res) => {
  if (req.user) {
    res.render('mypage.ejs', { userid: req.user.username });
  } else {
    res.send('로그인된 유저만 접근 가능');
  }
});

app.use('/', require('./routes/shop.js'));
app.use('/board/sub', require('./routes/board.js'));

app.post('/search', async (req, res) => {

  let 검색조건 = [
    {
      $search: {
        index: 'title_index',
        text: { query: req.body.search, path: 'title' }
      }
    }
  ];
  const result = await db.collection('post').aggregate(검색조건).toArray();
  res.render('list.ejs', { posts: result, whole: result.length });
});

//댓글 입력
app.post('/comment', async (req, res) => {

  try {
    const result =
      await db
        .collection('comment')
        .insertOne({
          postId: req.body.postId,
          content: req.body.comment,
          username: req.user?.username
        });
    res.redirect('back');
  } catch (e) {
    console.log(e);
  };
});

app.post('/chat', async (req, res) => {

  await db.collection('chat').insertOne({ roomId: req.params.docid });
});
