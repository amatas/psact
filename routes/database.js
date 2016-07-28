var read = require('fs').readFileSync;
var ejs = require('ejs');
var nodemailer = require('nodemailer');

//Database Setup
var nano = require('nano')('http://localhost:5984');
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
var authdetails = require('../authentication.json');
//console.log(authdetails.mailsmtp);
var mail = nodemailer.createTransport({
	host: authdetails.mailsmtp,
	secure: true,
	auth: {
		user: authdetails.mailuser,
		pass: authdetails.mailpass
	}
});
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
		from: 'noreply@PSACT.com',
		to: to,
		subject: subject,
		text: text
	});
}

//REQUEST FUNCTIONS//

function reqRegisterClienttoSurvey(uid, sid, spass, callback)
{
	var reply = {status: false, error: ''};
	var recRegClientInSurvey = function(uid, sid)
	{
		db.get('SURVEY##' + sid, function(err, body)
				{
			if(err)
			{
				recRegClientInSurvey(uid, sid);
			}
			else
			{
				body.clients.push(uid);
				db.insert(body, 'SURVEY##' + sid, function(err)
						{
					if(err)
					{
						recRegClientInSurvey(uid, sid);
					}
					else
					{
						reply.status = true;
						callback(reply);
					}
						});
			}
				});
	};
	var recRegClientInUser = function(uid, sid, stitle, pass, exptime)
	{
		db.get('USER##' + uid, function(err, body)
				{
			if(err)
			{
				reply.error = 'User file not found';
				callback(reply);
			}
			else
			{
				body.client.push({id: sid, title: stitle, pass: pass, exptime: exptime});
				db.insert(body, 'USER##' + uid, function(err)
						{
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
	db.get('SURVEY##' + sid, function(err, body)
			{
		if(err)
		{
			reply.error = 'Survey does not exist in database';
			callback(reply);
		}
		else if(body.pass != spass)
		{
			reply.error = 'Invalid password';
			callback(reply);
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
				reply.error = 'Already registered in survey';
				callback(reply);
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
	var reply = {status: false, error: ''};
	var recRegEditInSurvey = function(uid, sid)
	{
		db.get('SURVEY##' + sid, function(err, body)
				{
			if(err)
			{
				recRegEditInSurvey(uid, sid);
			}
			else
			{
				body.editors.push(uid);
				db.insert(body, 'SURVEY##' + sid, function(err)
						{
					if(err)
					{
						recRegEditInSurvey(uid, sid);
					}
					else
					{
						reply.status = true;
						callback(reply);
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
				reply.error = 'User file not found';
				callback(reply);
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
			reply.error = 'Survey does not exist in database';
			callback(reply);
		}
		else if(body.editpass != editpass)
		{
			reply.error = 'Invalid editor password';
			callback(reply);
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
				reply.error = 'Already registered as editor';
				callback(reply);
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
							if(requests[req.body.num].registerUser)
							{
								//TODO: REGISTER USER CODE
							}
							else if(requests[req.body.num].registerEditor)
							{
								//TODO: REGISTER EDITOR CODE
							}
							else
							{
								recRemoveRequest(req.body.num, function(){
									res.json({success: true, content: compileModule('reqredirector', body)});
								});
							}
						}
					});
				}
				else
				{
					recRemoveRequest(req.body.num, function(){
						res.json({success: true, content: compileModule('reqredirector', body)});
					});
				}
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
	reqRegisterClienttoSurvey(req.cookies.id, req.body.name, req.body.pass, function(data){res.json(data);});
};

exports.registerEditortoSurvey = function(req, res)
{
	reqRegisterEditortoSurvey(req.cookies.id, req.body.name, req.body.editpass, function(data){res.json(data);});
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
				if(body.responses[i].id == req.cookies.id)
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
