var image = {
    images: [],
    containerWidth: null,
    activeImageIndex: false,
    containerWidthMultiplier: 1.5,
    clusterGrabDist: 400,
    minImageGap: 10,
    callback: null,
    clusters: [],
    duration: 800,
    maxImageHeight: 600,
    iconHeight: 96,

    add: function(){

        async.series([
                function(callback){
                    image.addImages(callback);
                },
                function(callback){
                    image.setImageWidths(callback);
                },
                function(callback){
                    image.calcImageGaps(callback);
                },
                function(callback){
                    image.makeImageClusters(callback);
                },
                function(callback){
                    image.spaceOutClusterImages(callback);
                },
                function(callback){
                    image.calcImagePositions(callback);
                },
                function(callback){
                    image.setImagePositions(callback);
                },
            ],
            function(err, results){
                utils.callback(image.callback);
            });

    },

    addImages: function(callback) {

        this.containerWidth = adventure.docHeight * this.containerWidthMultiplier;

        $('#inner-images').width(this.containerWidth);

        var self = this;

        $.get('/images.php?date=' + adventure.year + '-' + adventure.month + '-' + adventure.day, function(data) {

            for (index = 0; index <= data.length -1; index++) {

                var image = data[index];

                // Seen this was a string sometimes so make sure int
                image.ts = parseInt(image.ts);

                var time_gap = null;
                var this_time_gap = null;
                var last_time_gap = null;

                // Loop gps data to find point with closest time to this image
                for (i = 0; i <= gps.count -1; i++) {
                    this_time_gap = Math.abs((gps.data[i].ts / 1000) - image.ts);

                    if(last_time_gap !== null && this_time_gap > last_time_gap) {
                        image.gps_index = i;
                        break;
                    }

                    if(time_gap === null || this_time_gap < time_gap) {

                        time_gap = this_time_gap;
                        image.gps_index = i;
                    }

                    last_time_gap = this_time_gap;

                }

                image.infowindow = new google.maps.InfoWindow({
                    content: '<img src="' + image.src + '" style="width: 200px;" />'
                });

                image.marker = new google.maps.Marker({
                    position: {lat: gps.data[image.gps_index].lat, lng: gps.data[image.gps_index].lng},
                    map: map.map,
                    title: image.desc
                });

                image.marker.gps_index = image.gps_index;

                image.marker.addListener('click', function() {
                    adventure.scrollTo(this.gps_index);
                });

                // Place image on the image bar
                var perc = (image.gps_index / gps.count) * 100;

                var imgStr = '<div class="image-wrap" id="image-' + index + '">';
                imgStr = imgStr + '<img src="' + image.src + '" attr-id="' + index + '" class="image" />';
                imgStr = imgStr + '<p>' + image.desc + '</p>';
                imgStr = imgStr + '</div>';
                image.$imageWrap = $(imgStr);
                image.$image = image.$imageWrap.find('.image');
                image.$imageWrap.css({height: self.iconHeight});

                $('#inner-images').append(image.$imageWrap);

                image.left = ( (perc / 100) * self.containerWidth ) + ( $(window).width() / 2 );

                // don't let images occupy the exact same spot - compare with prev
                if(typeof images[index - 1] != 'undefined' && images[index - 1].left == image.left) {
                    image.left += 1;
                }

                image.$imageWrap.css({ left: image.left});

                image.$image
                    .attr('alt', image.desc)
                    .click(self.click);

                self.images.push(image);

            };

            callback();

        });

    },

    setImageWidths: function(callback){

        // this function keeps calling itself until images get width

        // Set timeout to give time for images to get width
        setTimeout(function(){

            for (var i = 0; i <= image.images.length -1; i++) {

                var width = image.images[i].$image.width();

                if(width === 0) {
                    // break;
                    return image.setImageWidths(callback);
                } else {
                    image.images[i].width = width;
                    image.images[i].index = i;
                }

            }

            callback();


        }, 1);

    },

    // spaceOutImages: function(){
    //
    //     // first pass - add gaps for each image
    //     this.calcImageGaps();
    //
    //     // if(!any_touching) {
    //     //     return this.setImagePositions();
    //     // }
    //
    //     // second pass - create clusters
    //     this.makeImageClusters();
    //
    //     // space out images in each cluster
    //     this.spaceOutClusterImages();
    //
    //     // space out the clusters themselves
    //     //spaceOutClusters();
    //
    //     // Work out each images position based off new cluster centres
    //     this.calcImagePositions();
    //
    //     // now clusters may have merged into each other so make another pass
    //     // this.spaceOutImages();
    //
    //     this.setImagePositions();
    //
    // },

    calcImageGaps: function(callback) {

        var any_touching = false;
        var images = this.images;

        for (var i = 0; i <= images.length -1; i++) {

            var my_left = images[i].left;
            var my_right = my_left + images[i].width;
            var prev_left = typeof images[i-1] == 'undefined' ? 'undefined' : images[i-1].left;
            var prev_right = typeof images[i-1] == 'undefined' ? 'undefined' : prev_left + images[i-1].width;
            var next_left = typeof images[i+1] == 'undefined' ? 'undefined' : images[i+1].left;
            // var next_right = typeof images[i+1] == 'undefined' ? 'undefined' : prev_left + images[i+1].width;

            if(i == 0) {
                // first one
                images[i].back_gap = my_left;
                images[i].forward_gap = next_left - my_right;
            } else if(i == images.length - 1) {
                // last one
                images[i].back_gap = my_left - prev_right;
                images[i].forward_gap = this.containerWidth - my_right;
            } else {
                images[i].back_gap = my_left - prev_right;
                images[i].forward_gap = next_left - my_right;
            }

            // Also add image centre point
            images[i].centre = images[i].left + (images[i].width / 2)

            if(images[i].back_gap < 0 || images[i].forward_gap < 0) {
                any_touching = true;
            }

           // console.log({
           //     i: i,
           //     my_left: my_left,
           //     my_right: my_right,
           //     my_width: images[i].width,
           //     back_gap: images[i].back_gap,
           //     forward_gap: images[i].forward_gap,
           // });

        }

        //return any_touching;

        callback();

    },

    makeImageClusters: function(callback){

        var images = this.images;
        var clusters = this.clusters;

        for (var i = 0; i <= images.length -1; i++) {

            if(images[i].back_gap - this.clusterGrabDist < 0) {
                // i'm just touching the one behind me
                // add to the last cluster
                clusters[clusters.length - 1].images.push(i);
            }
            else if(images[i].back_gap + this.clusterGrabDist > 0 && images[i].forward_gap - this.clusterGrabDist < 0) {
                // i'm just touching the one in front of me
                // create a new cluster
                clusters.push({
                    images: [i],
                });
            }
            else if(images[i].back_gap - this.clusterGrabDist < 0 && images[i].forward_gap - this.clusterGrabDist < 0) {
                // i'm touching the one in front of me and behind me
                // add to the last cluster
                clusters[clusters.length - 1].images.push(i);
            }
            else {
                // i'm not touching anyone
//                console.log('not touching anyone');
            }

        }

        callback();

    },

    spaceOutClusterImages: function(callback){

        var images = this.images;
        var clusters = this.clusters;

        // calc centre point and width required for each cluster
        for (var i = 0; i <= clusters.length -1; i++) {

            var cluster = clusters[i];

            // Work out total width required - loop this clusters images
            cluster.width = 0;
            cluster.centre = 0;
            for (var x = 0; x <= cluster.images.length -1; x++) {
                var image =  images[cluster.images[x]];
                cluster.width += image.width + this.minImageGap;
                cluster.centre += image.centre;
            }
            cluster.width -= this.minImageGap;

            // Where is the cluster centre?
            cluster.centre = cluster.centre / cluster.images.length;
            cluster.left = cluster.centre - (cluster.width / 2);
            cluster.right = cluster.centre + (cluster.width / 2);

        }

        callback();

    },

    calcImagePositions: function(callback){

        var clusters = this.clusters;

        // calc centre point and width required for each cluster
        for (var i = 0; i <= clusters.length -1; i++) {

            var cluster = clusters[i];

            // set the new image positions
            var current_pos = cluster.left;
            for (var x = 0; x <= cluster.images.length -1; x++) {
                var img =  image.images[cluster.images[x]];

                // if(typeof current_pos == 'undefined') {
                //     console.log('Error: left is undefined for image ' + cluster.images[x]);
                // } else {
                //     console.log('Set left for ' + cluster.images[x] + ': ' + current_pos);
                // }

                img.left = current_pos;
                current_pos += img.width + image.minImageGap;
            }
        }

        callback();

    },

    setImagePositions: function(callback){

        var images = this.images;

        // set position
        for (i = 0; i <= images.length -1; i++) {
            images[i].$imageWrap.css({ left: images[i].left });
        }

        callback();

    },

    click: function(){

        if(adventure.animating) {
            // console.log('reject click');
            return false;
        }

        adventure.animating = true;
        // console.log('animating true');

        var img = image.images[$(this).attr('attr-id')];

        if(img.$imageWrap.hasClass('active-image')) {

            async.series([
                    function(callback){
                        image.shrink(img, callback);
                    },
                ],
                function(err, results){
                    adventure.animating = false;
                    image.activeImageIndex = false;
                    // console.log('set image.activeImageIndex: ' + image.activeImageIndex);
                    // console.log('animating false');
                });

        } else {

            // close any other open images first
            if($('.active-image').length) {
                image.shrinkActive();
            }

            // Work out distances required to animate the image growing to the correct screen position
            image.initialPosLeft = ( ($(window).scrollTop() + adventure.windowHeight * adventure.scrollPerc) * image.containerWidthMultiplier ) * -1;

            var dist = adventure.scrollTo(img.gps_index);
            var newPosLeft = ( ($(window).scrollTop() + dist + adventure.windowHeight * adventure.scrollPerc) * image.containerWidthMultiplier ) * -1;
            image.scrollDist = newPosLeft - image.initialPosLeft;

            image.activeImageIndex = parseInt($(this).attr('attr-id'));
            // console.log('set image.activeImageIndex: ' + image.activeImageIndex);

            async.series([
                    function(callback){
                        image.grow(img, callback);
                    },
                ],
                function(err, results){
                    adventure.animating = false;
                    // console.log('animating false');
                });

        }

    },

    grow: function(img, callback){

        // img.$imageWrap.addClass('active-image');
        // utils.callback(callback);
        // return;

        img.savedWidth = img.$imageWrap.width();
        img.savedHeight = img.$imageWrap.height();
        img.savedLeft = img.$imageWrap.css('left');

        var height = $(window).height() - 40;
        if(img.$image[0].naturalHeight < height) {
            height = img.$image[0].naturalHeight;
        }

        if(this.maxImageHeight < height) {
            height = this.maxImageHeight;
        }

        var aspRatio = img.$image[0].naturalWidth / img.$image[0].naturalHeight;

        // Sometimes the white border box is not quite wide enough if we don't add 10
        var new_width = (height * aspRatio) + 10;

        var border = ($(window).height() - height) / 2;

        var top = border - $('#images').position().top;

        img.$imageWrap.addClass('active-image');

        var left = Math.abs( image.initialPosLeft + image.scrollDist ) + ($(window).width() / 2) - (new_width / 2);

        img.$imageWrap.animate({
            top:  top,
            left:  left,
            width:  new_width,
            height:  height,
            padding:  '20px',
        }, {
            duration: image.duration,
            complete: function() {
                image.activeImageIndex = img.index;
                // console.log('set image.activeImageIndex: ' + image.activeImageIndex);
                utils.callback(callback);

            },
            step: function() {
                //addMarkerShadows();
            }
        });

    },

    shrink: function(img, callback){

        // img.$imageWrap.removeClass('active-image');
        // utils.callback(callback);
        // return;

        img.$imageWrap.animate({
            top:  0,
            left:  img.savedLeft,
            width:  img.savedWidth,
            height:  img.savedHeight,
            padding:  0,
        }, {
            duration: image.duration,
            complete: function() {
                $(this).removeClass('active-image');
                image.activeImageIndex = false;
                // console.log('set image.activeImageIndex: ' + image.activeImageIndex);
                utils.callback(callback);
            },
            step: function() {
                //addMarkerShadows();
            }
        });
    },

    shrinkActive: function(callback){

        var activeImageId = $('.active-image').find('img').attr('attr-id');
        if(activeImageId) {
            this.shrink(this.images[activeImageId], callback);
        }

    },

    setScrollPosition: function(){

        $('#inner-images').css({
            left: ( ($(window).scrollTop() + adventure.windowHeight * adventure.scrollPerc) * this.containerWidthMultiplier ) * -1,
        });

    },

    setImageSizes: function() {

        var screenCentre = $(window).width() / 2;

        for (var i = 0; i <= image.images.length -1; i++) {

            var img = image.images[i];
            var startScale = img.scale;

            // var distance = Math.abs(img.index - gps.index);
            //
            // if(distance < 100) {
            //     img.scale = 100 - distance;
            // } else {
            //     img.scale = 1;
            // }

            var imgCentre = img.$image.offset().left + (img.width / 2)

            if(imgCentre < screenCentre) {
                var imgDistFromCentre = screenCentre - imgCentre;
            } else {
                var imgDistFromCentre = imgCentre - screenCentre;
            }

            var scaleDistLimit = 200;

            if(imgDistFromCentre < scaleDistLimit) {
                img.scale = (scaleDistLimit - imgDistFromCentre) / (scaleDistLimit / 1.2);
                var zindex = 2;
            } else {
                img.scale = 1;
                var zindex = 1;
            }

            if(img.scale < 1) {
                img.scale = 1;
            }

            var growth = (img.width * img.scale) - img.width;

            if(startScale != img.scale) {
                img.$imageWrap.css({
                    height: image.iconHeight * img.scale,
                    marginRight: growth / 2,
                    zIndex: zindex,
                });
            }
        }

    },

    findNext: function(minDist) {

        minDist = typeof minDist == 'undefined' ? 1 : minDist;

        // If we know current then just return the next image
        if(this.activeImageIndex !== false) {
            return typeof image.images[this.activeImageIndex + 1] == 'undefined' ? false : image.images[this.activeImageIndex + 1];
        }

        // If current is unknown work out based on the current gps index
        for (i = 0; i <= image.images.length -1; i++) {
            if(image.images[i].gps_index > gps.index + minDist) {
                return image.images[i];
            }
        }

    },

    findPrev: function(minDist){

        minDist = typeof minDist == 'undefined' ? 1 : minDist;

        // If we know current then just return the prev image
        if(this.activeImageIndex) {
            return typeof image.images[this.activeImageIndex - 1] == 'undefined' ? false : image.images[this.activeImageIndex - 1];
        }

        for (var i = image.images.length -1; i >= 0; i--) {
            if(image.images[i].gps_index < gps.index - minDist) {
                return image.images[i];
            }
        }

    }

};
