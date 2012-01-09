/**
 * A topicmap model that is attached to the database.
 *
 * ### FIXME: introduce common base class for Geomap and Topicmap (see deepamehta-topicmaps module)
 * ### FIXME: remove "ol_view" constructor argument. A model must not depend on the view.
 */
function Geomap(topicmap_id, ol_view) {

    var LOG_GEOMAPS = false

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
        ol_view.set_center(center, zoom)
        display_topics()
        restore_selection()

        function display_topics() {
            for (var id in topics) {
                ol_view.add_feature(topics[id])
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
        if (GeoMapRenderer.get_geomap() == this) {
            // ### Compare to GeoMapRenderer add_topic(). Can we call it from here?
            // ### FIXME: or can we call dm4c.show_topic() here?
            if (LOG_GEOMAPS) dm4c.log("Geomap.update_topic(): topic=" + JSON.stringify(topic))
            var address = topic.find_child_topic("dm4.contacts.address")
            if (address) {
                var geo_facet = GeoMapRenderer.get_geo_facet(address)
                if (geo_facet && !topics[geo_facet.id]) {
                    // update model
                    this.add_topic(geo_facet.id, geo_facet.type_uri, "", geo_facet.x, geo_facet.y)
                    // update view
                    ol_view.add_feature(geo_facet, true)    // do_select=true
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
                var pos = GeoMapRenderer.position(new Topic(topic))
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
