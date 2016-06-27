/**
 * Cookie manager
 */
var Cookies =
{
		/**
		 * Sets a single cookie value
		 */
		set: function(name, value, time)
		{
			if(time === undefined || time <= 0)
			{
				document.cookie = name + '=' + value + ';';	//expires when browser is closed
			}
			else
			{
				var d = new Date();	//used for 'remember me' login
				d.setTime(d.getTime() + time*60*60*1000);
				document.cookie = name + '=' + value + '; expires=' + d.toGMTString();
			}
		},
		/**
		 * Gets a single cookie value, if present
		 */
		get: function(name)
		{
			var cname = name + "=";
			var ca = document.cookie.split(';');
			for(var i=0; i<ca.length; i++)
			{
				var c = ca[i];
				while (c.charAt(0)==' ') c = c.substring(1);
				if (c.indexOf(cname) != -1) return c.substring(cname.length,c.length);
			}
			return "";
		},
		/**
		 * Deletes a single cookie value
		 */
		del: function(name)
		{
			var d = new Date();
			d.setTime(0);
			document.cookie = name + '=' + name + '; expires=' + d.toGMTString();
		},
		wipe: function()
		{
			this.del('id');
			this.del('name');
			this.del('pass');
			this.del('survname');
			this.del('survpass');
			this.del('access');
		},
		wipesurv: function()
		{
			this.del('survname');
			this.del('survpass');
			this.del('access');
		}
};

jQuery["postJSON"] = function( url, data, callback ) {
    // shift arguments if data argument was omitted
    if ( jQuery.isFunction( data ) ) {
        callback = data;
        data = undefined;
    }

    return jQuery.ajax({
        url: url,
        type: "POST",
        contentType:"application/json; charset=utf-8",
        dataType: "json",
        data: data,
        success: callback
    });
};

onEnter = function(event, reply) 
{
	if(event.keyCode == 13)
	{
		reply();
	}
};