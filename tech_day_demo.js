var async = require('async');
var noble = require('noble');

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var port = process.env.PORT || 3000;
var router = express.Router();

app.use(bodyParser.urlencoded({
  extended: true
}));

 var Gpio = require('onoff').Gpio,
	tv = new Gpio(17,'out'),
	ac = new Gpio(27, 'out'),
	light = new Gpio(22, 'out');
var isFirstNotificationAfterConnect = false;

var peripheralIdOrAddress = 'Clove_1_90060SL01';

console.log('  peripheralIdOrAddress        = ' + peripheralIdOrAddress);

router.get('/', function(req, res) {
  res.json({ 
    status: 'OK',
    message: 'APIs are up and running.' 
  });
});

router.get('/currentState', (req, res) => {
  
  var tvLed = tv.readSync();
  var lightLed = light.readSync();
  var acLed = ac.readSync();

  res.json({ 
    status: 'OK',
    tv: !!tvLed,
    light: !!lightLed,
    ac: !!acLed
  });
});

router.post('/toggleState', (req, res) => {

  if (!req.body.field || !req.body.value) return res.sendStatus(400);

  console.log('Incoming request : ' + req.body.field);

  if(req.body.field === 'light') {
    lightLed.writeSync(+req.body.value)
  } else if (req.body.field === 'tv'){
    tvLed.writeSync(+req.body.value)
  } else if(req.body.field === 'ac') {
    acLed.writeSync(+req.body.value)
  } else {
    return res.sendStatus(400);
  }
  
  var tvLed = tv.readSync();
  var lightLed = light.readSync();
  var acLed = ac.readSync();

  res.json({ 
    status: 'OK',
    tv: !!tvLed,
    light: !!lightLed,
    ac: !!acLed
  });
});

app.use('/api', router);
app.listen(port);

console.log('Listening on ' + port);

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
					tv.read(function(err, value){
						if (err) {
							console.log('Error reading TV led value');
							peripheral.disconnect();
						}
						tv.write(value ^ 1, function(err) {
							if (err) {
								console.log('Error writing TV led value');
								peripheral.disconnect();
							}
						});
					});
				} else if (data == 'S2') {
					console.log('Toggling Light');
						light.read(function(err, value){
						if (err) {
							console.log('Error reading Light led value');
							peripheral.disconnect();
						}
						light.write(value ^ 1, function(err) {
							if (err) {
								console.log('Error writing Light led value');
								peripheral.disconnect();
							}
						});
					});
				} else if (data == 'S3') {
					console.log('Toggling AC');
						ac.read(function(err, value){
						if (err) {
							console.log('Error reading AC led value');
							peripheral.disconnect();
						}
						ac.write(value ^ 1, function(err) {
							if (err) {
								console.log('Error writing AC led value');
								peripheral.disconnect();
							}
						});
					});
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