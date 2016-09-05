
/**
 * Module dependencies.
 */

var express = require('express')
  , index = require('./routes/index')
  , database = require('./routes/database')
  , http = require('http')
  , path = require('path')
  , cookieParser = require('cookie-parser');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

///////////////////////////////////////////////
//              SERVER REQUESTS              //
///////////////////////////////////////////////

//script provision
app.get('/css', function(req, res){res.sendfile('./public/stylesheets/psact.css');});
app.get('/script/ejs', function(req, res){res.sendfile('./node_modules/ejs/ejs.js');});
app.get('/script/jquery', function(req, res){res.sendfile('./public/javascript/jquery_min.js');});
app.get('/script/utility', function(req, res){res.sendfile('./public/javascript/PSACTutility.js');});

//page loading
app.get('/', index.login);
app.get('/home', index.home);
app.get('/survey', index.survey);
app.get('/invite', database.useInviteLink);

//request processing
app.get('/acctrequest', database.acctRequest);
app.post('/processrequest', database.processRequest);

//general database operations
app.post('/registeruser', database.registerUser);
app.post('/usercheck', database.userCheck);
app.post('/fetchhomepage', database.fetchHomepage);
app.post('/createsurvey', database.createSurvey);
app.post('/registerclienttosurvey', database.registerClienttoSurvey);
app.post('/registereditortosurvey', database.registerEditortoSurvey);
app.post('/changename', database.changeName);
app.post('/changebio', database.changeBio);
app.post('/fetchsurvey', database.fetchSurvey);
app.post('/fetchquestion', database.fetchQuestion);
app.post('/getuserbio', database.getUserBio);
app.post('/changeresponse', database.changeResponse);
app.post('/removeresponse', database.removeResponse);
app.post('/newquestion', database.newQuestion);
app.post('/removequestion', database.removeQuestion);
app.post('/changetitle', database.changeTitle);
app.post('/changeqtitle', database.changeQTitle);
app.post('/updatedescription', database.updateDescription);
app.post('/updateanswers', database.updateAnswers);
app.post('/updateoptions', database.updateOptions);
app.post('/sendinvites', database.sendInvites);
app.post('/getinvitelink', database.getInviteLink);
app.post('/answerinvite', database.answerInvite);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
