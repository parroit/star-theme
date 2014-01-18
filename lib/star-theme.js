/*
 * star-theme
 * https://github.com/parroit/star-theme
 *
 * Copyright (c) 2014 Andrea Parodi
 * Licensed under the MIT license.
 */

"use strict";

var requesty = require("requesty"),
    concat = require("concat-stream"),
    moment = require("moment"),
    through = require("through"),
    totalStarred = 0;



function getPackage(repoName) {
    var stream = through();
    //console.log("https://raw2.github.com/" + repoName + "/master/package.json")
    requesty(
        "https://raw2.github.com/" + repoName + "/master/package.json"
    )
        .then(function(res) {
            //console.log(res.data)
            stream.queue(res.data);
            stream.queue(null);

        }).then(null, function(err) {

            stream.emit("error", err);
            stream.queue(null);
        });

    return stream;
}

function getStars(page, stream) {
    if (!stream) {
        stream = through();
    }

    requesty(
        "https://api.github.com/users/parroit/starred?per_page=100&page=" + page,
        "GET", {
            "User-Agent": "requesty"
        }
    )
        .then(function(res) {
            try {
                res.data.forEach(function(repo) {
                    totalStarred++;
                    stream.queue({
                        name: repo.full_name // jshint ignore:line
                        //,date: moment(repo.created_at).fromNow() // jshint ignore:line  
                    });
                });

                if (/rel="next"/.test(res.headers.link)) {
                    stream.queue(null); //getStars(page + 1, stream);
                } else {
                    stream.queue(null);

                }

            } catch (err) {
                stream.emit("error", err);
            }



        }).then(null, function(err) {

            stream.emit("error", err);

        });

    return stream;
}



var s = getStars(1);


s.on("data", function(repo) {
    var stream = getPackage(repo.name);

    stream.on("error", function(err) {
        if (err.statusCode !== 404) {
            console.log("%s\n%s", err.message, err.stack);
        }

    });


    stream.pipe(concat(function(data) {
        var o = JSON.parse(data);
        //console.log(o.name);

        var exec = require('child_process').exec;

        exec("npm star " + o.name,
            function(error, stdout, stderr) {

                if (error !== null) {
                    return;
                }

                console.log(o.name + " -" + stdout.replace(/[\r\n]/g, ""));

            });
    }));
});


s.on("error", function(err) {
    console.log("%s\n%s", err.message, err.stack);
});

s.on("end", function() {
    console.log("You starred %d repos.", totalStarred);


});

/*
requesty("https://raw2.github.com/substack/dotc/master/package.json")
    .then(function(res) {
        console.log(res.data);
    })
    */