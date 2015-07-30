# loc
Library of Congress - Chronicling America Project


What I've Done
=============

All the basic functionality of the project is there. We are able to search for terms, set a range of dates which we would like to search and be able to go through time, seeing newspapers as they appear. When you click on a marker, its information will appear in its pop up and it's text will appear on the bottom screen, with the search term highlighted. 

What I Was Working On Last
==========================

The last thing I was working on was adding the ability to be able to play either by days, weeks, months or years. There is a search bar and drop down menu already implemented next to the rangeDate object. You can input a number and choose days, weeks, months or years. When hitting play, the slider will then jump that much. To do this you would need to put in some logic and change line 168. The number 8640000 will have to change to match the choices made by the user. I would say use two variables, one is just what the user entered, and the second is the number of miliseconds in a day, week, month, year, then multiply the two togeather.

Known Issues
============

- Slider slows down when there is a lot of markers to add or remove. I think this is due to the fact that the function is getting called a lot of time. 
- The UI doesn't line up as it should. Everything should be centered and the date bar which goes with the range slider should be right underneath it. Along with some other UI improvements. 
- Highlighting sometimes highlights more then is needed due to the text being marked as HTML, the poor quality of our documents sometimes mimics actual HTML and sends things to hell. 
- The solr server does fuzzy searching and so sometimes you will get hits when you shouldn't. For instance type your name and notice there are newspapers with the search term not there. 
- We can only get 1000 results per search. Anymore takes too long of a time. This means we might be missing important documents. I don't thinkg doing a query whenever we change the data in the UI is a good idea, be too slow. 

Possible Improvements
=====================
- Improve UI
- Have the solr do exact and fuzzy searches to avoid searching for "Ediger" and getting results that have nothing to do with him. 
- Have solr return results in sorted order by dates, going from oldest to newest so we don't have to sort in the javascript.
- Optimize solr searches so we can get more hits faster.
- Have the text show only the highlighted terms and say 1000 words before and after the term. Everything else is scrunched togeather which can be expanded by the user. 
- Better way to highlight search terms in text.
- Have the icons change color from blue to grey when the selected date is past the marker date, so it is easier show newer hits against older hits. You could probably just get two custom icons(Chuda is pretty good at those) and when you are going through markers in filter() add some logic to see which icon they should use. 

Resources
=========

I've been using the following sites for refrence:
* [Angular Leaflet Directive Examples](http://tombatossals.github.io/angular-leaflet-directive/examples/0000-viewer.html#/markers/events-add-example)
* [Mapbox Refrence](https://www.mapbox.com/mapbox.js/example/v1.0.0/change-marker-color-click/)

Bugs To Watch Out For
=====================

If getting an error saying:
```sh
cannot find a tile.png object 
```
On line 1875 of Angular-Leaflet-Directive.js the line needs to look something like this:
```sh
tileLayer: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
```
if it is missing the http: then the app will break. Min does not have this so make sure to use the regular .js file.