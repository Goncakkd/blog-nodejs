var express = require("express");
var mysql = require("mysql");
var bodyParser = require("body-parser");
var urlencodedParser = bodyParser.urlencoded({ extended: false });
const session = require("express-session");
var crypto = require("crypto");
var router = express.Router();
let mailSent = require("./send-mail.js");
router.use(express.static("public"));
router.use(
  session({
    secret: "Özel-Anahtar",
    resave: false,
    saveUninitialized: true,
  })
);
//var sessionSet = false;

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  port: 3306,
  database: "blognode",
});

con.connect(function (err) {
  if (err) console.log(err);
  else {
    console.log("connected to DB");
  }
});

router.get("/", function (req, res, next) {
  getAllPosts(req, res);
});
router.get("/register", function (req, res, next) {
  var data = {
    title: "Register",
    alertStatus: "d-none",
    sessionSet: false,
  };
  res.render("register", data);
});
router.get("/login", function (req, res, next) {
  var data = {
    title: "Login",
    alertStatus: "d-none",
    sessionSet: false,
  };
  res.render("login", data);
});

router.post("/register", urlencodedParser, function (req, res) {
  response = { username: req.body.userName, password: req.body.password };
  addUser(req, res);
});

router.post("/login", urlencodedParser, function (req, res) {
  response = { emailAddress: req.body.email, password: req.body.password };
  loginControl(req.body.email, req.body.password, req.session, res);
});

router.get("/forgot-password", function (req, res) {
  sessionSet = sessionControl(req);
  res.render("forgot-password", {
    sessionSet: sessionSet,
    alertStatus: "d-none",
  });
});
router.post("/forgot-password", urlencodedParser, function (req, res) {
  var encodedEmail = Buffer.from(req.body.email).toString("base64");
  console.log(encodedEmail);
  var mailOptions = {
    from: "goncakaradenizz@gmail.com",
    to: req.body.email,
    subject: "Şifremi unuttum",
    text:
      "Merhaba, şifrenizi linke tıklayarak değiştirebilirsiniz =>  http://" +
      req.headers.host +
      "/reset-password?code=" +
      encodedEmail +
      "",
  };
  if (mailSent.sendEmail(mailOptions) != "") {
    //res.redirect("/");
    res.render("forgot-password", { sessionSet: sessionSet, alertStatus: "" });
  }
});

router.get("/reset-password", function (req, res) {
  var emailEncoded = req.query.code;
  var email = Buffer.from(emailEncoded, "base64").toString("ascii");
  res.render("reset-password", {
    sessionSet: sessionSet,
    email: email,
    alertStatus: "d-none",
  });
});
router.get("/profile", function (req, res) {
  getUser(req, res, "d-none");
});
router.post("/profile", urlencodedParser, function (req, res) {
  sessionSet = sessionControl(req);
  var selectQuery = "UPDATE users SET FirstName = ?, LastName = ? WHERE ID = ?";
  con.query(
    selectQuery,
    [req.body.isim, req.body.soyisim, req.session.userid],
    function (err, result) {
      if (err) {
        res.end(JSON.stringify(err));
      } else {
        getUser(req, res, "");
      }
    }
  );
});

router.get("/write-post", function (req, res, next) {
  sessionSet = sessionControl(req);

  if (sessionSet) {
    res.render("write-post", {
      sessionSet: sessionSet,
      alertStatus: "d-none",
    });
  } else {
    res.redirect("./login");
  }
});
router.post("/write-post", urlencodedParser, function (req, res, next) {
  sessionSet = sessionControl(req);

  if (sessionSet) {
    values = [req.session.userid, req.body.titleContent, req.body.postContent];
    var insertQuery = "INSERT INTO posts (UserID, PostTitle, Post) VALUES (?)";
    con.query(insertQuery, [values], function (err, result) {
      if (err) {
        res.end(JSON.stringify(err));
      } else {
        res.render("write-post", {
          sessionSet: sessionSet,
          alertStatus: "",
        });
      }
    });
  } else {
    res.redirect("./login");
  }
});

router.get("/myposts", function (req, res, next) {
  getMyPosts(req, res);
});
router.get("/edit-post", function (req, res, next) {
  getPost(req.query.id, req, res, "d-none");
});
router.post("/edit-post", urlencodedParser, function (req, res, next) {
  sessionSet = sessionControl(req);

  if (sessionSet) {
    values = [req.body.titleContent, req.body.postContent, req.body.id];
    console.log(values);
    var updateQuery = "UPDATE posts SET PostTitle = ?, Post = ? WHERE ID = ?";
    con.query(
      updateQuery,
      [req.body.titleContent, req.body.postContent, req.body.id],
      function (err, result) {
        if (err) {
          res.end(JSON.stringify(err));
        } else {
          getPost(req.body.id, req, res, "");
          //res.redirect("./edit-post?id=" + req.body.id);
        }
      }
    );
  } else {
    res.redirect("./login");
  }
});
router.get("/delete-post", function (req, res, next) {
  sessionSet = sessionControl(req);

  if (sessionSet) {
    var updateQuery = "DELETE FROM posts WHERE ID = ?";
    con.query(updateQuery, [req.query.id], function (err, result) {
      if (err) {
        res.end(JSON.stringify(err));
      } else {
        res.redirect("./myposts");
      }
    });
  } else {
    res.redirect("./login");
  }
});
router.post("/reset-password", urlencodedParser, function (req, res) {
  var password = req.body.password;
  var password2 = req.body.password2;
  var email = req.body.email;
  if (password != password2) {
    res.render("reset-password", {
      email: email,
      sessionSet: sessionSet,
      alertStatus: "",
    });
  } else {
    console.log("equal");
    updatePassword(email, password, res);
  }
});
router.get("/logout", function (req, res) {
  sessionSet = false;
  req.session.destroy();

  res.redirect("/");
});
router.get("/getSearch", function (req, res) {
  searchPosts(req, res);
});
router.get("/post-detail", urlencodedParser, function (req, res) {
  getPostDetail(req, res);
});

function getUser(req, res, alertStatus) {
  sessionSet = sessionControl(req);
  var selectQuery = "SELECT * FROM users WHERE ID = ?";
  con.query(selectQuery, [req.session.userid], function (err, result) {
    if (err) {
      res.end(JSON.stringify(err));
    } else {
      if (sessionSet) {
        res.render("profile", {
          sessionSet: sessionSet,
          alertStatus: alertStatus,
          user: result[0],
        });
      } else {
        res.redirect("./login");
      }
    }
  });
}

function searchPosts(req, res) {
  sessionSet = sessionControl(req);
  console.log(req.query.word);
  var selectQuery =
    "SELECT posts.*, users.FirstName, users.LastName FROM posts INNER JOIN users ON posts.UserID = users.ID WHERE posts.Post LIKE ? OR posts.PostTitle LIKE ?";
  con.query(
    selectQuery,
    ["%" + req.query.word + "%", "%" + req.query.word + "%"],
    function (err, result) {
      res.send(result);
    }
  );
}
function getPostDetail(req, res) {
  sessionSet = sessionControl(req);
  console.log(req.query.id);
  var selectQuery =
    "SELECT posts.*, users.FirstName, users.LastName FROM posts INNER JOIN users ON posts.UserID = users.ID WHERE posts.ID = ?";
  con.query(selectQuery, [req.query.id], function (err, result) {
    res.render("post-detail", {
      sessionSet: sessionSet,
      alertStatus: "d-none",
      post: result[0],
    });
  });
}
function getAllPosts(req, res) {
  sessionSet = sessionControl(req);
  var selectQuery =
    "SELECT posts.*, users.FirstName, users.LastName FROM posts INNER JOIN users ON posts.UserID = users.ID";
  con.query(selectQuery, function (err, result) {
    res.render("index", {
      sessionSet: sessionSet,
      alertStatus: "d-none",
      posts: result,
    });
  });
}
function getMyPosts(req, res) {
  sessionSet = sessionControl(req);
  var selectQuery = "SELECT * FROM posts WHERE UserID = ?";
  con.query(selectQuery, [req.session.userid], function (err, result) {
    if (sessionSet) {
      res.render("myposts", {
        sessionSet: sessionSet,
        alertStatus: "d-none",
        myposts: result,
      });
    } else {
      res.redirect("./login");
    }
  });
}
function getPost(id, req, res, alertStatus) {
  sessionSet = sessionControl(req);
  var selectQuery = "SELECT * FROM posts WHERE ID = ?";
  con.query(selectQuery, [id], function (err, result) {
    if (sessionSet) {
      res.render("edit-post", {
        sessionSet: sessionSet,
        alertStatus: alertStatus,
        result: result[0],
      });
    } else {
      res.redirect("./login");
    }
  });
}

function sessionControl(req) {
  sessionid = req.session.userid;
  console.log("sessionid" + sessionid);
  sessionSet = sessionid != undefined ? true : false;
  return sessionSet;
}

function addUser(req, res) {
  sessionSet = sessionControl(req);
  var selectQuery = "SELECT * FROM users WHERE Email = ?";
  con.query(selectQuery, [req.body.email], function (err, result) {
    if (err) {
      res.end(JSON.stringify(err));
    } else {
      var numRows = result.length;
      if (numRows == 0) {
        var mykey = crypto.createCipher("aes-128-cbc", "mypassword");
        password = mykey.update(req.body.password, "utf8", "hex");
        password += mykey.final("hex");

        var now = Math.floor(new Date().getTime() / 1000);

        values = [
          req.body.firstName,
          req.body.lastName,
          req.body.email,
          password,
          now,
        ];
        var insertQuery =
          "INSERT INTO users (FirstName, LastName, Email, Password, RegisterDate) VALUES (?)";
        con.query(insertQuery, [values], function (err, result) {
          if (err) {
            res.end(JSON.stringify(err));
          } else {
            res.redirect("/login");
          }
        });
      } else {
        res.render("register", { sessionSet: sessionSet, alertStatus: "" });
      }
    }
  });
}

function loginControl(email, password, session, res) {
  var mykey = crypto.createCipher("aes-128-cbc", "mypassword");
  password = mykey.update(password, "utf8", "hex");
  password += mykey.final("hex");

  var selectQuery = "SELECT * FROM users WHERE Email = ? AND Password = ?";
  con.query(selectQuery, [email, password], function (err, result) {
    if (err) {
      res.end(JSON.stringify(err));
    } else {
      if (result.length == 1) {
        session.userid = result[0].ID;
        res.redirect("./profile");
      } else {
        res.render("login", {
          sessionSet: sessionSet,
          alertStatus: "",
        });
      }
      // res.end(JSON.stringify(result));
    }
  });
}

function updatePassword(email, password, res) {
  var mykey = crypto.createCipher("aes-128-cbc", "mypassword");
  password = mykey.update(password, "utf8", "hex");
  password += mykey.final("hex");
  console.log(email + " " + password);
  var selectQuery = "UPDATE users SET Password = ? WHERE Email = ?";
  con.query(selectQuery, [password, email], function (err, result) {
    console.log(result);
    if (err) {
      res.end(JSON.stringify(err));
    } else {
      if (result.affectedRows != 0) {
        res.redirect("./login");
      }
      // res.end(JSON.stringify(result));
    }
  });
}
module.exports = router;
