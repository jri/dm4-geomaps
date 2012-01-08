/**
 * A topicmap renderer that displays a geo map in the background. The rendering is based on OpenLayers library.
 *
 * OpenLayers specifics are encapsulated. The caller must not know about OpenLayers API usage.
 */
function GeoMapRenderer() {

    // ------------------------------------------------------------------------------------------------ Constructor Code

    js.extend(this, TopicmapRenderer)

    this.dom = $("<div>", {id: "canvas"})

    var olh = new OpenLayersHelper({move_handler: on_move})

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
        var select = topic
        //
        var address = topic.find_child_topic("dm4.contacts.address")
        if (address) {
            var geo_facet = GeoMapRenderer.get_geo_facet(address)
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
    }

    this.clear = function() {
        olh.clear()
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
        return new Geomap(topicmap_id, olh)
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
        olh.render("canvas")
    }

    this.resize = function(size) {
        if (dm4c.LOG_GUI) dm4c.log("Resizing geomap to " + size.width + "x" + size.height)
        this.dom.width(size.width).height(size.height)
    }

    this.resize_end = function() {
        olh.update_size()
    }

    // ----------------------------------------------------------------------------------------------- Private Functions

    function add_feature(geo_facet) {
        olh.add_feature(geo_facet)
    }

    // === Event Handler ===

    function on_move(center, zoom) {
        GeoMapRenderer.get_geomap().set_state(center, zoom)
    }
}

// ------------------------------------------------------------------------------------------------------ Static Methods

// ### FIXME: revise the Geomap model class and make this local functions

GeoMapRenderer.get_geomap = function() {
    return dm4c.get_plugin("topicmaps_plugin").get_topicmap()
}

/**
 * Returns the geo facet of an address.
 *
 * @param   address     An "Address" topic (a JavaScript object).
 *
 * @return  A "Geo Coordinate" topic extended with "x" and "y" properties (a Topic object).
 */
GeoMapRenderer.get_geo_facet = function(address) {
    var geo_facet = address.get("dm4.geomaps.geo_coordinate")
    if (geo_facet) {
        var pos = GeoMapRenderer.position(geo_facet)
        geo_facet.x = pos.x
        geo_facet.y = pos.y
        return geo_facet
    }
}

GeoMapRenderer.position = function(geo_facet) {
    return {
        x: geo_facet.get("dm4.geomaps.longitude"),
        y: geo_facet.get("dm4.geomaps.latitude")
    }
}
