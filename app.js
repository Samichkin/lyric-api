require('dotenv').config();

var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();

var pool = mysql.createPool({
  connectionLimit: process.env.DB_CONNLIMIT,
	host     : process.env.DB_HOST,
	user     : process.env.DB_USER,
	password : process.env.DB_PASS,
	database : process.env.DB_DATABASE
})

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname + '/index.html'));
})

app.get('/about', function(req, res) {
	res.sendFile(path.join(__dirname + '/about.html'));
})

app.get('/lyrics', function(req, res) {
	res.sendFile(path.join(__dirname + '/lyrics.html'));
})

app.get('/guide', function(req, res) {
	res.sendFile(path.join(__dirname + '/guide.html'));
})

app.get('/login', function(req, res) {
	res.sendFile(path.join(__dirname + '/login.html'));
})

app.get('/admin', function(req, res) {
	if (req.session.loggedin) {
		res.sendFile(path.join(__dirname + '/admin.html'));
	} else {
		res.send('Please login to view this page!');
	}
});

app.get('/admin/add', function(req, res) {
	if (req.session.loggedin) {
		res.sendFile(path.join(__dirname + '/add.html'));
	} else {
		res.send('Please login to view this page!');
	}
});

app.get('/admin/remove', function(req, res) {
	if (req.session.loggedin) {
		res.sendFile(path.join(__dirname + '/remove.html'));
	} else {
		res.send('Please login to view this page!');
	}
});

app.get('/images/:version', function(req, res) {
  var obj = req.params.version;
	res.sendFile(path.join(__dirname + '/img/'+ obj +'.png'));
})


app.get('/api/update', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  pool.query('SELECT * FROM album', function (err, result, fields) {
    if (err) throw err;
    console.log(result);
    res.send(result);
  });
})

app.get('/api/:version', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  var obj = req.params.version.toUpperCase();
  pool.getConnection(function(err, connection) {
    if (err) throw err
    pool.query("SELECT * FROM album INNER JOIN song ON album.albumName = song.albumName WHERE album.bandName = '" + obj + "'", function (err, result, fields) {
      if (err) throw err;
      console.log(result);
      res.send(result);
    });
  });
})

app.post('/login/auth', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	if (username && password) {
		pool.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/admin');
			} else {
				res.send('Incorrect Username and/or Password!');
			}
			res.end();
		});
	} else {
		res.send('Please enter Username and Password!');
		res.end();
	}
});

app.post('/admin/add/album', function(req, res) {
	var bandname = req.body.bandname;
	var albumname = req.body.albumname;
  var values = [
    [albumname, bandname]
  ];
  pool.query('SELECT * FROM album WHERE albumName = ? AND bandName = ?', [albumname, bandname], function(err, results, fields) {
    if (err) throw err;
    if (results.length > 0) {
      res.send('Album already exists in database!');
    } else {
      pool.query('INSERT INTO album (albumName, bandName) VALUES ?', [values], function(err, results, fields) {
        if (err) throw err;
        res.send('Album succesfully created!')
    	});
    }
	});
});

app.post('/admin/add/song', function(req, res) {
	var albumnamesong = req.body.albumnamesong;
	var songname = req.body.songname;
  var songlyrics = req.body.songlyrics;
  var values = [
    [albumnamesong, songname, songlyrics]
  ];
  pool.query('SELECT songName FROM song WHERE songName = ?', [songname], function(err, results, fields) {
    if (err) throw err;
    if (results.length > 0) {
      res.send('Song already exists in database!');
    } else {
      pool.query('INSERT INTO song (albumName, songName, songLyrics) VALUES ?', [values], function(err, results, fields) {
        if (err) throw err;
        res.send('Song succesfully created!');
    	});
    }
	});
});

app.post('/admin/remove/album/', function(req, res) {
	var bandname = req.body.bandname;
	var albumname = req.body.albumname;
  var values = [
    [albumname, bandname]
  ];
  pool.query("SELECT * FROM song WHERE albumName = '" + albumname + "'", function(err, results, fields) {
    if (err) throw err;
    if (results.length > 0) {
      pool.query("DELETE FROM song WHERE albumName = '" + albumname + "'", function(err, results, fields) {
        if (err) throw err;
    	});
    }
	});
  pool.query("SELECT * FROM album WHERE albumName = '" + albumname + "' AND bandName = '" + bandname + "'", function(err, results, fields) {
    if (err) throw err;
    if (results.length > 0) {
      pool.query("DELETE FROM album WHERE albumName = '" + albumname + "' AND bandName = '" + bandname + "'", function(err, results, fields) {
        if (err) throw err;
      });
      res.send('Album succesfully removed!');
    } else {
      res.send('Album does not exist in database!');
    }
  });
});

app.post('/admin/remove/song', function(req, res) {
	var albumnamesong = req.body.albumnamesong;
	var songname = req.body.songname;
  pool.query("SELECT * FROM song WHERE albumName = '" + albumnamesong + "' AND songName = '" + songname + "'", function(err, results, fields) {
    if (err) throw err;
    if (results.length == 0) {
      res.send('Song does not exist in database!');
    } else {
      pool.query("DELETE FROM song WHERE albumName = '" + albumnamesong + "' AND songName = '" + songname + "'", function(err, results, fields) {
        if (err) throw err;
        res.send('Song succesfully removed!')
    	});
    }
	});
});

app.get('/admin/logout', function(req, res) {
  req.session.loggedin = false;
  req.session.username = "";
	res.redirect('/');
})

var server = app.listen(3000, function () {
   var host = server.address().address
   var port = server.address().port

   console.log("App is listening at http://%s:%s", host, port)
})
