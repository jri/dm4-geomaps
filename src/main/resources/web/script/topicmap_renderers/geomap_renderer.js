/**
 * A topicmap renderer that displays a geo map in the background. The rendering is based on OpenLayers library.
 *
 * OpenLayers specifics are encapsulated. The caller must not know about OpenLayers API usage.
 */
function GeoMapRenderer() {

    // ------------------------------------------------------------------------------------------------ Constructor Code

    var LOG_GEOMAPS = false

    js.extend(this, TopicmapRenderer)

    this.dom = $("<div>", {id: "canvas"})

    var map                     // OpenLayers.Map object
    var feature_layers = {}     // Key: layer name, value: FeatureLayer object

    var map_projection          // OpenStreetMap projection is EPSG:900913
    var lonlat_projection = new OpenLayers.Projection("EPSG:4326")  // EPSG:4326 is lon/lat projection

    init_open_layers()

    // ------------------------------------------------------------------------------------------------------ Public API

    // === TopicmapRenderer Implementation ===

    this.get_info = function() {
        return {
            uri: "dm4.geomaps.geomap_renderer",
            name: "Geomap"
        }
    }

    this.add_topic = function(topic, do_select) {
        var select = topic
        //
        var address = topic.find_child_topic("dm4.contacts.address")
        if (address) {
            var geo_facet = get_geo_facet(address)
            if (geo_facet) {
                if (LOG_GEOMAPS) dm4c.log("Geomap.add_topic(): setting up replacement topic " +
                    "at x=" + geo_facet.x + ", y=" + geo_facet.y + "\n..... Original address topic=" +
                    JSON.stringify(address))
                // update view
                add_feature(geo_facet)
                // setup replacement topic for selection model
                select = geo_facet
            } else {
                if (LOG_GEOMAPS) dm4c.log("Geomap.add_topic(): setting up replacement topic " +
                    "ABORTED -- address has no geo facet\n..... Address topic=" + JSON.stringify(address))
            }
        } else {
            if (LOG_GEOMAPS) dm4c.log("Geomap.add_topic(): setting up replacement topic " +
                "ABORTED -- topic has no address child\n..... Topic=" + JSON.stringify(topic))
        }
        //
        return {select: select, display: topic}
        /*
        if (topic.x != undefined && topic.y != undefined) {
            if (LOG_GEOMAPS) dm4c.log("GeoMapRenderer.add_topic(): displaying marker at x=" +
                topic.x + ", y=" + topic.y + "\n..... Topic=" + JSON.stringify(topic))
            marker_layers["markers"].add_marker({lon: topic.x, lat: topic.y}, topic)
        } else {
            if (LOG_GEOMAPS) dm4c.log("GeoMapRenderer.add_topic(): displaying marker ABORTED -- " +
                "topic has no coordinates\n..... Topic=" + JSON.stringify(topic))
        } */
    }

    this.clear = function() {
        feature_layers["features"].remove_all_features()
    }

    this.select_topic = function(topic_id) {
        // ### set_highlight_object(topic_id)
        return {
            select: dm4c.fetch_topic(topic_id),
            display: new Topic(dm4c.restc.get_geotopic(topic_id))
        }
    }

    // === TopicmapRenderer Topicmaps Extension ===

    this.load_topicmap = function(topicmap_id) {
        return new Geomap(topicmap_id)
    }

    this.initial_topicmap_state = function() {
        var center = new OpenLayers.LonLat(11, 51)      // default state is "Germany"
        return {
            "dm4.topicmaps.translation": {
                "dm4.topicmaps.translation_x": center.lon,
                "dm4.topicmaps.translation_y": center.lat
            },
            "dm4.topicmaps.zoom_level": 6
        }
    }

    // === Left SplitPanel Component Implementation ===

    this.init = function() {
        map.render("canvas")
    }

    this.resize = function(size) {
        if (dm4c.LOG_GUI) dm4c.log("Resizing geomap to " + size.width + "x" + size.height)
        this.dom.width(size.width).height(size.height)
    }

    this.resize_end = function() {
        map.updateSize()
    }

    // ----------------------------------------------------------------------------------------------- Private Functions

    function init_open_layers() {
        OpenLayers.ImgPath = "/de.deepamehta.geomaps/script/vendor/openlayers/img/"
        //
        map = new OpenLayers.Map({
            controls: []
        })
        map.addLayers([
            new OpenLayers.Layer.OSM("OpenSteetMap")/*,
            new OpenLayers.Layer.Google("Google Maps")*/
        ])
        map.addControl(new OpenLayers.Control.Navigation({'zoomWheelEnabled': false}))
        map.addControl(new OpenLayers.Control.ZoomPanel())
        // map.addControl(new OpenLayers.Control.LayerSwitcher())
        map.events.register("moveend", undefined, on_move)
        map_projection = map.getProjectionObject()
        // map.setCenter(transform_to_map(11, 51), 6)
        //
        // for (var i = 0, ml; ml = marker_layer_info[i]; i++) {
        feature_layers["features"] = new FeatureLayer("features")
        // }

        // === Public API ===

        /*this.geocode = function() {
            var geocoder = new google.maps.Geocoder()
            return function(address, callback) {
                geocoder.geocode({address: address}, callback)
            }
        }()

        this.set_center = function(pos) {
            map.setCenter(transform_to_map(pos.lon, pos.lat))
        }*/
    }

    function get_geomap() {
        return dm4c.get_plugin("topicmaps_plugin").get_topicmap()
    }

    /**
     * Returns the geo facet of an address.
     *
     * @param   address     An "Address" topic (a JavaScript object).
     *
     * @return  A "Geo Coordinate" topic extended with "x" and "y" properties (a Topic object).
     */
    function get_geo_facet(address) {
        var geo_facet = address.get("dm4.geomaps.geo_coordinate")
        if (geo_facet) {
            var pos = position(geo_facet)
            geo_facet.x = pos.x
            geo_facet.y = pos.y
            return geo_facet
        }
    }

    function position(geo_facet) {
        return {
            x: geo_facet.get("dm4.geomaps.longitude"),
            y: geo_facet.get("dm4.geomaps.latitude")
        }
    }

    function add_feature(geo_facet) {
        feature_layers["features"].add_feature({lon: geo_facet.x, lat: geo_facet.y}, geo_facet)
    }

    // ---

    /**
     * Transforms lon/lat coordinates according to this map's projection.
     *
     * @param   lon     (float)
     * @param   lat     (float)
     *
     * @return  an OpenLayers.LonLat object
     */
    function transform_to_map(lon, lat) {
        return new OpenLayers.LonLat(lon, lat).transform(lonlat_projection, map_projection)
    }

    function transform_to_lonlat(lon, lat) {
        return new OpenLayers.LonLat(lon, lat).transform(map_projection, lonlat_projection)
    }

    // === Event Handler ===

    function on_move(event) {
        // alert("on_move():\n\nevent=" + js.inspect(event) + "\n\nevent.object=" + js.inspect(event.object))
        // var center = map.getCenter()
        // alert("on_move():\n\ncenter: long=" + center.lon + ", lat=" + center.lat + "\n\nzoom=" + map.getZoom())
        var center = map.getCenter()
        get_geomap().set_state(transform_to_lonlat(center.lon, center.lat), map.getZoom())
    }

    // ------------------------------------------------------------------------------------------------- Private Classes

    /**
     * Wraps an OpenLayers vector layer and binds features to topics. Provides two methods:
     *     - add_feature(pos, topic)
     *     - remove_feature(topic_id)
     */
    function FeatureLayer(layer_name) {
        var features = {}   // holds the OpenLayers.Feature.Vector objects, keyed by topic ID
        var style = {
            fillColor: "#ff0000",
            fillOpacity: 0.4,
            strokeColor: "#000000",
            strokeOpacity: 1,
            pointRadius: 8
        }
        var vector_layer = new OpenLayers.Layer.Vector(layer_name, {style: style})
        var select = new OpenLayers.Control.SelectFeature(vector_layer, {onSelect: do_select_feature})
        map.addLayer(vector_layer)
        map.addControl(select)
        select.activate()

        // === Public API ===

        this.add_feature = function(pos, topic) {
            // remove feature if already on the map
            if (features[topic.id]) {
                vector_layer.removeFeatures([features[topic.id]])
            }
            // create feature
            var p = transform_to_map(pos.lon, pos.lat)
            var geometry = new OpenLayers.Geometry.Point(p.lon, p.lat)
            var feature = new OpenLayers.Feature.Vector(geometry, {topic_id: topic.id})
            features[topic.id] = feature
            vector_layer.addFeatures([feature])
        }

        this.remove_feature = function(topic_id) {
            vector_layer.removeFeatures([features[topic_id]])
            // ### TODO: delete from features object
        }

        this.remove_all_features = function() {
            vector_layer.removeAllFeatures()
        }

        // ---

        function do_select_feature(feature) {
            dm4c.do_select_topic(feature.attributes.topic_id)
        }

        function iterate_features(visitor_func) {
            for (var topic_id in features) {
                visitor_func(features[topic_id])
            }
        }
    }

    /**
     * A topicmap model that is attached to the database.
     *
     * ### FIXME: introduce common base class for Geomap and Topicmap (see deepamehta-topicmaps module)
     */
    function Geomap(topicmap_id) {

        // Model
        var info                        // The underlying Topicmap topic (a Topic object)
        var topics = {}                 // topics of this topicmap (key: topic ID, value: GeomapTopic object)
        var center                      // map center (an OpenLayers.LonLat object in lon/lat projection)
        var zoom                        // zoom level (integer)
        var selected_object_id = -1     // ID of the selected topic, or -1 for no selection

        load()

        // --- Public API ---

        // === Topicmap Implementation ===

        this.get_id = function() {
            return topicmap_id
        }

        this.get_renderer_uri = function() {
            return info.get("dm4.topicmaps.topicmap_renderer_uri")
        }

        this.put_on_canvas = function(no_history_update) {
            dm4c.canvas.clear()
            map.setCenter(transform_to_map(center.lon, center.lat), zoom)
            display_topics()
            restore_selection()

            function display_topics() {
                for (var id in topics) {
                    add_feature(topics[id])
                }
            }

            function restore_selection() {
                if (selected_object_id != -1) {
                    dm4c.do_select_topic(selected_object_id, no_history_update)
                } else {
                    dm4c.do_reset_selection(no_history_update)
                }
            }
        }

        this.add_topic = function(id, type_uri, value, x, y) {
            // Add the topic to this map if all applies:
            // 1) The topic has coordinates
            // 2) The topic is not already added to this map 
            if (x != undefined && y != undefined) {
                if (!topics[id]) {
                    if (LOG_GEOMAPS) dm4c.log("Geomap.add_topic(): adding topic to model of geomap " + topicmap_id +
                        "\n..... id=" + id + ", type_uri=\"" + type_uri + "\", x=" + x + ", y=" + y)
                    // update DB
                    dm4c.restc.add_topic_to_geomap(topicmap_id, id)
                    // update memory
                    topics[id] = new GeomapTopic(id, type_uri, value, x, y)
                }
            } else {
                if (LOG_GEOMAPS) dm4c.log("Geomap.add_topic(): adding topic to model of geomap " + topicmap_id +
                    " ABORTED -- topic has no coordinates\n..... id=" + id + ", type_uri=\"" + type_uri +
                    "\", value=\"" + value + "\"")
            }
        }

        this.add_association = function(id, type_uri, topic_id_1, topic_id_2) {
        }

        this.update_topic = function(topic) {
            // Add the topic's geo facet to this map if all applies:
            // 1) This map is selected
            // 2) The topic has an Address topic as child
            // 3) The Address has a geo facet
            // 4) The geo facet is not already added to this map 
            if (get_geomap() == this) {
                // ### Compare to GeoMapRenderer add_topic(). Can we call it from here?
                // ### FIXME: or can we call dm4c.show_topic() here?
                if (LOG_GEOMAPS) dm4c.log("Geomap.update_topic(): topic=" + JSON.stringify(topic))
                var address = topic.find_child_topic("dm4.contacts.address")
                if (address) {
                    var geo_facet = get_geo_facet(address)
                    if (geo_facet && !topics[geo_facet.id]) {
                        // update model
                        this.add_topic(geo_facet.id, geo_facet.type_uri, "", geo_facet.x, geo_facet.y)
                        // update view
                        add_feature(geo_facet)
                    }
                }
            }
        }

        this.update_association = function(assoc) {
        }

        this.delete_topic = function(id) {
            var topic = topics[id]
            if (topic) {
                if (LOG_GEOMAPS) dm4c.log("..... Deleting topic " + id + " (\"" + topic.label + "\") from geomap " +
                    topicmap_id)
                topic.remove()
            }
        }

        this.delete_association = function(id) {
        }

        this.set_topic_selection = function(topic) {
            selected_object_id = topic.id
        }

        this.set_association_selection = function(assoc) {
        }

        this.reset_selection = function() {
            selected_object_id = -1
        }

        this.prepare_topic_for_display = function(topic) {
        }

        // ===

        /**
         * @param   _center     an OpenLayers.LonLat object in lon/lat projection
         */
        this.set_state = function(_center, _zoom) {
            // update memory
            center = _center
            zoom = _zoom
            // update DB
            dm4c.restc.set_geomap_state(topicmap_id, center, zoom)
        }

        // --- Private Functions ---

        function load() {
            var topicmap = dm4c.restc.get_geomap(topicmap_id)
            info = new Topic(topicmap.info)
            //
            init_topics()
            init_state()

            function init_topics() {
                for (var i = 0, topic; topic = topicmap.topics[i]; i++) {
                    var pos = position(new Topic(topic))
                    topics[topic.id] = new GeomapTopic(topic.id, topic.type_uri, topic.value, pos.x, pos.y)
                }
            }

            function init_state() {
                var state = info.get("dm4.topicmaps.state")
                var trans = state.get("dm4.topicmaps.translation")
                var lon = trans.get("dm4.topicmaps.translation_x")
                var lat = trans.get("dm4.topicmaps.translation_y")
                center = new OpenLayers.LonLat(lon, lat)
                zoom = state.get("dm4.topicmaps.zoom_level")
            }
        }

        // --- Private Classes ---

        function GeomapTopic(id, type_uri, value, x, y) {
            this.id = id
            this.type_uri = type_uri
            this.value = value
            this.x = x
            this.y = y

            this.remove = function() {
                delete topics[id]
                reset_selection()
            }

            // ---

            function reset_selection() {
                if (selected_object_id == id) {
                    selected_object_id = -1
                }
            }
        }
    }
}
