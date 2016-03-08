/**
 * Created by Layric on 3/7/16.
 */
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var MongoClient = require('mongodb').MongoClient;

//create a new collection  ===>  motiondatas   , which is userd to store new motion data.
var motion_data_model=mongoose.model('motiondata',{
    username:String,
    date: {
        type:String,
    },
    time:{
        type:String,
    },
    motionrecord:{
        type:Number,
    }
});

var url = 'mongodb://52.25.49.72:27017/capstone';

// connect the source data (before processed)
MongoClient.connect(url, function(err, db) {
    if(!err) {
        console.log("We are connected");
    }


    function createObject(propName, propValue){
        this[propName] = propValue;
    }

//time========================start=======================
    var currentDate = new Date();
    var previousDate = currentDate - 86400000;
    function convertDate(inputFormat) {
        function pad(s) { return (s < 10) ? '0' + s : s; }
        var d = new Date(inputFormat);
        return [pad(d.getMonth()+1),pad(d.getDate()), d.getFullYear()].join('/');
    }

    var today=convertDate(currentDate);
    var yesterday=convertDate(previousDate);
    //test----------------------------------------
    today='11/19/2015';
    yesterday = "11/18/2015"
    console.log(today);
    console.log(yesterday);
    //test---------------------------------------
//time========================end=======================
    var user_collection = db.collection('user');
    var sensor_collection = db.collection('sensor');

    mongoose.connect(url,function(err){
        //search all the usernames
        user_collection.find({},function(err,users){
            users.forEach(function(ele){
                console.log("username", ele.username);

                // execute the two sleep data for today and yesterday !!!!!!!!!!!! important
                process_nextday_data.call(this,ele.username,today);
                process_thisday_data.call(this,ele.username,yesterday);
                // !!!!!!!!!!!! important

                function process_nextday_data(username,today){
                    var queryObject_today = new createObject("motionrecord",{$exists:true});
                    queryObject_today.username=username;
                    queryObject_today.date=today;
                    sensor_collection.find(queryObject_today).toArray(function(err,docs){
                        console.log("today query",queryObject_today);
                        if(docs.length==0)
                        {
                            console.log("today No data");
                        }
                        else
                        {
                            var today_data = docs.filter(function(element){
                                var hour = element.time.split(':')[0];
                                return hour < '11';   //will collect time before 11:00
                            });
                            console.log("the first data of today",today_data[0]);

                            var hourlist = [new Date(today+" 00:00:00"),new Date(today+" 01:00:00"),new Date(today+" 02:00:00"),new Date(today+" 03:00:00"),new Date(today+" 04:00:00"),
                                new Date(today+" 05:00:00"),new Date(today+" 06:00:00"),new Date(today+" 07:00:00"),new Date(today+" 08:00:00"),new Date(today+" 09:00:00"),new Date(today+" 10:00:00")];
                            //11/19/2015 01:00:00
                            var dataobj  ={
                                username:queryObject_today.username,
                                date:today,
                            }
                            for(var i =0; i<11;i++) {
                                var count = 0;
                                var eachhour_data = today_data.filter(function(element){
                                    var hour = element.time.split(':')[0];
                                    return hour == hourlist[i].toString().split(" ")[4].split(":")[0];
                                });
                                console.log('eachhour_data length '+ hourlist[i].toString().split(" ")[4].split(":")[0], eachhour_data.length);
                                if(eachhour_data.length==0){
                                    dataobj.time=hourlist[i];
                                    dataobj.motionrecord=0;
                                    (new motion_data_model(dataobj)).save();
                                }else{
                                    var eachhour_data_afterprocess = [];
                                    eachhour_data.reduce(function (first, second) {
                                        eachhour_data_afterprocess.push(second.motionrecord - first.motionrecord);
                                        return second;
                                    });
                                    console.log("firstdata of afterprocess", eachhour_data_afterprocess[0]);
                                    var avg_stdDev = standardDeviation(eachhour_data_afterprocess);
                                    console.log("today "+ hourlist[i].toString().split(" ")[4].split(":")[0],avg_stdDev);

                                    eachhour_data_afterprocess.forEach(function(element){
                                        if(element > avg_stdDev[0] + avg_stdDev[1] || element < avg_stdDev[0] - avg_stdDev[1]){
                                            count++
                                        };
                                    });
                                    console.log("today "+ hourlist[i].toString().split(" ")[4].split(":")[0], count)
                                    dataobj.time=hourlist[i];
                                    dataobj.motionrecord=count;

                                    (new motion_data_model(dataobj)).save();
                                }
                            };
                        };
                    });
                }
                function process_thisday_data(username,yesterday){
                    var queryObject_yesterday = new createObject("motionrecord",{$exists:true});
                    queryObject_yesterday.username=username;
                    queryObject_yesterday.date=yesterday;
                    sensor_collection.find(queryObject_yesterday).toArray(function(err,docs){
                        console.log("yesterday query",queryObject_yesterday);
                        if(docs.length==0)
                        {
                            console.log("yesterday No data");
                        }
                        else
                        {
                            var yesterday_data = docs.filter(function(element){
                                var hour = element.time.split(':')[0];

                                return hour > '19';    //will collect time after 20:00
                            });
                            console.log("the first data of yesterday",yesterday_data[0]);

                            var hourlist = [new Date(yesterday+" 20:00:00"),new Date(yesterday+" 21:00:00"),new Date(yesterday+" 22:00:00"),new Date(yesterday+" 23:00:00")];
                            var dataobj  ={
                                username:queryObject_yesterday.username,
                                date:yesterday,
                            }

                            for(var i =0; i<4;i++) {
                                var count = 0;
                                var eachhour_data = yesterday_data.filter(function(element){
                                    var hour = element.time.split(':')[0];
                                    return hour == hourlist[i].toString().split(" ")[4].split(":")[0];
                                });
                                if(eachhour_data.length==0){
                                    dataobj.time=hourlist[i];
                                    dataobj.motionrecord=0;
                                    (new motion_data_model(dataobj)).save();
                                }else{
                                    var eachhour_data_afterprocess = [];
                                    eachhour_data.reduce(function (first, second) {
                                        eachhour_data_afterprocess.push(second.motionrecord - first.motionrecord);
                                        return second;
                                    });
                                    var avg_stdDev = standardDeviation(eachhour_data_afterprocess);
                                    console.log("yesterday "+hourlist[i].toString().split(" ")[4].split(":")[0], avg_stdDev);

                                    eachhour_data_afterprocess.forEach(function(element){
                                        if(element > avg_stdDev[0] + avg_stdDev[1] || element < avg_stdDev[0] - avg_stdDev[1]){
                                            count++
                                        };
                                    });
                                    console.log("yesterday "+ hourlist[i].toString().split(" ")[4].split(":")[0], count)
                                    dataobj.time=hourlist[i];
                                    dataobj.motionrecord=count;
                                    (new motion_data_model(dataobj)).save();
                                }
                            };
                        }
                    });
                }
                // all function end here ----------------------------------
            })
        })
    });
});


function standardDeviation(values){
    var avg = average(values);
    var squareDiffs = values.map(function(value){
        var diff = value - avg;
        var sqrDiff = diff * diff;
        return sqrDiff;
    });

    var avgSquareDiff = average(squareDiffs);

    var stdDev = Math.sqrt(avgSquareDiff);
    return [avg,stdDev];
};

function average(data){
    var sum = data.reduce(function(sum, value){
        return sum + value;
    }, 0);

    var avg = sum / data.length;
    return avg;
}



module.exports = router;




