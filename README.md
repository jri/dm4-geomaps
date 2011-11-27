
DM4 Geomaps
===========

A DeepaMehta 4 module for displaying topics on geographical maps.


Requirements
------------

* A DeepaMehta 4.0.6 installation  
  <https://github.com/jri/deepamehta>

* Plugin DM4 Facets 0.1  
  <https://github.com/jri/dm4-facets>


Installation
------------

1. Install the DM4 Facets plugin. See link above.

2. Download the DM4 Geomaps plugin:  
   <http://www.deepamehta.de/maven2/de/deepamehta/deepamehta-geomaps/0.1/deepamehta-geomaps-0.1.jar>

3. Move the DM4 Geomaps plugin to the `deepamehta-4.0.6/bundle` folder.

4. Restart DeepaMehta.


Usage
-----

Create a geomap:

1. Choose *New Topicmap...* from the Topicmap menu. The New Topicmap dialog box appears.

2. Type in the topicmap name and choose *Geomap* from the Type menu.

3. Press *Create*. The geomap appears.

Place markers on the geomap:

* Create a Person or Institution topic, and type in its address. Once you press the *Save* button a corresponding marker is placed on the geomap.

* Reveal an existing Person or Institution by performing a search. Once you click a result item a corresponding marker is placed on the geomap.

Get information about a marker:

* Just click the marker. You see the underlying topic's detail information in the right-side panel.

Note: geomaps work also for your self-defined types. Just add the *Address* topic type (as provided by the Contacts plugin) to your type definition.


Version History
---------------

**0.1** -- Nov 27, 2011

* Creating geomaps
* Automatic marker placement for geo-related topics
* Compatible with DeepaMehta 4.0.6


------------
Jörg Richter  
Nov 27, 2011
