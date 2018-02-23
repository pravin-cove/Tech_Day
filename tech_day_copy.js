var async = require('async');
var noble = require('noble');
let huejay = require('huejay');

var express = require('express');
// var bodyParser = require('body-parser');
var app = express();
var port = process.env.PORT || 8080;
var http = require('http').Server(app);
var io = require('socket.io')(http);

var bridgeIp = '';
var hueClient;
// var router = express.Router();

// app.use(bodyParser.urlencoded({
//   extended: true
// }));

 var Gpio = require('onoff').Gpio,
	tv = new Gpio(17,'out'),
	ac = new Gpio(27, 'out'),
	light = new Gpio(22, 'out');
var isFirstNotificationAfterConnect = false;

var peripheralIdOrAddress = 'Clove_1_90060SL01';

huejay.discover()
  .then(bridges => {
    for (let bridge of bridges) {
      console.log(`Bridge found -> Id: ${bridge.id}, IP: ${bridge.ip}`);
      bridgeIp = bridge.ip;
    }
    hueClient = new huejay.Client({
        host:     bridgeIp,
        username: '5OnfNdyaHCAWjp6fv9LY5Fn6Hi2MoDk8o0gZHyYu',
        timeout:  15000,            
      });
      hueClient.bridge.ping()
        .then(() => {
            console.log('Successful connection');
            client.bridge.isAuthenticated()
                .then(() => {
                    console.log('Successful authentication');
                })
                .catch(error => {
                    console.log('Could not authenticate');
                });
        })
        .catch(error => {
            console.log('Could not connect');
        });
    })
  .catch(error => {
    console.log(`An error occurred: ${error.message}`);
  });

console.log('  peripheralIdOrAddress        = ' + peripheralIdOrAddress);

// router.get('/', function(req, res) {
//   res.json({ 
//     status: 'OK',
//     message: 'APIs are up and running.' 
//   });
// });

// router.get('/currentState', (req, res) => {
  
//   var tvLed = tv.readSync();
//   var lightLed = light.readSync();
//   var acLed = ac.readSync();

//   res.json({ 
//     status: 'OK',
//     tv: !!tvLed,
//     light: !!lightLed,
//     ac: !!acLed
//   });
// });

// router.post('/toggleState', (req, res) => {

//   if (!req.body.toggleField) return res.sendStatus(400);

//   console.log('Incoming request : ' + req.body.field);

//   var tvLed = tv.readSync();
//   var lightLed = light.readSync();
//   var acLed = ac.readSync();

//   if(req.body.toggleField === 'light') {
//     console.log('Toggling Light from API');
//     light.writeSync(lightLed^1)
//     lightLed = lightLed^1;
//   } else if (req.body.toggleField === 'tv'){
//     console.log('Toggling TV from API');
//     tv.writeSync(tvLed^1)
//     tvLed = tvLed^1;
//   } else if(req.body.toggleField === 'ac') {
//     console.log('Toggling AC from API');
//     ac.writeSync(acLed^1)
//     acLed = acLed^1;
//   } else {
//     return res.sendStatus(400);
//   }

//   res.json({ 
//     status: 'OK',
//     tv: !!tvLed,
//     light: !!lightLed,
//     ac: !!acLed
//   });
// });

// app.use('/api', router);
// app.listen(port);

/*
 * Start of socket code
 */
io.on('connection', function(socket){
  console.log('a device connected');
  toggleState('');
  socket.on('disconnect', function(){
      console.log('a device disconnected');
    });
    socket.on('message', function(msg){
      toggleState(msg);
    });
});

function toggleState(request) {
  console.log('inside ToggleState');
  var tvLed = tv.readSync();
  var lightLed = light.readSync();
  var acLed = ac.readSync();
  if(request == 'light'){
    // light.writeSync(lightLed^1)
    if(!!lightLed) {
        client.lights.getById(2)
        .then(light => {
            light.brightness = 254;
            light.hue        = 32554;
            light.saturation = 254;
            return client.lights.save(light);
        })
        .then(light => {
            console.log(`Updated light [${light.id}]`);
         })
        .catch(error => {
            console.log('Something went wrong');
            console.log(error.stack);
        });
    } else {
        client.lights.getById(2)
        .then(light => {
            light.brightness = 125;
            light.hue        = 15554;
            light.saturation = 125;
            return client.lights.save(light);
        })
        .then(light => {
            console.log(`Updated light [${light.id}]`);
         })
        .catch(error => {
            console.log('Something went wrong');
            console.log(error.stack);
        });
    }
    lightLed = lightLed^1;
  } else if(request == 'tv'){
    //   tv.writeSync(tvLed^1)
    if(!!tvLed) {
        client.lights.getById(1)
        .then(light => {
            light.brightness = 254;
            light.hue        = 32554;
            light.saturation = 254;
            return client.lights.save(light);
        })
        .then(light => {
            console.log(`Updated light [${light.id}]`);
         })
        .catch(error => {
            console.log('Something went wrong');
            console.log(error.stack);
        });
    } else {
        client.lights.getById(1)
        .then(light => {
            light.brightness = 125;
            light.hue        = 15554;
            light.saturation = 125;
            return client.lights.save(light);
        })
        .then(light => {
            console.log(`Updated light [${light.id}]`);
         })
        .catch(error => {
            console.log('Something went wrong');
            console.log(error.stack);
        });
    }
    tvLed = tvLed^1;
  } else if(request == 'ac'){
    ac.writeSync(acLed^1)
    acLed = acLed^1;
  }
  var result = { 
    status: 'OK',
    tv: !!tvLed,
    light: !!lightLed,
    ac: !!acLed
  }
  io.sockets.emit('message', result);
}

http.listen(port, () => {
  console.log('listening on : ' + port);
});

 /*
 * End of socket code
 */

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', function(peripheral) {
  if (peripheral.advertisement.localName === peripheralIdOrAddress) {
    noble.stopScanning();

    console.log('peripheral with ID ' + peripheral.id + ' found');
    var advertisement = peripheral.advertisement;

    var localName = advertisement.localName;
    var txPowerLevel = advertisement.txPowerLevel;
    var manufacturerData = advertisement.manufacturerData;
    var serviceData = advertisement.serviceData;
    var serviceUuids = advertisement.serviceUuids;

    if (localName) {
      console.log('  Local Name        = ' + localName);
    }

    if (txPowerLevel) {
      console.log('  TX Power Level    = ' + txPowerLevel);
    }

    if (manufacturerData) {
      console.log('  Manufacturer Data = ' + manufacturerData.toString('hex'));
    }

    if (serviceData) {
      console.log('  Service Data      = ' + JSON.stringify(serviceData, null, 2));
    }

    if (serviceUuids) {
      console.log('  Service UUIDs     = ' + serviceUuids);
    }

    console.log();

    explore(peripheral);
  }
});

function explore(peripheral) {
  console.log('services and characteristics:');

  peripheral.on('disconnect', function() {
    process.exit(0);
  });

  peripheral.connect(function(error) {
  isFirstNotificationAfterConnect = true;
    peripheral.discoverServices(['000056ef00001000800000805f9b34fb'], function(error, services) {
      var serviceIndex = 0;

      async.whilst(
        function () {
          return (serviceIndex < services.length);
        },
        function(callback) {
          var service = services[serviceIndex];
          var serviceInfo = service.uuid;

          if (service.name) {
            serviceInfo += ' (' + service.name + ')';
          }
          console.log(serviceInfo);

          service.discoverCharacteristics(['000034e200001000800000805f9b34fb'], function(error, characteristics) {
            var characteristicIndex = 0;
	    var buttonPushNotification = characteristics[0];
            async.whilst(
              function () {
                return (characteristicIndex < characteristics.length);
              },
              function(callback) {
                var characteristic = characteristics[characteristicIndex];
                var characteristicInfo = '  ' + characteristic.uuid;

                if (characteristic.name) {
                  characteristicInfo += ' (' + characteristic.name + ')';
                }

                async.series([
                  function(callback) {
                    characteristic.discoverDescriptors(function(error, descriptors) {
                      async.detect(
                        descriptors,
                        function(descriptor, callback) {
                          if (descriptor.uuid === '2901') {
                            return callback(descriptor);
                          } else {
                            return callback();
                          }
                        },
                        function(userDescriptionDescriptor){
                          if (userDescriptionDescriptor) {
                            userDescriptionDescriptor.readValue(function(error, data) {
                              if (data) {
                                characteristicInfo += ' (' + data.toString() + ')';
                              }
                              callback();
                            });
                          } else {
                            callback();
                          }
                        }
                      );
                    });
                  },
                  function(callback) {
                        characteristicInfo += '\n    properties  ' + characteristic.properties.join(', ');

                    if (characteristic.properties.indexOf('read') !== -1) {
                      characteristic.read(function(error, data) {
                        if (data) {
                          var string = data.toString('ascii');

                          characteristicInfo += '\n    value       ' + data.toString('hex') + ' | \'' + string + '\'';
                        }
                        callback();
                      });
                    } else {
                      callback();
                    }
                  },
                  function() {
                    console.log(characteristicInfo);
                    characteristicIndex++;
                    callback();
                  }
                ]);
		buttonPushNotification.on('data', function(data, isNotification) {
			if(!isFirstNotificationAfterConnect) {
			    console.log('Notification received ' + data);
				if (data == 'S1') {
					console.log('Toggling TV');
					toggleState('tv');
				} else if (data == 'S2') {
					console.log('Toggling Light');
          toggleState('light');
				} else if (data == 'S3') {
					console.log('Toggling AC');
          toggleState('ac');
				}
			} else {
				isFirstNotificationAfterConnect = false;
			}
		});
		buttonPushNotification.subscribe(function(error){
			console.log('Subscribed to button press');
		});
              },
              function(error) {
                serviceIndex++;
                callback();
              }
            );
          });
        },
        function (err) {
          //peripheral.disconnect();
	console.log('Finished');

        }
      );
    });
  });
}