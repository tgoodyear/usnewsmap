# loc
Library of Congress - Chronicling America Project




If getting an error saying you cannot find a tile.png object:
	On line 1875 of Angular-Leaflet-Directive.js, needs to look something like this:
            tileLayer: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',       
	if it is missing the http: then the app will break. Min does not have this so make sure to use the regular .js file. 