(function(root){

	var debug = false;

	function OSMMap(id,options){

		if(!options) options = {};
		this.log = new Logger({'id':'OSMMap','logging':options.logging});
		if(!document.getElementById(id)){
			this.log.error('No DOM element exists '+id);
			return this;
		}

		baseMaps = {};
		if(options.baseMaps) baseMaps = options.baseMaps;
		else{
			// Default maps
			baseMaps['greyscale'] = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
				attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
				subdomains: 'abcd',
				maxZoom: 19
			});
			baseMaps['osm'] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
			});
			baseMaps['cartodb'] = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
				attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
				subdomains: 'abcd',
				maxZoom: 19
			});
			baseMaps['cartodb-nolabel'] = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
				attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
				subdomains: 'abcd',
				maxZoom: 19
			});
			baseMaps['cartodb-dark'] = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
				attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
				subdomains: 'abcd',
				maxZoom: 19
			});
			baseMaps['esri'] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
				attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
			});
		}
		this.selectedBaseMap = "greyscale";

		this.show = options.show||{};
		

		this.setBaseMap = function(id){
			this.log.message('setBaseMap',id,baseMaps);
			if(baseMaps[id] && id!=this.selectedBaseMap){
				this.map.removeLayer(baseMaps[this.selectedBaseMap]);
				this.map.addLayer(baseMaps[id]);
				this.selectedBaseMap = id;
			}
		};
		this.getBaseMaps = function(){
			var l = [];
			for(var id in baseMaps){
				l.push(this.getBaseMap(id));
			}
			return l;
		}
		this.getBaseMap = function(id){
			if(!id) id = this.selectedBaseMap;
			return {'id':id,'url':baseMaps[this.selectedBaseMap]._url};
		}


		var icon = L.Icon.extend({
			options: {
				shadowUrl: '/resources/images/marker-shadow.png',
				iconSize:     [3, 41], // size of the icon
				shadowSize:   [41, 41], // size of the shadow
				iconAnchor:   [12.5, 41], // point of the icon which will correspond to marker's location
				shadowAnchor: [12.5, 41],  // the same for the shadow
				popupAnchor:  [0, -41] // point from which the popup should open relative to the iconAnchor
			}
		});

		function makeMarker(icon,colour){
			return L.divIcon({
				'className': '',
				'html':	getIcon(icon,colour),
				'iconSize':	 [32, 42],
				'popupAnchor': [0, -41]
			});
		}

		var tiler = new Tiler();
		var _obj = this;

		function getGeoJSONTile(url,a,tileid){
			_obj.log.message('Getting data for ('+a+') '+tileid+' from '+url);
			var headers;
			return fetch(url,{'method':'GET'})
			.then(response => {
				headers = response.headers;
				if(!response.ok) throw new Error('Request Failed'); 
				return response.json();
			})
			.then(json => {
				var i,el,lat,lon,id,tags,tag,t,name,update;
				update = (new Date(headers.get('Last-Modified'))).toISOString();

				// Store a copy of the response
				_obj.layers[a].nodegetter.tiles[tileid].data = json;
				_obj.layers[a].nodegetter.tiles[tileid].id = [];

				// Update the time stamp
				_obj.layers[a].nodegetter.tiles[tileid].lastupdate = update;

				_obj.log.message('Got results from geojson',json.features.length);
/*
				for(i = 0; i < json.features.length; i++){
					el = json.features[i];
					id = "";
					if(typeof el.properties.osm_id==="string"){
						id = 'OSM-'+el.properties.osm_id;
						el.properties.OSMID = el.properties.osm_id;
					}
					if(typeof el.properties.id==="string") id = el.properties.id;
					if(typeof _obj.layers[a].options.id==="string") id = el.properties[_obj.layers[a].options.id];

					_obj.layers[a].nodegetter.tiles[tileid].id.push(id);

					// If we don't have this node we build a basic structure for it
					if(!_obj.layers[a].nodes[id]){
						_obj.layers[a].nodes[id] = {'id':id,'props':{},'popup':'','changedtags':[],'lastupdate':update};
					}

					// Add the properties
					for(p in el.properties){
						if(p == "tag"){
							for(t in el.properties.tag){
								_obj.layers[a].nodes[id].props[t] = el.properties.tag[t]||"";
							}
						}else{
							if(p != "osm_id"){
								_obj.layers[a].nodes[id].props[p] = el.properties[p];
							}
						}
					}
				}
				*/
			}).catch(error => {
				_obj.log.error('Failed to load '+url);
				_obj.layers[a].nodegetter.tiles[tileid].data = {};
				_obj.layers[a].nodegetter.tiles[tileid].id = [];

				// Update the time stamp
				_obj.layers[a].nodegetter.tiles[tileid].lastupdate = (new Date()).toISOString();
			});
		}

		this.getNodesFromGeoJSON = function(a,options,callback){
			
			this.log.message('getNodesFromGeoJSON',a,this.layers[a]);
			var b,tiles,qs,i,t,id,promises,z;
			if(!a || !this.layers[a]){
				this.log.error('Layer '+a+' isn\'t registered');
				return this;
			}
			if(!this.layers[a].nodegetter) this.layers[a].nodegetter = {'tiles':{}};
			if(!this.layers[a].nodes) this.layers[a].nodes = {};
			if(!this.layers[a].nodegroup) this.layers[a].nodegroup = {};

			z = (this.layers[a].options.zoom||12);

			options = {};
			if(!options.title) options.title = "Node";
			if(!this.map){
				console.error('No map object exists');
				return this;
			}

			// Get the map bounds (with padding)
			b = this.map.getBounds();//.pad(2 * Math.sqrt(2) / 2);

			// Get the tile definitions
			tiles = tiler.xyz(b,z);
			if(!this.tiles) this.tiles = {};
			this.tiles.active = tiles;
			
			promises = [];
			
			for(t = 0; t < tiles.length; t++){
				id = tiles[t].z+'/'+tiles[t].x+'/'+tiles[t].y;
				if(!this.layers[a].nodegetter.tiles[id]){
					this.layers[a].nodegetter.tiles[id] = {'url':(this.layers[a].options.src.replace(/\{z\}/g,tiles[t].z).replace(/\{x\}/g,tiles[t].x).replace(/\{y\}/g,tiles[t].y))};
					
					// If we haven't already downloaded the data
					if(!this.layers[a].nodegetter.tiles[id].data) promises.push(getGeoJSONTile(this.layers[a].nodegetter.tiles[id].url,a,id));
				}
			}

			if(promises.length > 0){
				promises.map(p => p.catch(e => e));
				Promise.all(promises).then(responses => {
					var newstr,newest,id,d;
					newest = new Date('2000-01-01T00:00Z');
					newstr = '';
					for(id in this.layers[a].nodegetter.tiles){
						if(this.layers[a].nodegetter.tiles[id].lastupdate){
							d = new Date(this.layers[a].nodegetter.tiles[id].lastupdate);
							if(d > newest){ newest = d; newstr = this.layers[a].nodegetter.tiles[id].lastupdate; }
						}
					}
					this.map.attributionControl.setPrefix("Data updated: "+newstr);

					this.buildGeoJSON(options);

					// Trigger any callback
					if(typeof callback==="function") callback.call(options['this']||this,{'a':a,'b':b});
				});
			}else{
				// Trigger any callback
				if(typeof callback==="function") callback.call(options['this']||this,{'a':a,'b':b});
			}
			return this;
		}
		
		this.buildGeoJSON = function(options){
			var lid,tiles,json,t,f;
			lid = this.selectedLayer;
			this.log.message('buildGeoJSON',this.layers[lid]);
			tiles = this.tiles.active;

			if(!this.tiles.geojson){
				this.tiles.geojson = new L.LayerGroup();
				this.tiles.geojson.addTo(this.map);
			}
			for(t = 0; t < tiles.length; t++){
				id = tiles[t].z+'/'+tiles[t].x+'/'+tiles[t].y;
				tiles[t].id = id;
				if(!this.layers[lid].nodegetter.tiles[id].geo){
					if(this.layers[lid].nodegetter.tiles[id].data.features){
						this.layers[lid].nodegetter.tiles[id].geo = L.geoJSON(this.layers[lid].nodegetter.tiles[id].data,{
							'style': {
								'color':'rgba(0,0,0,0.2)',
								'weight': 1
							}
						});

					}
				}

				if(this.layers[lid].nodegetter.tiles[id].geo){
					if(!this.tiles.geojson.hasLayer(this.layers[lid].nodegetter.tiles[id].geo)){
						// It isn't included at the moment so add it
						this.tiles.geojson.addLayer(this.layers[lid].nodegetter.tiles[id].geo);
					}
				}
			}

			// Loop over layers to check if it needs to be shown
			// TO DO

			// Set colours
			if(typeof this.layers[lid].options.colorFeatures==="function"){
				this.layers[lid].options.colorFeatures.call(this.tiles.geojson);
			}
			return this;
		}

		this.getNodes = function(a,options){
			this.log.message('getNodes',a,options);
			if(!a || !this.layers[a]){
				this.log.error('No layer '+a);
				return this;
			}
			if(!options) options = {};
			options['this'] = this;
			this.getNodesFromGeoJSON(a,options,function(e){
				this.log.message('got geojson',this,e);
				// Do things here to build marker cluster layer
				this.trigger('updatenodes',e);
			});
			return this;
		}

		this.addGeoJSONLayer = function(id,opts){
			if(!this.layers) this.layers = {};
			if(!this.layers[id]) this.layers[id] = {};
			this.layers[id].options = extendObject(this.layers[id].options||{},opts);
			
			return this;
		}
		this.setGeoJSONLayer = function(id){
			if(id && this.layers[id]){
				this.selectedLayer = id;
				// Update tiles
				//this.getNodes(this.selectedLayer,this.layers[id].opts);
			}else{
				this.log.warning('No layer specified');
			}
			return this;
		}

		// Add geolocation control and interaction
		var geolocation = null;//new GeoLocation({mapper:this});

		// Convert metres to pixels (used by GeoLocation)
		this.m2px = function(m,lat,zoom){
			if(!lat) lat = this.map.getCenter().lat;
			if(!zoom) zoom = this.map.getZoom();
			var mperpx = 40075016.686 * Math.abs(Math.cos(lat * 180/Math.PI)) / Math.pow(2, zoom+8);
			return m/mperpx;
		}

		this.init = function(fn){

			this.map = L.map(id,{'layers':[baseMaps[this.selectedBaseMap]],'scrollWheelZoom':true,'editable': true,'zoomControl': false});
			this.collection = {};
			this.tooltip = L.DomUtil.get('tooltip');
			this.events = {};
			this.layers = {};

			this.map.attributionControl.setPrefix('Map').setPosition('bottomleft');

			if(this.show.zoom){
				// Add zoom control with options
				L.control.zoom({
					 position:'topleft',
					 'zoomInText': getIcon('zoomin','black'),
					 'zoomOutText': getIcon('zoomout','black')
				}).addTo(this.map);
			}
			
			this.map.on("movestart", function(){ _obj.trigger('movestart'); });
			this.map.on("move", function(){ _obj.trigger('move'); });
			this.map.on("moveend", function(){ _obj.trigger('moveend'); });
			this.map.on("zoomend", function(){ _obj.trigger('moveend'); });


			if(typeof fn==="function") fn.call(this);
			return this;
		}


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
		}

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
		}

		return this;
	}

	function Tiler(){
		var R = 6378137, sphericalScale = 0.5 / (Math.PI * R);

		function tile2lon(x,z){ return (x/Math.pow(2,z)*360-180); }
		function tile2lat(y,z){ var n=Math.PI-2*Math.PI*y/Math.pow(2,z); return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)))); }

		/* Adapted from: https://gist.github.com/mourner/8825883 */
		this.xyz = function(bounds, z) {

			var min = project(bounds._northEast.lat,bounds._southWest.lng, z);//north,west
			var max = project(bounds._southWest.lat,bounds._northEast.lng, z);//south,east
			var tiles = [];
			var x,y;
			for(x = min.x; x <= max.x; x++) {
				for(y = min.y; y <= max.y; y++) {
					tiles.push({
						x: x,
						y: y,
						z: z,
						b: {'_northEast':{'lat':tile2lat(y,z),'lng':tile2lon(x+1,z)},'_southWest':{'lat':tile2lat(y+1,z),'lng':tile2lon(x,z)}}
					});
				}
			}
			return tiles;
		}

		/* 
		Adapts a group of functions from Leaflet.js to work headlessly
		https://github.com/Leaflet/Leaflet
		*/
		function project(lat,lng,zoom) {
			var d = Math.PI / 180,
			max = 1 - 1E-15,
			sin = Math.max(Math.min(Math.sin(lat * d), max), -max),
			scale = 256 * Math.pow(2, zoom);

			var point = {
				x: R * lng * d,
				y: R * Math.log((1 + sin) / (1 - sin)) / 2
			};

			point.x = tiled(scale * (sphericalScale * point.x + 0.5));
			point.y = tiled(scale * (-sphericalScale * point.y + 0.5));

			return point;
		}

		function tiled(num) {
			return Math.floor(num/256);
		}
		return this;
	}

	// Extend objects
	extendObject = (typeof Object.extend === 'undefined') ?
		function(destination, source) {
			for (var property in source) {
				if (source.hasOwnProperty(property)) destination[property] = source[property];
			}
			return destination;
		} : Object.extend;

	var icons = {
		'zoomin':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOR%" d="M 11 11 l 0,-5 2,0 0,5 5,0 0,2 -5,0 0,5 -2,0 0,-5 -5,0 0,-2 5,0 M 12,12 m -0.5,-12 a 12, 12, 0, 1, 0, 1, 0 Z m 1 2 a 10, 10, 0, 1, 1, -1, 0 Z M 20.5 20.5 l 1.5,-1.5 8,8 -3,3 -8,-8Z" /></svg>',
		'zoomout':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOR%" d="M 12 12 m 0,-1 l 6,0 0,2 -12,0 0,-2Z M 12,12 m -0.5,-12 a 12, 12, 0, 1, 0, 1, 0 Z m 1 2 a 10, 10, 0, 1, 1, -1, 0 Z M 20.5 20.5 l 1.5,-1.5 8,8 -3,3 -8,-8Z" /></svg>',
		'geo':'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path style="fill:%COLOR%" d="M 16,0 L30,30 0,16 12,12 Z" /></svg>',
		'marker':'<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="7.0556mm" height="11.571mm" viewBox="0 0 25 41.001" id="svg2" version="1.1"><g id="layer1" transform="translate(1195.4,216.71)"><path style="fill:%COLOR%;fill-opacity:1;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.1;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" d="M 12.5 0.5 A 12 12 0 0 0 0.5 12.5 A 12 12 0 0 0 1.8047 17.939 L 1.8008 17.939 L 12.5 40.998 L 23.199 17.939 L 23.182 17.939 A 12 12 0 0 0 24.5 12.5 A 12 12 0 0 0 12.5 0.5 z " transform="matrix(1,0,0,1,-1195.4,-216.71)" id="path4147" /><ellipse style="opacity:1;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:1.428;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" id="path4173" cx="-1182.9" cy="-204.47" rx="5.3848" ry="5.0002" /></g></svg>'
	}
	
	function getIcon(icon,colour){
		if(icons[icon]) return icons[icon].replace(/%COLOR%/g,(colour||"black"));
		else return icon.replace(/%COLOR%/g,(colour||"black"));
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
	Logger.prototype.time = function(key){
		if(!this.metrics[key]) this.metrics[key] = {'times':[],'start':''};
		if(!this.metrics[key].start) this.metrics[key].start = new Date();
		else{
			var t,w,v,tot,l,i,ts;
			t = ((new Date())-this.metrics[key].start);
			ts = this.metrics[key].times;
			// Define the weights for each time in the array
			w = [1,0.75,0.55,0.4,0.28,0.18,0.1,0.05,0.002];
			// Add this time to the start of the array
			ts.unshift(t);
			// Remove old times from the end
			if(ts.length > w.length-1) ts = ts.slice(0,w.length);
			// Work out the weighted average
			l = ts.length;
			this.metrics[key].av = 0;
			if(l > 0){
				for(i = 0, v = 0, tot = 0 ; i < l ; i++){
					v += ts[i]*w[i];
					tot += w[i];
				}
				this.metrics[key].av = v/tot;
			}
			this.metrics[key].times = ts.splice(0);
			if(this.logtime) this.info(key+' '+t+'ms ('+this.metrics[key].av.toFixed(1)+'ms av)');
			delete this.metrics[key].start;
		}
		return this;
	};

	root.OSMMap = OSMMap;




	/* ============ */
	/* Colours v0.3 */
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
//		this.text = (this.rgb[0] + this.rgb[1] + this.rgb[2] > 500 || sat > 1) ? "black" : "white";
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
							if(v2 >= max) pc = 100;	// Don't go above colour range
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

	root.Colour = new Colours();

})(window || this);


function ready(f){
	if(/in/.test(document.readyState)) setTimeout('ready('+f+')',9);
	else f();
};

var app;

ready(function(){
	
	app = new OSMMap('map',{'show':{'zoom':true}});

	var data = [];
	var coast;
	var ranges = {};
	app.title = document.title;

	app.init(function(){
		var pushstate = !!(window.history && history.pushState);
		var _obj = this;
		var _interactive = false;
		this.inputs = { 'key': document.getElementById('layers'), 'scale': document.getElementById('scales'),'basemap': document.getElementById('basemap') };
		this.defaults = {'lat':52,'lon':-1,'zoom':4,'key':this.inputs.key.value,'scale':this.inputs.scale.value,'basemap':this.inputs.basemap.value};


		this.addGeoJSONLayer('areas',{
			'src': 'data/tiles/{z}/{x}/{y}.geojson',
			'propertylookup':{
				'OSMID':{'hide':true}
			},
			'colorFeatures': function(){
				this.eachLayer(function(featureLayer) {
					featureLayer.eachLayer(function(feature){
						sty = {'fillColor':featureColours[feature.feature.properties.id]};
						if(app.view.zoom <= 8){ sty.opacity = 0; sty.fillOpacity = 0; }
						if(app.view.zoom == 9){ sty.opacity = 0.3; sty.fillOpacity = 0.3; }
						if(app.view.zoom >= 10){ sty.opacity = 0.5; sty.fillOpacity = 0.5; }
						feature.setStyle(sty);
					});
				});
			},
			'zoom': 10,
			'popup': function(mark){
				var str,cls,title,types,p,i,ts,ul,label;
				ul = '';
				str = '';
				cls = '';
				ico = '';
				title = 'Bin';
				types = {};
				ts = 0;
				if(mark.props.amenity){
					if(mark.props.amenity=="waste_basket"){
						title = "Waste";
						cls = "waste";
						ico = "waste";
					}else{
						for(t in mark.props){
							if(t.indexOf("recycling:")==0){
								types[t] = mark.props[t];
							}
						}
						ts = Object.keys(types).length;
						title = "Recycling";
						cls = "recycling";
						ico = "recycling";
						// If only one type of recycling pick that bin
						if(ts==1){
							if(types['recycling:beverage_cartons']){ ico = "beverage"; cls += ' beverage'; }
							if(types['recycling:paper']){ ico = "paper"; cls += " paper"; }
							if(types['recycling:glass_bottles']){ ico = "glass"; cls += ' glass'; }
						}
					}
				}
				i = 0;
				propertylookup = (this.layers[this.selectedLayer].options.propertylookup||{}); 
				for(p in mark.props){
					if(!propertylookup[p] || (propertylookup[p] && !propertylookup[p].hide)){
						ul += '<tr><td><strong>'+(propertylookup[p] ? propertylookup[p].label : p)+'</strong>:</td><td>'+(p == "website" ? '<a href="'+mark.props[p]+'" target="_external">'+mark.props[p]+'</a>' : mark.props[p])+'</td></tr>';
					}
				}
				ul += '<tr><td><strong>OSMID:</strong></td><td>'+mark.id+'</td></tr>'
				ul = '<table class="small">'+ul+'</table>';
				label = '<h3>'+title+'</h3>'+(str ? '<p>'+str+'</p>':'')+ul+'<p class="edit">Something not quite right? Help <a href="http://www.openstreetmap.org/edit?pk_campaign=odileeds-edit&node='+mark.id+'#map=17/'+mark.lat+'/'+mark.lon+'" target="_osm">improve the data on OpenStreetMap</a>.</p>';
				return {'label':label, 'options':{'className':cls,'icon':ico}};
			}
		}).setGeoJSONLayer('areas');
		
		this.updateView = function(state,updateData){
			var lat,lon,z,k,s,q;

			if(!state) state = getQueryString();

			for(k in this.view){
				if(!state[k]) state[k] = this.view[k];
			}
			
			//this.setGeoJSONLayer('areas');
			
			// Set map view if it isn't in the query string
			if(isNaN(state.lat) || typeof state.lat!=="number") state.lat = this.view.lat;
			if(isNaN(state.lon) || typeof state.lon!=="number") state.lon = this.view.lon;
			if(isNaN(state.zoom) || typeof state.zoom!=="number") state.zoom = this.view.zoom;
			if(!state.key) state.key = this.view.key;
			if(!state.scale) state.scale = this.view.scale;
			if(!state.basemap) state.basemap = this.view.basemap;
			
			
			//console.log('updateView',state,[this.view.lat,this.view.lon]);
			if(updateData) makeCoast();

			if(state.lat!=this.view.lat || state.lon!=this.view.lon || state.zoom!=this.view.zoom){
				// Set the map position and zoom level
				this.map.setView({'lat':state.lat,'lng':state.lon},state.zoom);
			}else{
				this.trigger('moveend');
			}
			
			return this;
		}

		// Get the query string to define the initial view
		this.view = getQueryString();
		if(!this.view) this.view = {};
		// Fill in any missing values with defaults
		for(var k in this.defaults){
			if(typeof this.view[k]==="undefined") this.view[k] = this.defaults[k];
		}

		// Set select boxes to values and then attach listeners to deal with changes
		for(var inp in this.inputs){
			// Update the select box if necessary
			if(this.view[inp] && this.inputs[inp].value!=this.view[inp]){
				this.inputs[inp].value = this.view[inp];
			}
			this.inputs[inp].setAttribute('data',inp);
			// Add change event to element
			this.inputs[inp].addEventListener('change', function(e){
				var state = {};
				var inp = e.currentTarget.getAttribute('data');
				if(_interactive){
					if(inp){
						state[inp] = _obj.inputs[inp].value;
						console.info('change',inp,state);
						// Either update basemap or the view
						_obj.updateView(state,true);
					}else{
						console.warn('Target doesn\'t match '+inp);
					}
				}else{
					console.warn('No interactive so not triggering change event for '+inp);
				}
			});
		}

		this.map.setView({'lat':this.view.lat,'lng':this.view.lon},this.view.zoom);
		setTitle();

		function setTitle(){
			document.title = _obj.title+" | "+_obj.inputs.key.options[_obj.inputs.key.selectedIndex].innerHTML;
		}

		function getQueryString(qs){
			var qs,q,z,lat,lon,l;
			if(!qs) qs = location.search.substr(1);
			if(qs){
				q = qs.split(/\//);
				z = parseInt(q[0]);
				lat = parseFloat(q[1]);
				lon = parseFloat(q[2]);
				return {'lat':lat,'lon':lon,'zoom':z,'key':q[3],'scale':q[4],'basemap':q[5]};
			}else{
				return {};
			}
		}
		// Attach events to move end
		this.on('moveend',function(){
			var c = this.map.getCenter();
			var z = this.map.getZoom();
			var state = {'lon': c.lng, 'lat': c.lat,'zoom':z,'l':this.selectedLayer};
			for(var i in this.inputs) state[i] = this.inputs[i].value;

			// Define the basemap
			this.setBaseMap(state.basemap);

			// Update GeoJSON tiles
			if(z >= 10){
				id = (this.selectedLayer && this.layers[this.selectedLayer] ? this.selectedLayer : "");
				if(id) this.getNodes(id,this.layers[id].options);
			}
			if(this.selectedLayer && this.tiles && this.tiles.geojson){
				// Set colours
				if(typeof this.layers[this.selectedLayer].options.colorFeatures==="function"){
					this.layers[this.selectedLayer].options.colorFeatures.call(this.tiles.geojson);
				}
			}



			if(_interactive){
				var update = false;
				if(c.lat!=this.view.lat || c.lng!=this.view.lon || z!=this.view.zoom) update = true;
				for(var i in this.inputs){
					if(this.inputs[i].value != this.view[i]) update = true;
				}
				if(update){
					history.pushState(state, 'Test', '?'+state.zoom+'/'+state.lat.toFixed(5)+'/'+state.lon.toFixed(5)+'/'+(state.key||"")+'/'+(state.scale||"")+'/'+(state.basemap||""));
					this.view = JSON.parse(JSON.stringify(state));
					setTitle();
				}
			}
			this.view = JSON.parse(JSON.stringify(state));
			if(!_interactive) _interactive = true;
		});

		// Add event to change of push state
		window[(pushstate) ? 'onpopstate' : 'onhashchange'] = function(e){
			var state = e.state;
			if(!state) state = getQueryString();
			for(var inp in _obj.inputs){
				if(state[inp]) _obj.inputs[inp].value = state[inp];
			}
			_interactive = false;
			_obj.updateView(state,true);
		};

		// Update opacity on map zoom
		app.map.on('zoomend', function(){
			var op = opacityAtZoom(app.map.getZoom());
			for(var i in coast._layers) coast._layers[i]._path.setAttribute('fill-opacity',op);
		});
	});
	
	function opacityAtZoom(z){
		if(z <= 8) return 0.5;
		else if(z < 10) return 0.3;
		else return 0;
	}

	// Get data
	fetch('data/coastalgeographies-centroids.csv',{'method':'GET'})
	.then(response => {
		if(!response.ok) throw new Error('Request Failed'); 
		return response.text();
	})
	.then(txt => {
		var r,c;
		data = CSVToArray(txt);
		
		for(r = 1; r < data.length; r++){
			data[r][0] = parseFloat(data[r][0]);
			data[r][1] = parseFloat(data[r][1]);
			data[r][4] = parseFloat(data[r][4]);
			data[r][5] = parseFloat(data[r][5]);
			data[r][6] = parseFloat(data[r][6]);
			data[r][7] = parseInt(data[r][7]);
			if(isNaN(data[r][4])) data[r][4] = 0;
			if(isNaN(data[r][5])) data[r][5] = 0;
			if(isNaN(data[r][6])) data[r][6] = 0;
			
			if(!isNaN(data[r][0]) && !isNaN(data[r][1])){
				for(c = 4; c < data[r].length; c++){
					if(!ranges[data[0][c]]) ranges[data[0][c]] = {'min':1e100,'max':-1e100};
					if(data[r][c] > ranges[data[0][c]].max) ranges[data[0][c]].max = data[r][c];
					if(data[r][c] < ranges[data[0][c]].min) ranges[data[0][c]].min = data[r][c];
				}
			}
		}
		app.updateView("",true);

	}).catch(error => {
		console.error('Failed to load data');
	});
	var featureColours = {};
	function makeCoast(){
		var r,c;
		var geo = {"type": "FeatureCollection","features":[]};
		for(r = 1; r < data.length; r++){
			if(!isNaN(data[r][0]) && !isNaN(data[r][1])){
				geo.features.push({ "type": "Feature", "properties": { "id": data[r][3], "country": data[r][2],"income_mean":data[r][4],"income_mdn":data[r][5],"income_rtn":data[r][6],"incquintile":data[r][7] }, "geometry": { "type": "Point", "coordinates": [ data[r][0],data[r][1] ] }});
			}
		}

		if(coast) coast.remove();
		
		var opacity = opacityAtZoom(app.view.zoom);
		// Add coast GeoJSON to map
		coast = L.geoJSON(geo, {
			pointToLayer: function(feature, latlng) {
				var key = app.inputs.key.value;
				var scale = app.inputs.scale.value;
				featureColours[feature.properties.id] = Colour.getColourFromScale(scale,feature.properties[key],ranges[key].min,ranges[key].max);
				return new L.CircleMarker(latlng, {radius: 5, fillOpacity: opacity, stroke: 0, color: featureColours[feature.properties.id]});
			},
		}).bindPopup(function (layer) {
			var key = app.inputs.key.value;
			return '<strong>'+layer.feature.properties.id+'</strong>: '+layer.feature.properties[key]+'';
		});

		coast.addTo(app.map);
				
	}

	// Get country boundaries
	fetch('data/UKMPG-WB-boundaries.geojson',{'method':'GET'})
	.then(response => {
		if(!response.ok) throw new Error('Request Failed'); 
		return response.json();
	})
	.then(json => {
		// Add coast GeoJSON to map
		L.geoJSON(json, {
			style: function (feature) {
				return {'color': '#000000','fillOpacity':0,'weight':1,'className':'msoa'};
			}
		}).bindPopup(function (layer) {
			return layer.feature.properties.id;
		}).addTo(app.map);
		
		

	}).catch(error => {
		console.error('Failed to load data');
	});


	
	
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


});