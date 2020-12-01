(function(root){

	if(!root.ODI) root.ODI = {};

	// Define a ready function that checks if the document is ready
	if(!root.ODI.ready) root.ODI.ready = function(f){ if(/in/.test(document.readyState)){ setTimeout('ODI.ready('+f+')',9); }else{ f(); } };

	// Define an ajax function (in the style of jQuery)
	root.ODI.ajax = function(url,attrs){

		if(typeof url!=="string") return false;
		if(!attrs) attrs = {};
		var cb = "",qs = "";
		var oReq,urlbits;
		// If part of the URL is query string we split that first
		if(url.indexOf("?") > 0){
			urlbits = url.split("?");
			if(urlbits.length){
				url = urlbits[0];
				qs = urlbits[1];
			}
		}
		if(attrs.dataType=="jsonp"){
			cb = 'fn_'+(new Date()).getTime();
			window[cb] = function(rsp){
				if(typeof attrs.success==="function") attrs.success.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
			};
		}
		if(typeof attrs.cache==="boolean" && !attrs.cache) qs += (qs ? '&':'')+(new Date()).valueOf();
		if(cb) qs += (qs ? '&':'')+'callback='+cb;
		if(attrs.data) qs += (qs ? '&':'')+attrs.data;

		// Build the URL to query
		if(attrs.method=="POST") attrs.url = url;
		else attrs.url = url+(qs ? '?'+qs:'');

		if(attrs.dataType=="jsonp"){
			var script = document.createElement('script');
			script.src = attrs.url;
			document.body.appendChild(script);
			return this;
		}

		// code for IE7+/Firefox/Chrome/Opera/Safari or for IE6/IE5
		oReq = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
		oReq.addEventListener("load", window[cb] || complete);
		oReq.addEventListener("error", error);
		oReq.addEventListener("progress", progress);
		var responseTypeAware = 'responseType' in oReq;
		if(attrs.beforeSend) oReq = attrs.beforeSend.call((attrs['this'] ? attrs['this'] : this), oReq, attrs);
		if(attrs.dataType=="script") oReq.overrideMimeType('text/javascript');

		function complete(evt) {
			attrs.header = oReq.getAllResponseHeaders();
			var rsp;
			if(oReq.status == 200 || oReq.status == 201 || oReq.status == 202) {
				rsp = oReq.response;
				if(oReq.responseType=="" || oReq.responseType=="text") rsp = oReq.responseText;
				if(attrs.dataType=="json"){
					try {
						if(typeof rsp==="string") rsp = JSON.parse(rsp.replace(/[\n\r]/g,"\\n").replace(/^([^\(]+)\((.*)\)([^\)]*)$/,function(e,a,b,c){ return (a==cb) ? b:''; }).replace(/\\n/g,"\n"));
					} catch(e){ error(e); }
				}

				// Parse out content in the appropriate callback
				if(attrs.dataType=="script"){
					var fileref=document.createElement('script');
					fileref.setAttribute("type","text/javascript");
					fileref.innerHTML = rsp;
					document.head.appendChild(fileref);
				}
				attrs.statusText = 'success';
				if(typeof attrs.success==="function") attrs.success.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
			}else{
				attrs.statusText = 'error';
				error(evt);
			}
			if(typeof attrs.complete==="function") attrs.complete.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
		}

		function error(evt){
			if(typeof attrs.error==="function") attrs.error.call((attrs['this'] ? attrs['this'] : this),evt,attrs);
		}

		function progress(evt){
			if(typeof attrs.progress==="function") attrs.progress.call((attrs['this'] ? attrs['this'] : this),evt,attrs);
		}

		if(responseTypeAware && attrs.dataType){
			try { oReq.responseType = attrs.dataType; }
			catch(err){ error(err); }
		}

		try{ oReq.open((attrs.method||'GET'), attrs.url, true); }
		catch(err){ error(err); }

		if(attrs.method=="POST") oReq.setRequestHeader('Content-type','application/x-www-form-urlencoded');

		try{ oReq.send((attrs.method=="POST" ? qs : null)); }
		catch(err){ error(err); }

		return this;
	};

	root.ODI.CoastLine = function(id,options){
		if(!options) options = {};
		this.opt = options;
		this.log = new Logger({'id':'CoastLine','logging':options.logging});
		this.el = document.getElementById(id);
		if(!this.el){
			this.log.error('No DOM element exists '+id);
			delete this.el;
			return this;
		}
		this.events = {};
		this.inputs = {};
		this.defaults = {};
		if(options.inputs) this.inputs = options.inputs;
		if(options.defaults) this.defaults = options.defaults;
		// Set some defaults if not set
		for(var i in this.inputs){
			if(!this.defaults[i]){
				if(this.inputs[i].tagName=="SELECT") this.defaults[i] = this.inputs[i].value;
				if(this.inputs[i].tagName=="INPUT"){
					if(this.inputs[i].type=="checkbox") this.defaults[i] = this.inputs[i].checked;
				}
			}
		}

		var readyState = false;
		var ns = 'http://www.w3.org/2000/svg';

		// Make a ready function that waits until readyState is true
		this.ready = function(f){
			var _obj = this;
			if(!readyState) setTimeout(function(){ _obj.ready(f); },9);
			else{
				if(typeof f==="function") f.call(this);
			}
		};

		// Get points of interest before doing anything else
		ODI.ajax((options.poi || "data/poi.csv"),{
			"dataType": "text",
			"cache": false,
			"this": this,
			"success": function(d,attr){
				// Parse the CSV (trimming extra newlines at the end)
				d = CSVToArray(d.replace(/[\n\r]{1,}$/g,""));
				var r,p,c,l;
				// Build an array of points-of-interest
				this.poi = {};
				for(r = 1; r < d.length; r++){
					p = "";
					for(c = 0; c < d[0].length; c++){
						if(d[0][c]=="coast") p = d[r][c];	
					}
					if(p && !this.poi[p]) this.poi[p] = [];
					this.poi[p].push({});
					l = this.poi[p].length - 1;
					for(c = 0; c < d[0].length; c++){
						k = d[0][c];
						v = parseFloat(d[r][c]);
						this.poi[p][l][k] = (v==d[r][c] ? v : d[r][c]);
						if(k=="segments"){
							this.poi[p][l][k] = (this.poi[p][l][k]+'').split(/;/);
						}
					}
				}
				readyState = true;
			},
			"error": function(e,attr){
				this.log.error('Unable to load '+attr.url);
			}
		});

		// Initialise the SVG (do this after adding "defaults")
		this.init = function(fn){
			this.svg = document.createElementNS(ns,'svg');
			if(this.defaults && this.defaults.shape) this.svg.classList.add('shape');
			this.svg.innerHTML += '<style>path.coast { fill: #efefef; }svg:not(.shape) rect { transform: scale(1)!important; } svg:not(.shape) .label { transform: scale(1,-1)!important; } svg:not(.shape) rect, svg:not(.shape) .label { transition: transform 1s ease 0s, height 0.5s ease 1s, fill 1.5s ease 0s;} svg.shape rect, svg.shape .label { cursor: pointer; height: 6px; rx: 3px; transition: transform 1s ease 0.5s, height 0.5s ease 0s, fill 1.5s ease 0s!important; } svg text { font-size:16px;font-family:Arial;font-weight:bold; transform: translate(6px,0); dominant-baseline: middle; text-anchor: start; } svg.shape text.right { transform: translate(-6px,0); text-anchor: end; }</style>';
			this.setSize(this.el.clientWidth,this.el.clientHeight);
			this.el.appendChild(this.svg);

			// Now create a <g> to flip the coordinate system
			this.group = document.createElementNS(ns,'g');
			this.group.setAttribute('transform','translate(0,'+this.el.clientHeight+') scale(1,-1)');
			this.svg.appendChild(this.group);

			return this;
		};

		// Attach a handler to an event for the OSMEditor object in a style similar to that used by jQuery
		//   .on(eventType[,eventData],handler(eventObject));
		//   .on("authenticate",function(e){ console.log(e); });
		//   .on("authenticate",{me:this},function(e){ console.log(e.data.me); });
		this.on = function(ev,e,fn){
			if(typeof ev!="string") return this;
			if(typeof fn==="undefined"){
				fn = e;
				e = {};
			}else{
				e = {data:e}
			}
			if(typeof e!="object" || typeof fn!="function") return this;
			if(this.events[ev]) this.events[ev].push({e:e,fn:fn});
			else this.events[ev] = [{e:e,fn:fn}];
			return this;
		};

		// Trigger a defined event with arguments. This is for internal-use to be 
		// sure to include the correct arguments for a particular event
		this.trigger = function(ev,args){
			if(typeof ev != "string") return;
			if(typeof args != "object") args = {};
			var o = [];
			if(typeof this.events[ev]=="object"){
				for(var i = 0 ; i < this.events[ev].length ; i++){
					var e = extendObject(this.events[ev][i].e,args);
					if(typeof this.events[ev][i].fn == "function") o.push(this.events[ev][i].fn.call(e['this']||this,e))
				}
			}
			if(o.length > 0) return o;
		};

		this.loadData = function(id,file){
			this.defaults.id = id;
			ODI.ajax(file,{
				"dataType":"text",
				"this": this,
				"id": id,
				"success": function(d,attr){
					var r,c,k,v,data,n;
					
					// Parse the CSV (trimming extra newlines at the end)
					d = CSVToArray(d.replace(/[\n\r]{1,}$/g,""));

					// Build an array of objects - one for each row in the data
					data = new Array(d.length-1);
					for(r = 1; r < d.length; r++){
						data[r-1] = {};
						for(c = 0; c < d[0].length; c++){
							k = d[0][c];
							v = parseFloat(d[r][c]);
							data[r-1][k] = (v==d[r][c] ? v : d[r][c]);
						}
					}
					if(!this.data) this.data = {};
					
					this.data[attr.id] = data;
					this.updateSVG(attr.id);
				},
				"error": function(e,attr){
					this.log.error('Unable to load '+attr.url);
				}
			})
			return this;
		}
		this.hideTooltip = function(){
			this.tooltip = document.getElementById('tooltip');
			if(this.tooltip) this.tooltip.setAttribute('style','display:none;');
			return this;
		}
		this.showTooltip = function(el){
			// Find the properties of the element
			var id = el.getAttribute('data-id');
			var i = el.getAttribute('data-i');

			// Get or create the tooltip element
			this.tooltip = document.getElementById('tooltip');
			if(!this.tooltip){
				this.tooltip = document.createElement('div');
				this.tooltip.setAttribute('id','tooltip');
				this.tooltip.innerHTML = "fred";
				this.svg.insertAdjacentElement('afterend', this.tooltip);
				var _obj = this;
				this.tooltip.addEventListener('mouseout',function(e){ _obj.hideTooltip(); });
			}

			// Set the contents
			this.tooltip.innerHTML = (this.data[id][i]._tooltip || el.querySelector('title').innerHTML);

			// Position the tooltip
			var bb = el.getBoundingClientRect();	// Bounding box of SVG element
			var bbo = this.el.getBoundingClientRect(); // Bounding box of SVG holder
			this.tooltip.setAttribute('style','position:absolute;left:'+Math.round(bb.left + bb.width/2 - bbo.left + this.el.scrollLeft)+'px;top:'+Math.round(bb.top + bb.height/2 - bbo.top)+'px;transform:translate3d(0,-50%,0);');

			return this;
		}
		this.updateSVG = function(id){

			if(!id) id = this.defaults.id;

			var d,r,i,k,path,vb,xy,len,xsep,pad,x,y,ang,tall,_obj,w;

			r = {'lat':{'min':1e100,'max':-1e100},'lon':{'min':1e100,'max':-1e100}};

			if(!this.opt) this.opt = {};
			if(!this.opt.x) this.opt.x = {};
			if(!this.opt.y) this.opt.y = {};
			if(!this.opt.x.padding) this.opt.x.padding = 28;
			if(!this.opt.y.padding) this.opt.y.padding = 28;

			for(i = 0; i < this.data[id].length; i++){
				if(this.data[id][i].startlat){
					r.lat.min = Math.min(r.lat.min,this.data[id][i].startlat,this.data[id][i].endlat);
					r.lat.max = Math.max(r.lat.max,this.data[id][i].startlat,this.data[id][i].endlat);
					r.lon.min = Math.min(r.lon.min,this.data[id][i].startlon,this.data[id][i].endlon);
					r.lon.max = Math.max(r.lon.max,this.data[id][i].startlon,this.data[id][i].endlon);
				}
				for(k in this.data[id][i]){
					if(!r[k]) r[k] = {'min':1e100,'max':-1e100};
					if(typeof this.data[id][i][k]==="number"){
						r[k].min = Math.min(r[k].min,this.data[id][i][k]);
						r[k].max = Math.max(r[k].max,this.data[id][i][k]);
					}
				}
			}

			vb = this.viewBox;
			xy = new Array(this.data[id].length);
			_obj = this; 
			
			function clearEl(el){
				if(el){
					while(el.firstChild){
						el.removeChild(el.firstChild);
					}
				}else{
					console.error('No element',el);
				}
			}
			
			function getXY(lat,lon){
				var dlat = r.lat.max-r.lat.min;
				var dlon = r.lon.max-r.lon.min;
				var lonscale = Math.cos(lat*Math.PI/180);
				var dh = vb.h - 2*_obj.opt.y.padding;
				var dw = vb.w - 2*_obj.opt.x.padding;
				var scale = Math.min(dh/dlat,dw/dlon);

				var x = 0;
				var y = 0;
				x = _obj.opt.x.padding + (lon - r.lon.min)*scale*lonscale;
				y = _obj.opt.y.padding + (lat - r.lat.min)*scale;
				return {'x':x,'y':y,'w':(dlon)*scale*(Math.cos(((r.lat.max-r.lat.min)/2 + r.lat.min)*Math.PI/180))};
			}

			if(this.group){
				// Clear group
				clearEl(this.group);
				if(this.coast) delete this.coast;
				if(this.poi){
					for(poi in this.poi){
						// Remove points of interest
						for(i = 0; i < this.poi[poi].length; i++){
							if(this.poi[poi][i]._el){
								clearEl(this.poi[poi][i]._el);
								delete this.poi[poi][i]._el;
							}
						}
					}
				}
			}

			if(!this.coast){
				this.coast = document.createElementNS(ns,"path");
				this.group.appendChild(this.coast);
			}

			d = "";
			len = 0;
			x = this.opt.x.padding;
			y = this.opt.y.padding;
			xsep = (this.opt.x && this.opt.x.spacing ? this.opt.x.spacing : 0);

			// Calculate the new width of the SVG based on the barchart
			w = this.opt.x.padding;
			for(i = 0; i < this.data[id].length; i++){
				xy[i] = {'start':getXY(this.data[id][i].startlat,this.data[id][i].startlon),'end':getXY(this.data[id][i].endlat,this.data[id][i].endlon)};
				len = Math.sqrt(Math.pow((xy[i].start.x - xy[i].end.x),2) + Math.pow((xy[i].start.y - xy[i].end.y),2));
				w += len + xsep;
			}
			w += this.opt.x.padding;

			// Set SVG size
			this.setSize(w,vb.h);

			// Find the x-offset to shift the map to the middle
			this.xoff = (w - xy[0].start.w)/2;

			for(i = 0; i < this.data[id].length; i++){
				if(this.data[id][i].startlat){
					xy[i] = {'start':getXY(this.data[id][i].startlat,this.data[id][i].startlon),'end':getXY(this.data[id][i].endlat,this.data[id][i].endlon)};
					len = Math.sqrt(Math.pow((xy[i].start.x - xy[i].end.x),2) + Math.pow((xy[i].start.y - xy[i].end.y),2));
					ang = Math.atan2((xy[i].end.y - xy[i].start.y),(xy[i].end.x - xy[i].start.x))*180/Math.PI;
					xy[i].len = len;
					
					if(!this.data[id][i]._el){
						this.data[id][i]._el = document.createElementNS(ns,"rect");
						// Attach a hover event
						this.data[id][i]._el.addEventListener('mouseover',function(e){
							_obj.showTooltip(e.currentTarget);
						});
						this.group.appendChild(this.data[id][i]._el);
						this.data[id][i]._txt = document.createElementNS(ns,"title");
						this.data[id][i]._el.appendChild(this.data[id][i]._txt);
					}

					xy[i].colour = ODI.Colour.getColourFromScale(this.defaults.scale,this.data[id][i][this.defaults.key],r[this.defaults.key].min,r[this.defaults.key].max);

					// Calculate the x,y offsets for the line compared to the shape
					dx = xy[i].start.x + this.xoff - x;
					dy = xy[i].start.y - y;

					tall = (vb.h - this.opt.y.padding*2) * (this.data[id][i][this.defaults.key] - 0)/(r[this.defaults.key].max - 0);

					// Set coastline shape path
					d += (i==0 || gap ? 'M':' L')+(this.xoff + xy[i].start.x).toFixed(2)+','+xy[i].start.y.toFixed(2);

					this.data[id][i]._el.setAttribute('width',len.toFixed(2));
					this.data[id][i]._el.setAttribute('height',tall);
					this.data[id][i]._el.setAttribute('x',x.toFixed(2));
					this.data[id][i]._el.setAttribute('y',y.toFixed(2));
					this.data[id][i]._el.setAttribute('style','transform-origin: '+x.toFixed(2)+'px '+(y+2.5).toFixed(2)+'px;transform: translate('+dx.toFixed(2)+'px,'+dy.toFixed(2)+'px) rotate('+ang.toFixed(2)+'deg)');
					this.data[id][i]._el.setAttribute('fill',xy[i].colour);
					this.data[id][i]._el.setAttribute('stroke-width',8);
					this.data[id][i]._el.setAttribute('stroke-linecap','round');
					this.data[id][i]._el.setAttribute('data-id',id);
					this.data[id][i]._el.setAttribute('data-i',i);

					// Match any points-of-interest and store their x/y values
					if(this.poi[id]){
						for(p = 0; p < this.poi[id].length; p++){
							for(s = 0; s < this.poi[id][p].segments.length; s++){
								if(this.data[id][i].nearestid == this.poi[id][p].segments[s] && !this.poi[id][p]._p){
									this.poi[id][p]._p = {'x':x,'y':y};
								}
							}
						}
					}
					
					this.data[id][i]._txt.innerHTML = this.data[id][i].nearestid+': '+this.data[id][i][this.defaults.key];
					this.data[id][i]._tooltip = this.data[id][i].nearestid+'<br />'+this.data[id][i][this.defaults.key]

					x += len + xsep;
					gap = false;
				}else{
					gap = true;
				}
			}
			this.coast.setAttribute('d',d);
			this.coast.setAttribute('class','coast');
			x += this.opt.x.padding;

			fs = 12;

			if(this.poi[id]){
				// Add points of interest
				for(i = 0; i < this.poi[id].length; i++){
					p = getXY(this.poi[id][i].lat,this.poi[id][i].lon);
					x = this.poi[id][i]._p.x;
					y = this.poi[id][i]._p.y - this.opt.y.padding/2 - fs/2;
					dx = p.x + this.xoff - x;
					dy = p.y - y;
					align = this.poi[id][i].align;

					if(!this.poi[id][i]._el){
						// Create a <g> containing a <circle>, <text> and <text> (background)
						this.poi[id][i]._el = document.createElementNS(ns,"g");
						this.poi[id][i]._el.classList.add('label');
						this.poi[id][i]._circle = document.createElementNS(ns,"circle");
						this.poi[id][i]._circle.setAttribute('r',4);

						txt = document.createElementNS(ns,"text");
						txt.innerHTML = this.poi[id][i].name;
						txt.setAttribute('style','stroke:white;stroke-width:5;');
						this.poi[id][i]._txt = txt;

						txt2 = document.createElementNS(ns,"text");
						txt2.innerHTML = this.poi[id][i].name;

						this.poi[id][i]._txt2 = txt2;
						this.poi[id][i]._el.appendChild(this.poi[id][i]._circle);
						this.poi[id][i]._el.appendChild(txt);
						this.poi[id][i]._el.appendChild(txt2);
						this.group.appendChild(this.poi[id][i]._el);
					}
					this.poi[id][i]._circle.setAttribute('cx',x.toFixed(2)+'px');
					this.poi[id][i]._circle.setAttribute('cy',y.toFixed(2)+'px');
					this.poi[id][i]._txt.setAttribute('class',align);
					this.poi[id][i]._txt.setAttribute('x',(x.toFixed(2))+'px');
					this.poi[id][i]._txt.setAttribute('y',(y.toFixed(2))+'px');
					this.poi[id][i]._txt2.setAttribute('x',(x.toFixed(2))+'px');
					this.poi[id][i]._txt2.setAttribute('y',(y.toFixed(2))+'px');
					this.poi[id][i]._txt2.setAttribute('class',align);
					s = (this.poi[id][i].scale || 0.9);
					this.poi[id][i]._el.setAttribute('style','transform-origin:'+x.toFixed(2)+'px '+(y+2.5).toFixed(2)+'px;transform: translate('+dx.toFixed(2)+'px,'+dy.toFixed(2)+'px) scale('+s+',-'+s+');');
				}
			}

			this.el.scrollLeft = (w - this.el.offsetWidth)/2 + this.opt.x.padding;

			return this;
		}
		this.setSize = function(w,h){
			this.svg.setAttribute('width',w);
			this.svg.setAttribute('height',h);
			this.svg.setAttribute('viewBox','0 0 '+w+' '+h);
			this.svg.setAttribute('overflow','visible');
			this.svg.setAttribute('preserveAspectRatio','xMinYMin meet');
			this.viewBox = {'w':w,'h':h};
			return this;
		}
		
		this.init();

		return this;
	}

	// Define a logging function
	function Logger(inp){
		if(!inp) inp = {};
		this.logging = (inp.logging||false);
		this.logtime = (inp.logtime||false);
		this.id = (inp.id||"JS");
		this.metrics = {};
		return this;
	}
	Logger.prototype.error = function(){ this.log('ERROR',arguments); };
	Logger.prototype.warning = function(){ this.log('WARNING',arguments); };
	Logger.prototype.info = function(){ this.log('INFO',arguments); };
	Logger.prototype.message = function(){ this.log('MESSAGE',arguments); }
	Logger.prototype.log = function(){
		if(this.logging || arguments[0]=="ERROR" || arguments[0]=="WARNING" || arguments[0]=="INFO"){
			var args,bold;
			args = Array.prototype.slice.call(arguments[1], 0);
			bold = 'font-weight:bold;';
			if(console && typeof console.log==="function"){
				if(arguments[0] == "ERROR") console.error('%c'+this.id+'%c:',bold,'',...args);
				else if(arguments[0] == "WARNING") console.warn('%c'+this.id+'%c:',bold,'',...args);
				else if(arguments[0] == "INFO") console.info('%c'+this.id+'%c:',bold,'',...args);
				else console.log('%c'+this.id+'%c:',bold,'',...args);
			}
		}
		return this;
	}


	/**
	 * CSVToArray parses any String of Data including '\r' '\n' characters,
	 * and returns an array with the rows of data.
	 * @param {String} CSV_string - the CSV string you need to parse
	 * @param {String} delimiter - the delimeter used to separate fields of data
	 * @returns {Array} rows - rows of CSV where first row are column headers
	 */
	function CSVToArray (CSV_string, delimiter) {
		delimiter = (delimiter || ","); // user-supplied delimeter or default comma

		var pattern = new RegExp( // regular expression to parse the CSV values.
			( // Delimiters:
				"(\\" + delimiter + "|\\r?\\n|\\r|^)" +
				// Quoted fields.
				"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
				// Standard fields.
				"([^\"\\" + delimiter + "\\r\\n]*))"
			), "gi"
		);

		var rows = [[]];  // array to hold our data. First row is column headers.
		// array to hold our individual pattern matching groups:
		var matches = false; // false if we don't find any matches
		// Loop until we no longer find a regular expression match
		while (matches = pattern.exec( CSV_string )) {
			var matched_delimiter = matches[1]; // Get the matched delimiter
			// Check if the delimiter has a length (and is not the start of string)
			// and if it matches field delimiter. If not, it is a row delimiter.
			if (matched_delimiter.length && matched_delimiter !== delimiter) {
				// Since this is a new row of data, add an empty row to the array.
				rows.push( [] );
			}
			var matched_value;
			// Once we have eliminated the delimiter, check to see
			// what kind of value was captured (quoted or unquoted):
			if (matches[2]) { // found quoted value. unescape any double quotes.
				matched_value = matches[2].replace(
					new RegExp( "\"\"", "g" ), "\""
				);
			} else { // found a non-quoted value
				matched_value = matches[3];
			}
			// Now that we have our value string, let's add
			// it to the data array.
			rows[rows.length - 1].push(matched_value);
		}
		return rows; // Return the parsed data Array
	}


	/* ============== */
	/* Colours v0.3.1 */
	// Define colour routines
	function Colour(c,n){
		if(!c) return {};

		function d2h(d) { return ((d < 16) ? "0" : "")+d.toString(16);}
		function h2d(h) {return parseInt(h,16);}
		/**
		 * Converts an RGB color value to HSV. Conversion formula
		 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
		 * Assumes r, g, and b are contained in the set [0, 255] and
		 * returns h, s, and v in the set [0, 1].
		 *
		 * @param	Number  r		 The red color value
		 * @param	Number  g		 The green color value
		 * @param	Number  b		 The blue color value
		 * @return  Array			  The HSV representation
		 */
		function rgb2hsv(r, g, b){
			r = r/255;
			g = g/255;
			b = b/255;
			var max = Math.max(r, g, b), min = Math.min(r, g, b);
			var h, s, v = max;
			var d = max - min;
			s = max == 0 ? 0 : d / max;
			if(max == min) h = 0; // achromatic
			else{
				switch(max){
					case r: h = (g - b) / d + (g < b ? 6 : 0); break;
					case g: h = (b - r) / d + 2; break;
					case b: h = (r - g) / d + 4; break;
				}
				h /= 6;
			}
			return [h, s, v];
		}

		this.alpha = 1;

		// Let's deal with a variety of input
		if(c.indexOf('#')==0){
			this.hex = c;
			this.rgb = [h2d(c.substring(1,3)),h2d(c.substring(3,5)),h2d(c.substring(5,7))];
		}else if(c.indexOf('rgb')==0){
			var bits = c.match(/[0-9\.]+/g);
			if(bits.length == 4) this.alpha = parseFloat(bits[3]);
			this.rgb = [parseInt(bits[0]),parseInt(bits[1]),parseInt(bits[2])];
			this.hex = "#"+d2h(this.rgb[0])+d2h(this.rgb[1])+d2h(this.rgb[2]);
		}else return {};
		this.hsv = rgb2hsv(this.rgb[0],this.rgb[1],this.rgb[2]);
		this.name = (n || "Name");
		var r,sat;
		for(r = 0, sat = 0; r < this.rgb.length ; r++){
			if(this.rgb[r] > 200) sat++;
		}
		this.toString = function(){
			return 'rgb'+(this.alpha < 1 ? 'a':'')+'('+this.rgb[0]+','+this.rgb[1]+','+this.rgb[2]+(this.alpha < 1 ? ','+this.alpha:'')+')'
		}
		this.text = (this.rgb[0]*0.299 + this.rgb[1]*0.587 + this.rgb[2]*0.114 > 186 ? "black":"white");
		return this;
	}
	function Colours(){
		var scales = {
			'Viridis': 'rgb(68,1,84) 0%, rgb(72,35,116) 10%, rgb(64,67,135) 20%, rgb(52,94,141) 30%, rgb(41,120,142) 40%, rgb(32,143,140) 50%, rgb(34,167,132) 60%, rgb(66,190,113) 70%, rgb(121,209,81) 80%, rgb(186,222,39) 90%, rgb(253,231,36) 100%',
			'ODI': 'rgb(114,46,165) 0%, rgb(230,0,124) 50%, rgb(249,188,38) 100%',
			'Heat': 'rgb(0,0,0) 0%, rgb(128,0,0) 25%, rgb(255,128,0) 50%, rgb(255,255,128) 75%, rgb(255,255,255) 100%',
			'Planck': 'rgb(0,0,255) 0, rgb(0,112,255) 16.666%, rgb(0,221,255) 33.3333%, rgb(255,237,217) 50%, rgb(255,180,0) 66.666%, rgb(255,75,0) 100%',
			'EPC': '#ef1c3a 1%, #ef1c3a 20.5%, #f78221 20.5%, #f78221 38.5%, #f9ac64 38.5%, #f9ac64 54.5%, #ffcc00 54.5%, #ffcc00 68.5%, #8cc63f 68.5%, #8cc63f 80.5%, #1bb35b 80.5%, #1bb35b 91.5%, #00855a 91.5%, #00855a 120%',
			'Plasma': 'rgb(12,7,134) 0%, rgb(64,3,156) 10%, rgb(106,0,167) 20%, rgb(143,13,163) 30%, rgb(176,42,143) 40%, rgb(202,70,120) 50%, rgb(224,100,97) 60%, rgb(241,130,76) 70%, rgb(252,166,53) 80%, rgb(252,204,37) 90%, rgb(239,248,33) 100%',
			'Referendum': '#4BACC6 0, #B6DDE8 50%, #FFF380 50%, #FFFF00 100%',
			'Leodis': '#2254F4 0%, #F9BC26 50%, #ffffff 100%',
			'Longside': '#801638 0%, #addde6 100%'
		};
		function col(a){
			if(typeof a==="string") return new Colour(a);
			else return a;
		}
		this.getColourPercent = function(pc,a,b){
			pc /= 100;
			a = col(a);
			b = col(b);
			return 'rgb'+(a.alpha<1 || b.alpha<1 ? 'a':'')+'('+parseInt(a.rgb[0] + (b.rgb[0]-a.rgb[0])*pc)+','+parseInt(a.rgb[1] + (b.rgb[1]-a.rgb[1])*pc)+','+parseInt(a.rgb[2] + (b.rgb[2]-a.rgb[2])*pc)+(a.alpha<1 || b.alpha<1 ? ','+((b.alpha-a.alpha)*pc):'')+')';
		};
		this.makeGradient = function(a,b){
			a = col(a);
			b = col(b);
			return 'background: '+a.hex+'; background: -moz-linear-gradient(left, '+a.toString()+' 0%, '+b.toString()+' 100%);background: -webkit-linear-gradient(left, '+a.hex+' 0%,'+b.hex+' 100%);background: linear-gradient(to right, '+a.hex+' 0%,'+b.hex+' 100%);';
		};
		this.addScale = function(id,str){
			scales[id] = str;
			processScale(id,str);
		}
		function processScale(id,str){
			if(scales[id] && scales[id].str){
				console.warn('Colour scale '+id+' already exists. Bailing out.');
				return this;
			}
			scales[id] = {'str':str};
			scales[id].stops = extractColours(str);
			return this;
		}
		function extractColours(str){
			var stops,cs,i,c;
			stops = str.replace(/^\s+/g,"").replace(/\s+$/g,"").replace(/\s\s/g," ").split(', ');
			cs = [];
			for(i = 0; i < stops.length; i++){
				var bits = stops[i].split(/ /);
				if(bits.length==2) cs.push({'v':bits[1],'c':new Colour(bits[0])});
				else if(bits.length==1) cs.push({'c':new Colour(bits[0])});
			}
			
			for(c=0; c < cs.length;c++){
				if(cs[c].v){
					// If a colour-stop has a percentage value provided, 
					if(cs[c].v.indexOf('%')>=0) cs[c].aspercent = true;
					cs[c].v = parseFloat(cs[c].v);
				}
			}
			return cs;
		}

		// Process existing scales
		for(var id in scales){
			if(scales[id]) processScale(id,scales[id]);
		}
		
		// Return a Colour object for a string
		this.getColour = function(str){
			return new Colour(str);
		};
		// Return the colour scale string
		this.getColourScale = function(id){
			return scales[id].str;
		};
		// Return the colour string for this scale, value and min/max
		this.getColourFromScale = function(s,v,min,max){
			var cs,v2,pc,c;
			var colour = "";
			if(!scales[s]){
				console.warn('No colour scale '+s+' exists');
				return '';
			}
			if(typeof min!=="number") min = 0;
			if(typeof max!=="number") max = 1;
			cs = scales[s].stops;
			v2 = 100*(v-min)/(max-min);
			var match = -1;
			if(v==max){
				colour = 'rgba('+cs[cs.length-1].c.rgb[0]+', '+cs[cs.length-1].c.rgb[1]+', '+cs[cs.length-1].c.rgb[2]+', ' + cs[cs.length-1].c.alpha + ")";
			}else{
				if(cs.length == 1) colour = 'rgba('+cs[0].c.rgb[0]+', '+cs[0].c.rgb[1]+', '+cs[0].c.rgb[2]+', ' + (v2/100).toFixed(3) + ")";
				else{
					for(c = 0; c < cs.length-1; c++){
						if(v2 >= cs[c].v && v2 <= cs[c+1].v){
							// On this colour stop
							pc = 100*(v2 - cs[c].v)/(cs[c+1].v-cs[c].v);
							if(pc > 100) pc = 100;	// Don't go above colour range
							colour = this.getColourPercent(pc,cs[c].c,cs[c+1].c);
							continue;
						}
					}
				}
			}
	
			return colour;	
		};
		
		return this;
	}

	root.ODI.Colour = new Colours();

})(window || this);