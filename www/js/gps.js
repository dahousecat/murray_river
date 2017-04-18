var gps = {

    baseUrl: '/gps/Track_DAY%20',
    trimDistLimitMeters: 200,
    cameraTrackResolution: 0.1,
    showCameraTrack: false,
    count: 0,
    index: 0,
    distanceMeters: 0,
    totalDistanceMeters: 0,
    totalTimeSeconds: 0,
    callback: null,
    savedCallback: false,
    data: [],
    cameraTrack: [],
    cameraTrackCoords: [],
    numDays: 28,
    currentDayToLoad: 0,
    currentDay: 1,
    dayCounts: {},

    // load: function(){
    //
    //     if(!gps.savedCallback) {
    //         gps.savedCallback = gps.callback;
    //         gps.callback = gps.load;
    //     }
    //
    //     gps.currentDayToLoad = gps.currentDayToLoad + 1;
    //
    //     if(gps.currentDayToLoad <= gps.numDays) {
    //         gps.loadDay(gps.currentDayToLoad);
    //     } else {
    //         console.log('final callback')
    //         utils.callback(gps.savedCallback);
    //     }
    //
    // },

    load: function() {

        $.get(gps.baseUrl + gps.currentDay + '.gpx', function(data) {
            var xml = $.parseXML(data);
            var $xml = $(xml);
            var prevLatLng;

            console.log($xml.find('trkpt'), 'gps data');

            $xml.find('trkpt').each(function(index) {

                var ts = Date.parse($(this).find('time').text());
                var date = new Date(ts);
                var day = ('0' + date.getDate()).substr(-2, 2);
                var month = ('0' + (date.getMonth() + 1)).substr(-2, 2);
                var year = date.getFullYear();
                var hour = ('0' + (date.getHours() + 1)).substr(-2, 2);
                var min = ('0' + (date.getMinutes() + 1)).substr(-2, 2);

                adventure.day = day;
                adventure.month = month;
                adventure.year = year;
                var dateStr = day + '-' + month + '-' + year;

                if(typeof gps.dayCounts[dateStr] == 'undefined') {
                    gps.dayCounts[dateStr] = 1;
                } else {
                    gps.dayCounts[dateStr]++;
                }

                var lat = parseFloat($(this).attr('lat'));
                var lng = parseFloat($(this).attr('lon'));
                var LatLng = new google.maps.LatLng(lat, lng);

                var distance = 0;
                if(typeof prevLatLng != 'undefined') {
                    distance = google.maps.geometry.spherical.computeDistanceBetween (prevLatLng, LatLng);
                }

                gps.data.push({
                    ts: ts,
                    date: dateStr,
                    time: hour + ':' + min,
                    lat: lat,
                    lng: lng,
                    LatLng: LatLng,
                    distance: distance,
                });

                prevLatLng = LatLng;

            });

            gps.trimDate();
            gps.trimDistance();
            gps.setTotals();

        });

    },

    trimDate: function() {

        // Find day with most data
        var mostDataPoints = 0;
        var dateToUse;

        $.each(gps.dayCounts, function(date, numDataPoints) {
            if(numDataPoints > mostDataPoints) {
                mostDataPoints = numDataPoints;
                dateToUse = date;
            }
        });

        // Now remove all data with a date that is not correct
        var i = gps.data.length;
        while (i--) {
            if(gps.data[i].date != dateToUse) {
                gps.data.splice(i, 1);
            }
        }

    },

    trimDistance: function(callback) {

        // Trim off start
        for (i = 1; i <= gps.count -1; i++) {
            distance = google.maps.geometry.spherical.computeDistanceBetween (gps.data[0].LatLng, gps.data[i].LatLng);
            if(distance < this.trimDistLimitMeters) {
                gps.data.splice(i, 1);
            } else {
                break;
            }
        }

        // Trim off end
        var end_point = gps.data[gps.data.length - 1].LatLng;
        for (i = gps.data.length - 1; i > 1; i--) {
            distance = google.maps.geometry.spherical.computeDistanceBetween (end_point, gps.data[i].LatLng);

            if(distance < this.trimDistLimitMeters) {

                if(i != gps.data.length) {
                    gps.data.splice(i, 1);
                }

            } else {
                break;
            }
        }

        gps.count = gps.data.length;

        utils.callback(this.callback);

    },

    setTotals: function() {

        if(typeof adventure.days[gps.currentDay] == 'undefined') {
            adventure.days[gps.currentDay] = {};
        }

        gps.totalDistanceMeters = 0;

        // Distance
        for (i = 1; i <= gps.count -1; i++) {
            gps.totalDistanceMeters += gps.data[i].distance;
        }

        // Time
        var startTime = new Date(gps.data[0].ts);
        var endTime = new Date(gps.data[gps.data.length - 1].ts);

        gps.totalTimeSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

        var distKm = gps.totalDistanceMeters / 1000;
        var timeHours = gps.totalTimeSeconds / 60 / 60;

        adventure.days[gps.currentDay].distKm = distKm;
        adventure.days[gps.currentDay].timeHours = timeHours;

        gps.avgSpeed = Math.round((distKm / timeHours) * 10) / 10;

    },

    setCameraTrack: function() {

        var gap = Math.round(gps.count * this.cameraTrackResolution);
        var TrackLatLng, LastTrackLatLng;
        var distLimit = 2000;

        track = this.cameraTrack;

        // Cut down the number of points to use
        for (i = 0; i <= gps.count -1; i+=gap) {

            // make sure not too close to last marker
            TrackLatLng = gps.data[i].LatLng;
            if(typeof LastTrackLatLng != 'undefined') {
                var distance = google.maps.geometry.spherical.computeDistanceBetween(TrackLatLng, LastTrackLatLng);
                if(distance < distLimit) {
                    continue;
                }
            }

            LastTrackLatLng = TrackLatLng;

            track.push( [ gps.data[i].lat, gps.data[i].lng ] );

        }

        // make sure last track point is last gps point
        track[track.length-1] = [ gps.data[gps.count-1].lat, gps.data[gps.count-1].lng ];


        if(this.showCameraTrack) {
            // add markers for curve control points
            for (i = 0; i <= track.length -1 ; i++) {
                var image = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';

                var marker = new google.maps.Marker({
                    position: {lat: track[i][0], lng: track[i][1]},
                    // position: new google.maps.LatLng(track[i][0], track[i][1]),
                    map: map.map,
                    title: 'Hello World!',
                    icon: image
                });
            }
        }


        // create the smoothed out path
        path = Smooth(track, {
            method: Smooth.METHOD_CUBIC,
        });

        // Set the camera location for every gps point
        var path_points = [];
        for (i = 0; i <= gps.count ; i++) {
            var path_perc = i / gps.count;
            var path_res = path(track.length * path_perc);
            path_points.push({
                LatLngArr: path_res,
                LatLng: new google.maps.LatLng(path_res[0], path_res[1]),
                Lat: path_res[0],
                Lng: path_res[1]
            });
        }

        //console.log(path_points);
        var lastLowestDistIndex;

        // Assign each gps point a camera track location
        for (i = 0; i <= gps.count -1; i++) {

            // assign point on curve closest to this marker
            var lowestDist = null;
            var lowestDistIndex = null;

            for (x = (typeof lastLowestDistIndex == 'undefined' ? 0 : lastLowestDistIndex); x <= path_points.length -1; x++) {
                var distance = google.maps.geometry.spherical.computeDistanceBetween(gps.data[i].LatLng, path_points[x].LatLng);

                if(lowestDist == null) {
                    lowestDist = distance;
                    lowestDistIndex = x;
                }
                else if(distance < lowestDist) {
                    lowestDist = distance;
                    lowestDistIndex = x;
                }
            }

            // Never go back - always forwards
            if(typeof lastLowestDistIndex != 'undefined' && lowestDistIndex < lastLowestDistIndex) {
                lowestDistIndex = lastLowestDistIndex;
            }

            lastLowestDistIndex = lowestDistIndex;

            gps.data[i].track = path_points[lowestDistIndex].LatLngArr;

            this.cameraTrackCoords.push({lat: path_points[lowestDistIndex].Lat, lng: path_points[lowestDistIndex].Lng});
        }

        if(this.showCameraTrack) {
            this.drawCameraTrack();
        }

    },

    drawCameraTrack: function(){

        var cameraLine = new google.maps.Polyline({
            path: this.cameraTrackCoords,
            geodesic: true,
            strokeColor: '#0000FF',
            strokeOpacity: 1.0,
            strokeWeight: 1
        });

        cameraLine.setMap(map.map);

    },

    showHideLines: function(){

        this.distanceMeters = 0;

        for (i = 1; i <= this.count -1; i++) {
            if(i <= this.index) {
                this.showLine(i);
            } else {
                this.hideLine(i);
            }
        }

    },

    showLine: function(i){

        if(typeof this.data[i].line == 'undefined') {

            this.data[i].line = new google.maps.Polyline({
                path: [ this.data[i-1].LatLng, this.data[i].LatLng ],
                strokeColor: "#FF0000",
                strokeOpacity: 1.0,
                strokeWeight: 2,
                map: map.map
            });
            this.data[i].visible = true;

        }

        if(!this.data[i].visible) {
            this.data[i].line.setMap(map.map);
            this.data[i].visible = true;
        }

        this.distanceMeters += this.data[i].distance;

    },

    hideLine: function(i){

        if(typeof this.data[i].visible != 'undefined' && this.data[i].visible) {
            this.data[i].line.setMap(null);
            this.data[i].visible = false;
        }

    },

    drawDayLine: function() {

        // if(typeof adventure.days[gps.currentDay] == 'undefined') {
        //     adventure.days[gps.currentDay] = {};
        // }

        if(typeof adventure.days[gps.currentDay].line == 'undefined') {

            var dayPath = [];

            for (i = 0; i <= gps.count -1; i++) {
                dayPath.push({lat: gps.data[i].lat, lng: gps.data[i].lng});
            }

            if(typeof adventure.days[gps.currentDay] == 'undefined') {
                adventure.days[gps.currentDay] = {};
            }

            adventure.days[gps.currentDay].line = new google.maps.Polyline({
                path: dayPath,
                geodesic: true,
                strokeColor: '#FF00FF',
                strokeOpacity: 1.0,
                strokeWeight: 1
            });

        }

        adventure.days[gps.currentDay].line.setMap(map.map);

    },

    hideDayLine: function(){

        if(typeof adventure.days[gps.currentDay].line != 'undefined') {
            adventure.days[gps.currentDay].line.setMap(null);
        }

    },

    getTime: function(index){

        index = typeof index == 'undefined' ? gps.index : index;

        // If the current index is undefined return the time of the previous index
        if(typeof gps.data[index] == 'undefined') {
            index--;
            return gps.getTime(index);
        } else {
            return gps.data[index].time;
        }

    },

    formattedDistance: function(){

        var formattedDistance;
        if(gps.distanceMeters > 1000) {
            formattedDistance = Math.round(gps.distanceMeters / 1000) + 'km';
        } else {
            formattedDistance = Math.round(gps.distanceMeters) + 'm';
        }
        return formattedDistance;

    },

    formattedTotalDistance: function(){

        var totalKms = 0

        for (i = 1; i <= adventure.days.length -1; i++) {
            if(typeof adventure.days[i].distKm != 'undefined' && i < gps.currentDay) {
                console.log(adventure.days[i].distKm);
                totalKms += adventure.days[i].distKm;
            }
        }

        totalKms += (gps.distanceMeters / 1000);
        totalKms = Math.round(totalKms);

        return totalKms + 'km';

    },
};
