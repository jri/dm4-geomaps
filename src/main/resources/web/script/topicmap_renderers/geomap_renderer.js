/**
 * A topicmap renderer that displays a geo map in the background. The rendering is based on OpenLayers library.
 *
 * OpenLayers specifics are encapsulated. The caller must not know about OpenLayers API usage.
 */
function GeoMapRenderer() {

    // ------------------------------------------------------------------------------------------------ Constructor Code

    js.extend(this, TopicmapRenderer)

    this.dom = $("<div>", {id: "canvas"})

    var ol_view = new OpenLayersView({move_handler: on_move})

    var LOG_GEOMAPS = false

    // ------------------------------------------------------------------------------------------------------ Public API

    // === TopicmapRenderer Implementation ===

    this.get_info = function() {
        return {
            uri: "dm4.geomaps.geomap_renderer",
            name: "Geomap"
        }
    }

    this.add_topic = function(topic, do_select) {
        var select = undefined
        //
        var address = topic.find_child_topic("dm4.contacts.address")
        if (address) {
            var geo_facet = get_geo_facet(address)
            if (geo_facet) {
                if (LOG_GEOMAPS) dm4c.log("GeoMapRenderer.add_topic(): setting up replacement topic " +
                    "at x=" + geo_facet.x + ", y=" + geo_facet.y + "\n..... Original address topic=" +
                    JSON.stringify(address))
                // update view
                ol_view.add_feature(geo_facet, do_select)
                // setup replacement topic for selection model
                select = geo_facet
            } else {
                if (LOG_GEOMAPS) dm4c.log("GeoMapRenderer.add_topic(): setting up replacement topic " +
                    "ABORTED -- address has no geo facet\n..... Address topic=" + JSON.stringify(address))
            }
        } else {
            if (LOG_GEOMAPS) dm4c.log("GeoMapRenderer.add_topic(): setting up replacement topic " +
                "ABORTED -- topic has no address child\n..... Topic=" + JSON.stringify(topic))
        }
        //
        return {select: select, display: topic}
    }

    this.update_topic = function(topic, refresh_canvas) {
        // Add the topic's geo facet to the geomap if all applies:
        // 1) The topic has an Address
        // 2) The Address has a geo facet
        // 3) The geo facet is not already added to this map 
        // ### Compare to add_topic() above. Can we call it from here?
        // ### FIXME: or can we call dm4c.show_topic() here?
        if (LOG_GEOMAPS) dm4c.log("GeoMapRenderer.update_topic(): topic=" + JSON.stringify(topic))
        var address = topic.find_child_topic("dm4.contacts.address")
        if (address) {
            var geo_facet = get_geo_facet(address)
            if (geo_facet) {
                // update model
                get_geomap().add_topic(geo_facet.id, geo_facet.type_uri, "", geo_facet.x, geo_facet.y)
                // update view
                ol_view.add_feature(geo_facet, true)    // do_select=true
            }
        }
    }

    this.clear = function() {
        ol_view.remove_all_features()
    }

    this.select_topic = function(topic_id) {
        ol_view.select_feature(topic_id)
        return {
            select: dm4c.fetch_topic(topic_id),
            display: new Topic(dm4c.restc.get_geotopic(topic_id))
        }
    }

    // === TopicmapRenderer Topicmaps Extension ===

    this.load_topicmap = function(topicmap_id) {
        return new Geomap(topicmap_id, ol_view)
    }

    this.display_topicmap = function(topicmap, no_history_update) {
        dm4c.canvas.clear()
        ol_view.set_center(topicmap.center, topicmap.zoom)
        display_topics()
        restore_selection()

        function display_topics() {
            topicmap.iterate_topics(function(topic) {
                ol_view.add_feature(topic)
            })
        }

        function restore_selection() {
            var id = topicmap.selected_object_id
            if (id != -1) {
                dm4c.do_select_topic(id, no_history_update)
            } else {
                dm4c.do_reset_selection(no_history_update)
            }
        }
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
        ol_view.render("canvas")
    }

    this.resize = function(size) {
        if (dm4c.LOG_GUI) dm4c.log("Resizing geomap to " + size.width + "x" + size.height)
        this.dom.width(size.width).height(size.height)
    }

    this.resize_end = function() {
        ol_view.update_size()
    }

    // ----------------------------------------------------------------------------------------------- Private Functions

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
            var pos = GeoMapRenderer.position(geo_facet)
            geo_facet.x = pos.x
            geo_facet.y = pos.y
            return geo_facet
        }
    }

    // === Event Handler ===

    function on_move(center, zoom) {
        get_geomap().set_state(center, zoom)
    }
}

// ------------------------------------------------------------------------------------------------------ Static Methods

// ### FIXME: revise the Geomap model class and make this local functions

GeoMapRenderer.position = function(geo_facet) {
    return {
        x: geo_facet.get("dm4.geomaps.longitude"),
        y: geo_facet.get("dm4.geomaps.latitude")
    }
}
