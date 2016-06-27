
exports.login = function(req, res)
{
	res.render('pages/login', {});
};

exports.home = function(req, res)
{
	res.render('pages/home', {});
};

exports.survey = function(req, res)
{
	res.render('pages/survey', {});
	/*
	if(req.cookies.access == 'edit')
	{
		console.log("EDIT");
		res.render('pages/editsurvey', {});
	}
	else if(req.cookies.access == 'take')
	{
		console.log("TAKE");
		res.render('pages/takesurvey', {});
	}
	else
	{
		console.log("VIEW");
		res.render('pages/viewsurvey', {});
	}*/
};