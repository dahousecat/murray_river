var map = {
    create: function() {

        map.map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: gps.data[0].lat, lng: gps.data[0].lng},
            zoom: 12,
            //mapTypeId: 'satellite',
            mapTypeId: 'terrain',
        });

    },

    setCentre: function() {

        if(typeof gps.data[gps.index] != 'undefined') {
            this.map.setCenter(new google.maps.LatLng(gps.data[gps.index].track[0], gps.data[gps.index].track[1]));
        }

    }
};
