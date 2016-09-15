var read = require('fs').readFileSync;
var ejs = require('ejs');
var nodemailer = require('nodemailer');
var authdetails = require('../PSACTAuth.json');
var tea = require('./blockTEA.js');
var teapass = 'thisisthePSACTcipherkeyhere';

//Database Setup
var nano = require('nano')(authdetails.databaseurl);
nano.db.list(function(err, body){
	var dbPresent = false;
	body.forEach(function(db){  //check to see if database exists
		if(db === 'psact') {dbPresent = true;}
	});
	if(!dbPresent){  //create database
		nano.db.create('psact');
	}
});
var db = nano.use('psact');
db.get('REQUESTS', function(err, body)
		{
	if(err)
	{
		db.insert({}, 'REQUESTS');
	}
		});
function compileModule(filename, vars)
{
	return ejs.compile(read(__dirname + '/../views/modules/' + filename + '.ejs', 'utf8'))(vars);
}
function placeRequest(data, callback)
{
	function reqPlaceRequest()
	{
		db.get('REQUESTS', function(err, body)
				{
			if(!err)
			{
				var num = Math.floor(Math.random() * 10000);
				body[num] = data;
				db.insert(body, body._id, function(err, body)
						{
					if(err)
					{
						reqPlaceRequest();
					}
					else
					{
						callback(num);
					}
						})
			}
				});
	}
	reqPlaceRequest();
}

//Mailer Setup
var mailOptions = {};
if(authdetails.mailuser && 0 !== authdetails.mailuser.length)
{
	mailOptions =
	{
		host: authdetails.mailsmtp,
		secure: true,
		auth: {
			user: authdetails.mailuser,
			pass: authdetails.mailpass
		}
	}
}
else
{
	mailOptions = {
		host: authdetails.mailsmtp
	}
}
var mail = nodemailer.createTransport(mailOptions);
mail.verify(function(error, success)
		{
	if(error)
	{
		console.error('ERROR: MAIL SERVICE NOT FUNCTIONING');
	}
		});
function email(to, subject, text)
{
	mail.sendMail({
		from: authdetails.fromaddress,
		to: to,
		subject: subject,
		text: text
	});
}
//REQUEST FUNCTIONS//

function reqRegisterClienttoSurvey(uid, sid, spass, callback)
{
	var recRegClientInSurvey = function(uid, sid)
	{
		db.get('SURVEY##' + sid, function(err, body) {
			if(err)
			{
				recRegClientInSurvey(uid, sid);
			}
			else
			{
				body.clients.push(uid);
				db.insert(body, 'SURVEY##' + sid, function(err) {
					if(err)
					{
						recRegClientInSurvey(uid, sid);
					}
					else
					{
						var now = new Date()
						callback(null, body.exptime <= now.getTime());
					}
				});
			}
		});
	};
	var recRegClientInUser = function(uid, sid, stitle, pass, exptime)
	{
		db.get('USER##' + uid, function(err, body) {
			if(err)
			{
				callback("ERROR: User file not found", null);
			}
			else
			{
				body.client.push({id: sid, title: stitle, pass: pass, exptime: exptime});
				db.insert(body, 'USER##' + uid, function(err) {
					if(err)
					{
						recRegClientInUser(uid, sid, stitle, pass, exptime);
					}
					else
					{
						recRegClientInSurvey(uid, sid);
					}
				});
			}
		});
	};
	db.get('SURVEY##' + sid, function(err, body) {
		if(err)
		{
			callback("ERROR: Survey does not exist in database");
		}
		else if(body.pass != spass)
		{
			callback("ERROR: Invalid password");
		}
		else
		{
			var stitle = body.title;
			var alreadythere = false;
			for(var i = 0; i < body.clients.length; i++)
			{
				if(uid == body.clients[i]) {alreadythere = true;}
			}
			if(alreadythere)
			{
				callback("ERROR: Already registered in survey");
			}
			else
			{
				recRegClientInUser(uid, sid, stitle, spass, parseInt(body.exptime));
			}
		}
	});
}

function reqRegisterEditortoSurvey(uid, sid, editpass, callback)
{
	var recRegEditInSurvey = function(uid, sid)
	{
		db.get('SURVEY##' + sid, function(err, body) {
			if(err)
			{
				recRegEditInSurvey(uid, sid);
			}
			else
			{
				body.editors.push(uid);
				db.insert(body, 'SURVEY##' + sid, function(err) {
					if(err)
					{
						recRegEditInSurvey(uid, sid);
					}
					else
					{
						callback(null);
					}
				});
			}
		});
	};
	var recRegEditInUser = function(uid, sid, stitle, editpass, exptime)
	{
		db.get('USER##' + uid, function(err, body) {
			if(err)
			{
				callback("ERROR: user file not found");
			}
			else
			{
				body.editor.push({id: sid, title: stitle, editpass: editpass, exptime: exptime});
				db.insert(body, 'USER##' + uid, function(err) {
					if(err)
					{
						recRegEditInUser(uid, sid, stitle, editpass, exptime);
					}
					else
					{
						recRegEditInSurvey(uid, sid);
					}
				});
			}
		});
	};
	db.get('SURVEY##' + sid, function(err, body) {
		if(err)
		{
			callback("ERROR: Survey does not exist in database");
		}
		else if(body.editpass != editpass)
		{
			callback("ERROR: Invalid editor password");
		}
		else
		{
			var alreadythere = false;
			for(var i = 0; i < body.editors.length; i++)
			{
				if(uid == body.editors[i]) {alreadythere = true;}
			}
			if(alreadythere)
			{
				callback("ERROR: Already registered as editor");
			}
			else
			{
				recRegEditInUser(uid, sid, body.title, editpass, parseInt(body.exptime));
			}
		}
	});
}

function reqActivateUser(uid, uname, upass, callback)
{
	db.get('USER##' + uid, function(err, body){
		if(err)
		{
			var data = {
					name: uname,
					pass: upass,
					bio: '',
					client: [],
					editor: []
			};
			db.insert(data, 'USER##' + uid, function(err, body) {
				if(err) {reqActivateUser(uid, uname, upass, callback);}
				else {callback(null);}
			});
		}
		else
		{
			callback('ERROR: Account for email ' + uid + ' already present in system');
		}
	});
}

//REQUEST PROCESSING FUNCTIONS//

exports.acctRequest = function(req, res)
{
	res.render('pages/acctrequest', {num: req.query.num});
};

exports.processRequest = function(req, res)
{
	function recRemoveRequest(num, callback)
	{
		db.get('REQUESTS', function(err, body){
			if(!err)
			{
				delete body[num];
				db.insert(body, 'REQUESTS', function(err){if(err){recRemoveRequest(num, callback);}else{callback(null);}});
			}
			else
			{
				callback('ERROR: Failure to access database');
			}
		});
	}
	function requestRegister(body, requests)
	{
		if(requests[req.body.num].register)
		{
			var r = requests[req.body.num].register;
			if(r.editor)
			{
				reqRegisterEditortoSurvey(r.uid, r.sid, r.spass, function(err) {
					if(err)
					{
						body.error = err;
						recRemoveRequest(req.body.num, function(){
							res.json({success: true, content: compileModule('reqredirector', body)});
						});
					}
					else
					{
						body.survname = r.sid;
						body.survpass = r.spass;
						body.access = 'edit';
						recRemoveRequest(req.body.num, function(){
							res.json({success: true, content: compileModule('reqredirector', body)});
						});
					}
				});
			}
			else
			{
				reqRegisterClienttoSurvey(r.uid, r.sid, r.spass, function(err, isExpired) {
					if(err)
					{
						body.error = err;
						recRemoveRequest(req.body.num, function(){
							res.json({success: true, content: compileModule('reqredirector', body)});
						});
					}
					else
					{
						body.survname = r.sid;
						body.survpass = r.spass;
						body.access = 'take';
						if(isExpired) body.access = 'view';
						recRemoveRequest(req.body.num, function(){
							res.json({success: true, content: compileModule('reqredirector', body)});
						});
					}
				});
			}
		}
		else
		{
			recRemoveRequest(req.body.num, function(){
				res.json({success: true, content: compileModule('reqredirector', body)});
			});
		}
	}
	function requestActivate(body, requests)
	{
		if(requests[req.body.num].activate)
		{
			var a = requests[req.body.num].activate;
			reqActivateUser(a.id, a.name, a.pass, function(err){
				if(err)
				{
					body.error = err;
					recRemoveRequest(req.body.num, function(){
						res.json({success: true, content: compileModule('reqredirector', body)});
					});
				}
				else
				{
					body.id = a.id;
					body.name = a.name;
					body.pass = a.pass;
					requestRegister(body, requests)
				}
			});
		}
		else
		{
			requestRegister(body, requests)
		}
	}
	body = {
		error: null,
		id: null,
		name: null,
		pass: null,
		survname: null,
		survpass: null,
		access: null
	};
	db.get('REQUESTS', function(err, requests){
		if(err)
		{
			body.error = "ERROR ACCESSING DATABASE, TRY AGAIN LATER";
			res.json({success: true, content: compileModule('reqredirector', body)});
		}
		else
		{
			if(requests[req.body.num])
			{
				requestActivate(body, requests);
			}
			else
			{
				body.error = "REQUEST NOT FOUND";
				res.json({success: true, content: compileModule('reqredirector', body)});
			}
		}
	});
};

//CLIENT INTERFACE FUNCTIONS//

exports.registerUser = function(req, res)
{
	db.get('USER##' + req.cookies.id, function(err, body)
			{
		if(!err) {res.json({status: 0});}
		else
		{
			var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	        var string_length = 6;
	        var randomstring = '';
	        for (var i=0; i<string_length; i++) {
	            var rnum = Math.floor(Math.random() * chars.length);
	            randomstring += chars.substring(rnum,rnum+1);
	        }
			placeRequest(
					{
						activate: {
							id: req.cookies.id,
							name: req.cookies.name,
							pass: randomstring
						}
					}, function(num)
					{
						email(req.cookies.id, 'PSACT Account Activation', 'Hello ' + req.cookies.name + ', Welcome to PSACT! This email was used to register an account with the PSACT service.\nTo activate your account, follow this link:\n' + authdetails.URL + '/acctrequest?num=' + num + '\nYour password is: '+randomstring+'');
						res.json({status: 1});
					});
		}
			});
};

exports.userCheck = function(req, res)
{
	var reply = {status: false};
	db.get('USER##' + req.cookies.id, function(err, body)
			{
		if(!err)
		{
			if(body.pass == req.cookies.pass)
			{
				reply.name = body.name;
				reply.status = true;
			}
		}
		res.json(reply);
			});
};

exports.fetchHomepage = function(req, res)
{
	var reply = {};
	db.get('USER##' + req.cookies.id, function(err, body)
			{
		if(err)
		{
			reply.status = false;
		}
		else
		{
			if(body.pass == req.cookies.pass)
			{
				reply.status = true;
				reply.content = compileModule('homecontent', body);
			}
			else
			{
				reply.status = false;
			}
		}
		res.json(reply);
			});
};

exports.createSurvey = function(req, res)
{
	var reply = {};
	db.get('SURVEY##' + req.body.name, function(err, body)
			{
		if(err)
		{
			var survey = {
					title: req.body.name,
					pass: req.body.pass,
					editpass: req.body.editpass,
					exptime: parseInt(req.body.exptime),
					clients: [],
					editors: [],
					questions: [],
					options: {
						showtallyonview: false,
						showtallyontake: false,
						showresponview: true,
						showrespontake: true
					}
			};
			db.insert(survey, 'SURVEY##' + req.body.name, function(err, body)
					{
				if(err)
				{
					reply.status = false;
					reply.msg = 'Unknown error';
					res.json(reply);
				}
				else
				{
					reply.status = true;
					res.json(reply);
				}
					});
		}
		else
		{
			reply.status = false;
			reply.msg = 'Survey already exists';
			res.json(reply);
		}
			});
};

exports.registerClienttoSurvey = function(req, res)
{
	reqRegisterClienttoSurvey(req.cookies.id, req.body.name, req.body.pass, function(err){res.json({status:!err,error:err});});
};

exports.registerEditortoSurvey = function(req, res)
{
	reqRegisterEditortoSurvey(req.cookies.id, req.body.name, req.body.editpass, function(err){res.json({status:!err,error:err});});
};

exports.changeName = function(req, res)
{
	var recChangeName = function(id, newname)
	{
		db.get('USER##' + id, function(err, body)
				{
			if(err)
			{
				res.json(false);
			}
			else
			{
				body.name = newname;
				db.insert(body, body._id, function(err)
						{
					if(err)
					{
						recChangeName(id, newname);
					}
					else
					{
						res.json(true);
					}
						});
			}
				});
	};
	recChangeName(req.cookies.name, req.body.text);
};

exports.changeBio = function(req, res)
{
	var recChangeBio = function(id, bio)
	{
		db.get('USER##' + id, function(err, body)
				{
			if(err)
			{
				res.json({status:false});
			}
			else
			{
				body.bio = bio;
				db.insert(body, 'USER##' + id, function(err)
						{
					if(err)
					{
						recChangeBio(id, bio);
					}
					else
					{
						res.json({status:true});
					}
						});
			}
				});
	};
	recChangeBio(req.cookies.id, req.body.text);
};

exports.fetchSurvey = function(req, res)
{
	var reply = {success: false};
	db.get('USER##' + req.cookies.id, function(err, body)
			{
		if(err)
		{
			reply.message = "ERROR: User authentication failed.";
			res.json(reply);
		}
		else
		{
			if(body.pass == req.cookies.pass)
			{
				db.get('SURVEY##' + req.cookies.survname, function(err, body)
						{
					if(err)
					{
						reply.message = "ERROR: Unknown survey.";
						res.json(reply);
					}
					else
					{
						var pass = body.pass;
						var registered = false;
						for(i = 0; i < body.editors.length; i++)	//editors can be in view or edit mode
						{
							if(body.editors[i] == req.cookies.id) registered = true;
						}
						if(req.cookies.access == 'edit')
						{
							pass = body.editpass;	//for editor view only accepts editpass
						}
						else
						{
							for(i = 0; i < body.clients.length; i++)
							{
								if(body.clients[i] == req.cookies.id) registered = true;
							}
						}
						if(req.cookies.survpass == pass || req.cookies.survpass == body.editpass && registered)
						{
							reply.success = true;
							reply.data = body;
							switch(req.cookies.access)
							{
							case 'view':
								reply.content = compileModule('viewsurveycontent', body);
								break;
							case 'take':
								reply.content = compileModule('takesurveycontent', body);
								break;
							case 'edit':
								reply.content = compileModule('editsurveycontent', body);
								break;
							}
							res.json(reply);
						}
						else
						{
							reply.message = "ERROR: Survey access denied.";
							res.json(reply);
						}
					}
						});
			}
			else
			{
				reply.message = "ERROR: Incorrect stored user data.";
				res.json(reply);
			}
		}
			});
};

exports.fetchQuestion = function(req, res)
{
	var reply = {success: false};
	db.get("QUESTION##" + req.cookies.survname + "##" + req.body.id, function(err, body)
			{
		if(err)
		{
			res.json(reply);
		}
		else
		{
			body.id = req.body.id;
			body.userid = req.cookies.id;
			body.username = req.cookies.name;
			body.options = req.body.options;
			reply.success = true;
			switch(req.cookies.access)
			{
			case 'view':
				reply.content = compileModule('viewsurveyquestion', body);
				break;
			case 'take':
				reply.content = compileModule('takesurveyquestion', body);
				break;
			case 'edit':
				reply.content = compileModule('editsurveyquestion', body);
				break;
			}
			res.json(reply);
		}
			});
};

exports.getUserBio = function(req, res)
{
	db.get("USER##" + req.body.name, function(err, body)
			{
		if(err) res.json({bio: "INFO NOT FOUND"});
		else res.json({bio: body.bio});
			});
};

exports.changeResponse = function(req, res)
{
	db.get("QUESTION##" + req.cookies.survname + "##" + req.body.id, function(err, body)
			{
		if(err)
		{
			res.json({success: false});
		}
		else
		{
			for(var i = 0; i < body.responses.length; i++)
			{
				if(body.responses[i].id === req.cookies.id)
				{
					body.responses.splice(i, 1);
				}
			}
			body.responses.push({
				id: req.cookies.id,
				name: req.cookies.name,
				answer: req.body.answer,
				comment: req.body.comment
			});
			db.insert(body, "QUESTION##" + req.cookies.survname + "##" + req.body.id, function(err)
					{
				if(err)
				{
					res.json({success: false});
				}
				else
				{
					res.json({success: true});
				}
					});
		}
			});
};

exports.removeResponse = function(req, res)
{
	db.get("QUESTION##" + req.cookies.survname + "##" + req.body.id, function(err, body)
			{
		if(err)
		{
			res.json({success: false});
		}
		else
		{
			for(var i = 0; i < body.responses.length; i++)
			{
				if(body.responses[i].id == req.cookies.id)
				{
					body.responses.splice(i, 1);
				}
			}
			db.insert(body, "QUESTION##" + req.cookies.survname + "##" + req.body.id, function(err)
					{
				if(err)
				{
					res.json({success: false});
				}
				else
				{
					res.json({success: true});
				}
					});
		}
			});
}

exports.newQuestion = function(req, res)
{
	var name = req.cookies.survname;
	var num = 0;
	var recCheckQ = function(reply)
	{
		num = Math.floor(Math.random() * 1000000);
		db.get('QUESTION##' + name + '##' + num, function(err, body)
				{
			if(err) reply();
			else recCreateQ(reply);
				});
	};
	var recCreateQ = function(reply)
	{
		var qname = "QUESTION##" + name + "##" + num;
		var q = {
				title: "New Question",
				description: "",
				answers: [],
				responses: [],
				enablecomments: true
		};
		db.insert(q, qname, function(err, body)
				{
			if(err) recCreateQ(reply);
			else reply();
				});
	};
	var recAddQ = function()
	{
		db.get("SURVEY##" + name, function(err, body)
				{
			if(err) res.json(false);
			else
			{
				body.questions.push({title: "New Question", id: num});
				db.insert(body, "SURVEY##" + name, function(err, body)
						{
					if(err) recAddQ();
					else res.json(true);
						});
			}
				});
	}
	db.get("SURVEY##" + name, function(err, body)
			{
		if(err) res.json(false);
		else
		{
			recCheckQ(function()
					{
				recCreateQ(function()
						{
					recAddQ(req.cookies.survname);
						});
					});
		}
			});
	
};

exports.removeQuestion = function(req, res)
{
	var name = req.cookies.survname;
	var num = req.body.id;
	var recDestroy = function(reply)
	{
		db.get("QUESTION##" + name + "##" + num, function(err, body)
				{
			if(err) reply();
			else db.destroy(body._id, body._rev, function(){reply();});
				});
	};
	var recRemove = function(reply)
	{
		db.get("SURVEY##" + name, function(err, body)
				{
			if(err) reply();
			else
			{
				for(var i = 0; i < body.questions.length; i++)
				{
					if(body.questions[i].id == "" + num) body.questions.splice(i, 1);
				}
				db.insert(body, body._id, function(err, body){reply()});
			}
				});
	};
	recDestroy(function(){recRemove(function(){res.json(true)})});
};

exports.changeTitle = function(req, res)
{
	var clientlist;
	var editorlist;
	var recChange = function(reply)
	{
		db.get("SURVEY##" + req.cookies.survname, function(err, body)
				{
			if(err) reply();
			else
			{
				clientlist = body.clients;
				editorlist = body.editors;
				body.title = req.body.newtitle;
				db.insert(body, body._id, function(err, body){if(err){recChange(reply);}else{reply();}});
			}
				});
	};
	var recUpdate = function(sendlist, reply)
	{
		if(sendlist.length <= 0)
		{
			reply();
		}
		else
		{
			db.get('USER##' + sendlist[0], function(err, body)
					{
				if(err)
				{
					sendlist.splice(0, 1);
					recUpdate(sendlist, reply);
				}
				else
				{
					for(var i = 0; i < body.client.length; i++)
					{
						if(body.client[i].id == req.cookies.survname)
						{
							body.client[i].title = req.body.newtitle;
						}
					}
					for(var i = 0; i < body.editor.length; i++)
					{
						if(body.editor[i].id == req.cookies.survname)
						{
							body.editor[i].title = req.body.newtitle;
						}
					}
					db.insert(body, body._id, function(err, body)
							{
						if(!err) sendlist.splice(0, 1);
						recUpdate(sendlist, reply);
							});
				}
					});
		}
	}
	recChange(function()
			{
		recUpdate(clientlist, function()
				{
			recUpdate(editorlist, function()
					{
				res.json(true);
					});
				});
			});
};

exports.changeTime = function(req, res)
{
	var clientlist;
	var editorlist;
	var newtime = parseInt(req.body.newtime);
	var recChange = function(reply)
	{
		db.get("SURVEY##" + req.cookies.survname, function(err, body)
				{
			if(err) reply();
			else
			{
				clientlist = body.clients;
				editorlist = body.editors;
				body.exptime = newtime;
				db.insert(body, body._id, function(err, body){if(err){recChange(reply);}else{reply();}});
			}
				});
	};
	var recUpdate = function(sendlist, reply)
	{
		if(sendlist.length <= 0)
		{
			reply();
		}
		else
		{
			db.get('USER##' + sendlist[0], function(err, body)
					{
				if(err)
				{
					sendlist.splice(0, 1);
					recUpdate(sendlist, reply);
				}
				else
				{
					for(var i = 0; i < body.client.length; i++)
					{
						if(body.client[i].id == req.cookies.survname)
						{
							body.client[i].exptime = newtime;
						}
					}
					for(var i = 0; i < body.editor.length; i++)
					{
						if(body.editor[i].id == req.cookies.survname)
						{
							body.editor[i].exptime = newtime;
						}
					}
					db.insert(body, body._id, function(err, body)
							{
						if(!err) sendlist.splice(0, 1);
						recUpdate(sendlist, reply);
							});
				}
					});
		}
	}
	recChange(function()
			{
		recUpdate(clientlist, function()
				{
			recUpdate(editorlist, function()
					{
				res.json(true);
					});
				});
			});
};

exports.changeQTitle = function(req, res)
{
	var recChange = function(reply)
	{
		db.get("QUESTION##" + req.cookies.survname + "##" + req.body.id, function(err, body)
				{
			if(err) reply();
			else
			{
				body.title = req.body.newtitle;
				db.insert(body, body._id, function(err, body){if(err){recChange(reply);}else{reply();}});
			}
				});
	};
	var recUpdate = function(reply)
	{
		db.get("SURVEY##" + req.cookies.survname, function(err, body)
				{
			if(err) reply();
			else
			{
				for(var i = 0; i < body.questions.length; i++)
				{
					if(body.questions[i].id == req.body.id)
					{
						body.questions[i].title = req.body.newtitle;
						db.insert(body, body._id, function(err, body){if(err){recUpdate(reply);}else{reply();}});
					}
				}
			}
				});
	};
	recChange(function()
			{
		recUpdate(function()
				{
			res.json(true);
				});
			});
};

exports.updateDescription = function(req, res)
{
	var recChange = function()
	{
		db.get("QUESTION##" + req.cookies.survname + "##" + req.body.id, function(err, body)
				{
			if(err) res.json(false);
			else
			{
				body.description = req.body.description.replace(/(\r\n|\n|\r)/gm,"");
				db.insert(body, body._id, function(err, body){if(err){recChange();}else{res.json(true);}});
			}
				});
	}
	recChange();
};

exports.updateAnswers = function(req, res)
{
	var recChange = function()
	{
		db.get("QUESTION##" + req.cookies.survname + "##" + req.body.id, function(err, body)
				{
			if(err) res.json(false);
			else
			{
				body.answers = req.body.answers ? req.body.answers : [];
				db.insert(body, body._id, function(err, body){if(err){recChange();}else{res.json(true);}});
			}
				});
	}
	recChange();
};

exports.updateOptions = function(req, res)
{
	var recChange = function()
	{
		db.get("SURVEY##" + req.cookies.survname, function(err, body)
				{
			if(err) res.json(false);
			else
			{
				for(var opt in req.body.options)
				{
					req.body.options[opt] = (req.body.options[opt] == "true") ? true : false;
				}
				body.options = req.body.options;
				db.insert(body, body._id, function(err, body){if(err){recChange();}else{res.json(true);}});
			}
				});
	}
	recChange();
};

exports.sendInvites = function(req, res)
{
	var emails = req.body.emails.split(",");
	if(req.body.emails == ""){res.json("Please enter one or more email addresses separated by commas.");}
	var wrapup = function()
	{
		//email(req.cookies.id, "PSACT Invite Sent Confirmation", 'Hello ' + user.name + '! This email is to confirm that you sent an invite to meeting ' +);
		
		
		
		res.json("Action successful, subscription emails have been sent.");
	}
	var sendEmails = function(body, tosend)
	{
		if(tosend.length == 0)
		{
			wrapup();
		}
		else
		{
			var mail = tosend.pop();
			db.get('USER##' + mail, function(err, user){
				if(err)
				{
					var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
			        var string_length = 6;
			        var randomstring = '';
			        for (var i=0; i<string_length; i++) {
			            var rnum = Math.floor(Math.random() * chars.length);
			            randomstring += chars.substring(rnum,rnum+1);
			        }
					placeRequest({
						activate: {
							id: mail,
							name: mail.split("@")[0],
							pass: randomstring,
						},
						register: {
							client: 1,
							uid: mail,
							sid: body._id.substr(8),
							spass: body.pass
						}
					}, function(num){
						email(mail, "PSACT Activation & Survey Invitation", 'Hello, and welcome to PSACT! You have been invited to take part in a survey using the PSACT service.\nTo activate your account, follow this link:\n' + authdetails.URL + '/acctrequest?num=' + num + '\nYour password is: ' + randomstring + '');
						sendEmails(body, tosend);
						console.log(authdetails.URL + '/acctrequest?num=' + num);
					});
				}
				else
				{
					placeRequest({
						register: {
							client: 1,
							uid: mail,
							sid: body._id.substr(8),
							spass: body.pass
						}
					}, function(num){
						email(mail, "PSACT Survey Invitation", 'Hello ' + user.name + '! You have been invited to take part in a survey using the PSACT service.\nTo accept the invitation, follow this link:\n' + authdetails.URL + '/acctrequest?num=' + num + '\n');
						sendEmails(body, tosend);
						console.log(authdetails.URL + '/acctrequest?num=' + num);
					});
				}
			});
		}
	}
	var valid = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
	for(var i = 0; i < emails.length; i++)
	{
		emails[i] = emails[i].trim();
		if(!valid.test(emails[i]))
		{
			res.json("Invalid input. Input must consist of one or more email addresses separated by commas.");
			return;
		}
	}
	var tosend = emails;
	db.get('SURVEY##' + req.cookies.survname, function(err, body){
		if(err) {res.json("There was an error communicating with the server.")}
		else
		{
			sendEmails(body, tosend);
		}
	});
};

exports.getInviteLink = function(req, res)
{
	res.json(authdetails.URL+"/invite?id="+tea.encrypt(req.body.name, teapass));
};

exports.useInviteLink = function(req, res)
{
	console.log(req.query.id);
	var name = tea.decrypt(req.query.id, teapass);
	console.log(name);
	db.get(name, function(err, data){
		if(!err) res.render('pages/login', {invitation: true, survname: name.substring(8), survpass: data.pass});
	});
	
	
	/*Game Plan:
	 * routes to special login page, or tweaks existing login with EJS tricks
	 * login creates request, then immediately redirects to that request
	 * single-channel registration works
	 */
};

exports.answerInvite = function(req, res)
{
	var username;
	console.log(req.body.uid);
	db.get('USER##'+req.body.uid, function(err, body){
		if(err)
		{
			if(!req.body.isNew) res.json({err:"Invalid login"});
			username = req.body.uname;
		}
		else
		{
			if(req.body.isNew) res.json({err:"Email already registered"});
			if(body.pass !== req.body.upass) res.json({err:"Invalid login"});
			username = body.name;
		}
		db.get('SURVEY##'+req.body.sname, function(err, body){
			if(err)
			{
				res.json({err:"Survey not found"});
			}
			else
			{
				var alreadythere = false;
				for(var i = 0; i < body.editors.length; i++)
				{
					if(req.body.uid == body.editors[i]) alreadythere = true;
				}
				for(var i = 0; i < body.clients.length; i++)
				{
					if(req.body.uid == body.clients[i]) alreadythere = true;
				}
				if(alreadythere)
				{
					res.json({err:"Already registered to survey '"+body.title+"', go to the survey from your homepage", gohome:1, name:username});
				}
				else
				{
					placeRequest(req.body.data, function(num){
						if(req.body.isNew)
						{
							email(req.body.uid, "Your PSACT Password", 'Hello, '+req.body.uname+', and welcome to PSACT! To log back into this account, you will need to enter the credentials:\nUsername: '+req.body.uid+'\nPassword: '+req.body.upass);
						}
						console.log(authdetails.URL + '/acctrequest?num=' + num);
						res.json({num:num, name:username});
					});
				}
			}
		});
	});
};

exports.forgotPass = function(req, res)
{
	db.get('USER##'+req.body.id, function(err, body){
		if(err)
			res.json(false);
		else
		{
			email(req.body.id, "PSACT Password Reminder", 'Hello, '+body.name+', this is a requested reminder that your PSACT password is '+body.pass);
			res.json(true);
		}
	});
};